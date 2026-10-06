import { prisma } from '../config/database.js';
import { bunnyClient } from '../integrations/bunny/bunny.client.js';
import { CommentModel } from '../models/comment.model.js';
import { ModerationModel } from '../models/moderation.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { REPORT_REASONS, ReportModel } from '../models/report.model.js';
import { UserModel, type User } from '../models/user.model.js';
import { VideoModel } from '../models/video.model.js';
import { AppError } from '../utils/errors/app-error.js';
import { hasPermission, outranks } from '../utils/permissions.js';
import { z } from 'zod';

// Quem faz o quê com conteúdo de outras pessoas:
// - moderador: remove (soft delete) e restaura;
// - admin: escolhe entre remover (soft) e excluir de vez (delete real), a qualquer momento.
// O próprio autor continua apagando o que é seu de verdade (rotas normais de vídeo/comentário).

const removeSchema = z.object({
  reason: z.enum(REPORT_REASONS, { error: 'REPORT_REASON_INVALID' }).optional(),
  note: z
    .string()
    .trim()
    .max(500, 'REVIEW_NOTE_TOO_LONG')
    .optional()
    .transform((value) => value || undefined),
});

// Excluir vídeo de vez pede o título digitado, para não apagar por engano. Motivo opcional (vai para o autor).
const purgeVideoSchema = removeSchema.extend({ confirm_title: z.string({ error: 'PURGE_CONFIRM_MISMATCH' }) });
const purgeCommentSchema = removeSchema;

// Excluído de vez: as denúncias abertas sobre o conteúdo são fechadas como "com medida".
async function closeOpenCases(actor: User, type: 'video' | 'comment', targetId: string, note: string | undefined) {
  await prisma.reportCase.updateMany({
    where: { target_type: type, target_id: targetId, status: 'open' },
    data: { status: 'actioned', resolved_by: actor.id, resolved_at: new Date(), resolution_note: note ?? 'Excluído permanentemente' },
  });
}

// Mesmo critério das denúncias: só sobre quem está abaixo; conteúdo próprio, só admin.
async function ensureCanActOn(actor: User, ownerId: string | null) {
  if (!ownerId) return;
  if (ownerId === actor.id) {
    if (!hasPermission(actor, 'report:review_own')) throw new AppError('FORBIDDEN', 403);
    return;
  }
  const owner = await UserModel.findById(ownerId);
  if (owner && !outranks(actor, owner)) throw new AppError('CANNOT_ACT_ON_SAME_OR_HIGHER_ROLE', 403);
}

async function findCommentOrFail(id: string) {
  const comment = await CommentModel.findById(id);
  if (!comment || comment.deleted_at) throw new AppError('COMMENT_NOT_FOUND', 404);
  return comment;
}

// ---------- Comentários ----------

// Soft delete: o texto fica guardado; o público vê "removido pela moderação".
export async function moderateComment(actor: User, commentId: string, input: unknown) {
  const data = removeSchema.parse(input);
  const comment = await findCommentOrFail(commentId);
  await ensureCanActOn(actor, comment.user_id);
  if (comment.moderated_at) return { id: comment.id, moderated: true };

  await prisma.$transaction(async (tx) => {
    await CommentModel.moderate(comment.id, actor, data, tx);
    await ModerationModel.log(
      {
        actor_id: actor.id,
        action: 'comment.remove',
        target_user_id: comment.user_id ?? undefined,
        reason: data.note,
        metadata: { comment_id: comment.id, video_id: comment.video_id, reason: data.reason ?? null },
      },
      tx,
    );
    if (comment.user_id) {
      await NotificationModel.createMany(
        [{ user_id: comment.user_id, type: 'comment.removed', data: { video_id: comment.video_id, reason: data.reason ?? null, note: data.note ?? null } }],
        tx,
      );
    }
  });
  return { id: comment.id, moderated: true };
}

export async function restoreComment(actor: User, commentId: string) {
  const comment = await findCommentOrFail(commentId);
  await ensureCanActOn(actor, comment.user_id);
  if (!comment.moderated_at) return { id: comment.id, moderated: false };

  await CommentModel.unmoderate(comment.id);
  await ModerationModel.log({
    actor_id: actor.id,
    action: 'comment.restore',
    target_user_id: comment.user_id ?? undefined,
    metadata: { comment_id: comment.id, video_id: comment.video_id },
  });
  if (comment.user_id) {
    await NotificationModel.createMany([
      { user_id: comment.user_id, type: 'comment.restored', data: { video_id: comment.video_id } },
    ]);
  }
  return { id: comment.id, moderated: false };
}

// Delete real (só admin), direto ou depois de removido. O registro guarda uma cópia do texto.
export async function purgeComment(actor: User, commentId: string, input: unknown = {}) {
  const data = purgeCommentSchema.parse(input);
  const comment = await findCommentOrFail(commentId);
  await ensureCanActOn(actor, comment.user_id);

  await CommentModel.remove(comment);
  await closeOpenCases(actor, 'comment', comment.id, data.note);
  await ModerationModel.log({
    actor_id: actor.id,
    action: 'comment.purge',
    target_user_id: comment.user_id ?? undefined,
    reason: data.note,
    metadata: { comment_id: comment.id, video_id: comment.video_id, content: comment.content, reason: data.reason ?? null },
  });
  // Quem já foi avisado da remoção não recebe outro aviso.
  if (comment.user_id && !comment.moderated_at) {
    await NotificationModel.createMany([
      {
        user_id: comment.user_id,
        type: 'comment.removed',
        data: { video_id: comment.video_id, reason: data.reason ?? null, note: data.note ?? null },
      },
    ]);
  }
}

// ---------- Vídeos ----------

export async function restoreVideo(actor: User, videoId: string) {
  const video = await VideoModel.findById(videoId);
  if (!video) throw new AppError('VIDEO_NOT_FOUND', 404);
  await ensureCanActOn(actor, video.user_id);
  if (video.moderation_status !== 'active') await ReportModel.restoreVideo(actor, video);
  return { id: video.id, moderation_status: 'active' as const };
}

// Delete real (só admin), direto ou depois de removido: apaga do Bunny e do banco. Sem volta.
// O registro guarda o que é preciso para auditoria (título, dono, id no Bunny, motivo).
export async function purgeVideo(actor: User, videoId: string, input: unknown) {
  const { confirm_title, ...data } = purgeVideoSchema.parse(input);
  const video = await VideoModel.findById(videoId);
  if (!video) throw new AppError('VIDEO_NOT_FOUND', 404);
  await ensureCanActOn(actor, video.user_id);
  if (confirm_title.trim() !== video.title.trim()) throw new AppError('PURGE_CONFIRM_MISMATCH');

  // Motivo: o informado agora ou o da remoção anterior.
  const reason = data.reason ?? video.moderation_reason ?? null;
  const note = data.note ?? video.moderation_note ?? undefined;

  await bunnyClient.deleteVideo(video.bunny_video_id);
  await VideoModel.delete(video.id);
  await closeOpenCases(actor, 'video', video.id, note);
  await ModerationModel.log({
    actor_id: actor.id,
    action: 'video.purge',
    target_user_id: video.user_id,
    reason: note,
    metadata: { video_id: video.id, title: video.title, bunny_video_id: video.bunny_video_id, reason },
  });
  // O dono fica sabendo (se já tinha sido avisado da remoção, recebe só a confirmação da exclusão).
  await NotificationModel.createMany([
    { user_id: video.user_id, type: 'video.purged', data: { title: video.title, reason, note: note ?? null } },
  ]);
}
