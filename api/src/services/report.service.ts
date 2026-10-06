import { env } from '../config/env.js';
import { CommentModel } from '../models/comment.model.js';
import {
  caseListSchema,
  createReportSchema,
  ReportModel,
  resolveCaseSchema,
  reviewCaseSchema,
  type ReportCaseWithUsers,
  type Target,
} from '../models/report.model.js';
import { UserModel, type User } from '../models/user.model.js';
import { VideoModel } from '../models/video.model.js';
import { AppError } from '../utils/errors/app-error.js';
import { hasPermission, outranks } from '../utils/permissions.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Só dá para denunciar o que está visível para todos (público, ativo, de conta não banida).
async function findTarget(type: Target['type'], id: string): Promise<Target> {
  if (type === 'video') {
    const video = await VideoModel.findVisibleById(id);
    if (video) return { type, id, user_id: video.user_id };
  } else {
    const comment = await CommentModel.findById(id);
    if (
      comment &&
      !comment.deleted_at &&
      !comment.moderated_at &&
      comment.user_id &&
      (await VideoModel.findVisibleById(comment.video_id))
    ) {
      return { type, id, user_id: comment.user_id };
    }
  }
  throw new AppError('REPORT_TARGET_NOT_FOUND', 404);
}

// ---------- Quem denuncia ----------

// A denúncia é privada: quem denunciou só recebe esta confirmação; o autor nunca sabe que foi denunciado.
export async function createReport(actor: User, input: unknown): Promise<{ reported: true }> {
  const data = createReportSchema.parse(input);
  const target = await findTarget(data.target_type, data.target_id);
  if (target.user_id === actor.id) throw new AppError('CANNOT_REPORT_SELF');
  if (await ReportModel.hasReported(actor.id, target)) throw new AppError('ALREADY_REPORTED', 409);

  const sent = await ReportModel.countByReporterSince(actor.id, new Date(Date.now() - DAY_MS));
  if (sent >= env.REPORTS_PER_DAY) throw new AppError('REPORT_LIMIT', 429);

  const reportCase = await ReportModel.openCaseFor(target);
  try {
    await ReportModel.addReport(reportCase, actor.id, data.reason, data.details);
  } catch (error) {
    // Duas denúncias iguais ao mesmo tempo: a única por pessoa/caso do banco segura a segunda.
    if ((error as { code?: string }).code === 'P2002') throw new AppError('ALREADY_REPORTED', 409);
    throw error;
  }
  return { reported: true };
}

// ---------- Moderação ----------

// Junta aos casos: motivos agrupados, detalhes escritos e a prévia do conteúdo.
async function enrich(cases: ReportCaseWithUsers[]) {
  const ids = cases.map((item) => item.id);
  const [counts, details, previews] = await Promise.all([
    ReportModel.reasonCounts(ids),
    ReportModel.recentDetails(ids),
    ReportModel.previews(cases),
  ]);
  return cases.map((item) => {
    const preview =
      item.target_type === 'video'
        ? previews.videos.find((video) => video.id === item.target_id)
        : previews.comments.find((comment) => comment.id === item.target_id);
    return {
      ...item,
      reasons: counts
        .filter((row) => row.case_id === item.id)
        .map((row) => ({ reason: row.reason, count: row._count._all }))
        .sort((a, b) => b.count - a.count),
      details: details.filter((row) => row.case_id === item.id).slice(0, 5),
      // Nulo: o conteúdo foi apagado depois da denúncia.
      target: preview ?? null,
    };
  });
}

export async function listCases(query: unknown) {
  const { status, sort, page, limit } = caseListSchema.parse(query);
  const result = await ReportModel.listCases(status, sort, page, limit);
  return { items: await enrich(result.items), page, has_more: result.hasMore };
}

// Confere se quem age pode decidir sobre o caso. Dispensar vale para qualquer autor; medidas, só abaixo na hierarquia.
async function findOpenCaseFor(actor: User, caseId: string, acting: boolean): Promise<ReportCaseWithUsers> {
  const reportCase = await ReportModel.findCase(caseId);
  if (!reportCase) throw new AppError('CASE_NOT_FOUND', 404);
  if (reportCase.status !== 'open') throw new AppError('CASE_ALREADY_RESOLVED', 409);
  // Causa própria: só admin decide (e o registro marca). Moderador precisa de outra pessoa.
  const own = reportCase.target_user_id === actor.id;
  if (own && !hasPermission(actor, 'report:review_own')) throw new AppError('FORBIDDEN', 403);
  if (acting && !own && reportCase.target_user && !outranks(actor, reportCase.target_user)) {
    throw new AppError('CANNOT_ACT_ON_SAME_OR_HIGHER_ROLE', 403);
  }
  return reportCase;
}

export async function resolveCase(actor: User, caseId: string, input: unknown) {
  const { decision, reason, note } = resolveCaseSchema.parse(input);
  const reportCase = await findOpenCaseFor(actor, caseId, decision !== 'dismiss');

  const effects: Parameters<typeof ReportModel.resolve>[4] = {};
  if (reportCase.target_type === 'video') {
    // Se o dono já apagou o vídeo, o caso só é fechado.
    const video = await VideoModel.findById(reportCase.target_id);
    if (video && decision === 'remove' && video.moderation_status !== 'removed') effects.removeVideo = video;
    // Estava em revisão e a denúncia não procede: volta ao ar.
    if (video && decision === 'dismiss' && video.moderation_status === 'under_review') effects.reinstateVideo = video;
  }
  if (decision === 'remove' && reportCase.target_type === 'comment') {
    // Se o autor já apagou ou já foi removido, o caso só é fechado.
    const comment = await CommentModel.findById(reportCase.target_id);
    if (comment && !comment.deleted_at && !comment.moderated_at) {
      effects.removeComment = { id: comment.id, video_id: comment.video_id, user_id: comment.user_id };
    }
  }

  try {
    await ReportModel.resolve(actor, reportCase, decision === 'dismiss' ? 'dismissed' : 'actioned', { reason, note }, effects);
  } catch (error) {
    if ((error as Error).message === 'ALREADY_RESOLVED') throw new AppError('CASE_ALREADY_RESOLVED', 409);
    throw error;
  }
  const [resolved] = await enrich([(await ReportModel.findCase(caseId))!]);
  return resolved;
}

// Tira o vídeo do ar enquanto investiga. O caso segue aberto até remover ou dispensar.
export async function reviewCase(actor: User, caseId: string, input: unknown) {
  const { reason, note } = reviewCaseSchema.parse(input);
  const reportCase = await findOpenCaseFor(actor, caseId, true);
  if (reportCase.target_type !== 'video') throw new AppError('CASE_DECISION_INVALID');

  const video = await VideoModel.findById(reportCase.target_id);
  if (!video) throw new AppError('VIDEO_NOT_FOUND', 404);
  if (video.moderation_status !== 'active') throw new AppError('VIDEO_NOT_ACTIVE', 409);
  await ReportModel.markUnderReview(actor, video, reason, note);

  const [updated] = await enrich([reportCase]);
  return updated;
}

export async function casesAgainstUser(userId: string) {
  return enrich(await ReportModel.casesAgainstUser(userId));
}

export async function openSummary() {
  return ReportModel.openSummary();
}
