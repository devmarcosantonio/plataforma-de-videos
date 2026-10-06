import { z } from 'zod';
import { prisma } from '../config/database.js';
import type {
  Prisma,
  ReportCase,
  ReportCaseStatus,
  ReportReason,
  ReportTargetType,
  User,
  Video,
} from '../generated/prisma/client.js';
import { CommentModel } from './comment.model.js';
import { ModerationModel } from './moderation.model.js';
import { NotificationModel, type NewNotification } from './notification.model.js';

export type { ReportCase, ReportReason, ReportTargetType };

export const REPORT_REASONS = [
  'spam',
  'harassment',
  'hate',
  'violence',
  'sexual',
  'misleading',
  'copyright',
  'other',
] as const satisfies readonly ReportReason[];

// Gravidade de cada motivo: ordena a fila (o caso fica com a maior entre as denúncias recebidas).
export const SEVERITY: Record<ReportReason, number> = {
  hate: 5,
  violence: 5,
  sexual: 5,
  harassment: 4,
  misleading: 3,
  copyright: 3,
  spam: 2,
  other: 1,
};

export const createReportSchema = z.object({
  target_type: z.enum(['video', 'comment'], { error: 'REPORT_TARGET_INVALID' }),
  target_id: z.uuid('INVALID_ID'),
  reason: z.enum(REPORT_REASONS, { error: 'REPORT_REASON_INVALID' }),
  details: z
    .string()
    .trim()
    .max(500, 'REPORT_DETAILS_TOO_LONG')
    .optional()
    .transform((value) => value || undefined),
});

// Ordem da fila. "priority" = mais graves e mais denunciados primeiro (empate: o mais antigo).
export const CASE_SORTS = ['priority', 'oldest', 'newest', 'most_reported', 'least_reported'] as const;
export type CaseSort = (typeof CASE_SORTS)[number];

export const caseListSchema = z.object({
  status: z.enum(['open', 'actioned', 'dismissed']).default('open'),
  sort: z.enum(CASE_SORTS).default('priority'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const note = z
  .string()
  .trim()
  .max(500, 'REVIEW_NOTE_TOO_LONG')
  .optional()
  .transform((value) => value || undefined);
// Motivo pronto: o dono vê o texto traduzido, mais a observação, se houver.
const reason = z.enum(REPORT_REASONS, { error: 'REPORT_REASON_INVALID' });

// dismiss = sem violação; remove = remove o vídeo/comentário; actioned = medida tomada por fora (ex.: restringiu o autor).
export const resolveCaseSchema = z
  .object({
    decision: z.enum(['dismiss', 'remove', 'actioned'], { error: 'CASE_DECISION_INVALID' }),
    reason: reason.optional(),
    note,
  })
  // Remover exige um motivo pronto (é o que o autor vê).
  .refine((data) => data.decision !== 'remove' || !!data.reason, { path: ['reason'], message: 'REPORT_REASON_INVALID' });

// Colocar o vídeo em revisão (o caso continua aberto até a decisão final).
export const reviewCaseSchema = z.object({ reason: reason.optional(), note });

const person = { select: { id: true, username: true, display_name: true, role: true } } as const;

const caseInclude = {
  target_user: person,
  resolver: person,
} satisfies Prisma.ReportCaseInclude;

export type ReportCaseWithUsers = Prisma.ReportCaseGetPayload<{ include: typeof caseInclude }>;

export interface Target {
  type: ReportTargetType;
  id: string;
  user_id: string;
}

function activate(tx: Prisma.TransactionClient, videoId: string) {
  return tx.video.update({
    where: { id: videoId },
    data: { moderation_status: 'active', moderated_at: null, moderated_by: null, moderation_reason: null, moderation_note: null },
  });
}

export const ReportModel = {
  async countByReporterSince(reporterId: string, since: Date): Promise<number> {
    return prisma.report.count({ where: { reporter_id: reporterId, created_at: { gte: since } } });
  },

  async hasReported(reporterId: string, target: Target): Promise<boolean> {
    const found = await prisma.report.findFirst({
      where: { reporter_id: reporterId, case: { target_type: target.type, target_id: target.id, status: 'open' } },
      select: { id: true },
    });
    return found !== null;
  },

  // Caso aberto do conteúdo, ou um novo. Duas denúncias ao mesmo tempo: o índice único parcial garante um só.
  async openCaseFor(target: Target): Promise<ReportCase> {
    const where = { target_type: target.type, target_id: target.id, status: 'open' as const };
    const existing = await prisma.reportCase.findFirst({ where });
    if (existing) return existing;
    try {
      return await prisma.reportCase.create({
        data: { target_type: target.type, target_id: target.id, target_user_id: target.user_id },
      });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
      return (await prisma.reportCase.findFirst({ where }))!;
    }
  },

  // A denúncia e a contagem do caso juntas. Repetida (mesma pessoa, mesmo caso): o banco recusa (P2002).
  async addReport(reportCase: ReportCase, reporterId: string, reason: ReportReason, details: string | undefined) {
    await prisma.$transaction(async (tx) => {
      await tx.report.create({ data: { case_id: reportCase.id, reporter_id: reporterId, reason, details } });
      const current = await tx.reportCase.findUniqueOrThrow({ where: { id: reportCase.id }, select: { severity: true } });
      await tx.reportCase.update({
        where: { id: reportCase.id },
        data: {
          reports_count: { increment: 1 },
          last_reported_at: new Date(),
          severity: Math.max(current.severity, SEVERITY[reason]),
        },
      });
    });
  },

  async findCase(id: string): Promise<ReportCaseWithUsers | null> {
    return prisma.reportCase.findUnique({ where: { id }, include: caseInclude });
  },

  // Fila: abertos pelos mais graves e mais denunciados (e mais antigos); resolvidos, os mais recentes.
  async listCases(status: ReportCaseStatus, sort: CaseSort, page: number, limit: number) {
    const ORDER: Record<CaseSort, Prisma.ReportCaseOrderByWithRelationInput[]> = {
      priority:
        status === 'open'
          ? [{ severity: 'desc' }, { reports_count: 'desc' }, { created_at: 'asc' }]
          : [{ resolved_at: 'desc' }],
      oldest: [{ created_at: 'asc' }],
      newest: [{ created_at: 'desc' }],
      most_reported: [{ reports_count: 'desc' }, { created_at: 'asc' }],
      least_reported: [{ reports_count: 'asc' }, { created_at: 'asc' }],
    };
    // id no fim: ordem estável entre páginas.
    const orderBy = [...ORDER[sort], { id: 'asc' as const }];
    const rows = await prisma.reportCase.findMany({
      where: { status },
      orderBy,
      skip: (page - 1) * limit,
      take: limit + 1,
      include: caseInclude,
    });
    return { items: rows.slice(0, limit), hasMore: rows.length > limit };
  },

  // Para o painel: quantos abertos e desde quando o mais antigo espera.
  async openSummary(): Promise<{ count: number; oldest: Date | null }> {
    const [count, oldest] = await Promise.all([
      prisma.reportCase.count({ where: { status: 'open' } }),
      prisma.reportCase.findFirst({ where: { status: 'open' }, orderBy: { created_at: 'asc' }, select: { created_at: true } }),
    ]);
    return { count, oldest: oldest?.created_at ?? null };
  },

  // Quantas denúncias de cada motivo por caso ("12× spam · 3× enganoso").
  async reasonCounts(caseIds: string[]) {
    if (caseIds.length === 0) return [];
    return prisma.report.groupBy({
      by: ['case_id', 'reason'],
      where: { case_id: { in: caseIds } },
      _count: { _all: true },
    });
  },

  // Detalhes escritos mais recentes (só os que têm texto).
  async recentDetails(caseIds: string[]) {
    if (caseIds.length === 0) return [];
    return prisma.report.findMany({
      where: { case_id: { in: caseIds }, details: { not: null } },
      orderBy: { created_at: 'desc' },
      take: caseIds.length * 5,
      select: {
        id: true,
        case_id: true,
        reason: true,
        details: true,
        created_at: true,
        reporter: { select: { id: true, username: true, display_name: true } },
      },
    });
  },

  // Prévia do que foi denunciado (inclusive removido/apagado, para a moderação entender o caso).
  async previews(cases: Pick<ReportCase, 'target_type' | 'target_id'>[]) {
    const ids = (type: ReportTargetType) => cases.filter((item) => item.target_type === type).map((item) => item.target_id);
    const [videos, comments] = await Promise.all([
      prisma.video.findMany({
        where: { id: { in: ids('video') } },
        select: {
          id: true,
          title: true,
          thumbnail_url: true,
          status: true,
          visibility: true,
          moderation_status: true,
          moderation_reason: true,
          moderation_note: true,
        },
      }),
      prisma.comment.findMany({
        where: { id: { in: ids('comment') } },
        select: {
          id: true,
          content: true,
          deleted_at: true,
          moderated_at: true,
          video_id: true,
          video: { select: { title: true } },
        },
      }),
    ]);
    return { videos, comments };
  },

  async casesAgainstUser(userId: string) {
    return prisma.reportCase.findMany({
      where: { target_user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: caseInclude,
    });
  },

  // Fecha o caso (só se ainda estiver aberto), com o efeito no vídeo, log e aviso ao autor na mesma transação.
  // O comentário é removido antes, pelo service (a remoção dele tem a própria transação).
  // Quem denunciou não é avisado: denúncias são privadas da moderação.
  async resolve(
    actor: User,
    reportCase: ReportCase,
    status: 'actioned' | 'dismissed',
    decision: { reason?: ReportReason; note?: string },
    effects: {
      removeVideo?: Pick<Video, 'id' | 'title' | 'user_id'>;
      // Dispensado com o vídeo em revisão: ele volta ao ar.
      reinstateVideo?: Pick<Video, 'id' | 'title' | 'user_id'>;
      // Comentário removido pela moderação (soft delete, reversível).
      removeComment?: { id: string; video_id: string; user_id: string | null };
    },
  ): Promise<void> {
    const { reason, note } = decision;
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const { count } = await tx.reportCase.updateMany({
        where: { id: reportCase.id, status: 'open' },
        data: {
          status,
          resolved_by: actor.id,
          resolved_at: now,
          resolution_reason: reason ?? null,
          resolution_note: note ?? null,
        },
      });
      if (count === 0) throw new Error('ALREADY_RESOLVED');

      const notifications: NewNotification[] = [];
      const { removeVideo, reinstateVideo, removeComment } = effects;
      if (removeVideo) {
        await tx.video.update({
          where: { id: removeVideo.id },
          data: {
            moderation_status: 'removed',
            moderated_at: now,
            moderated_by: actor.id,
            moderation_reason: reason ?? null,
            moderation_note: note ?? null,
          },
        });
        await ModerationModel.log(
          {
            actor_id: actor.id,
            action: 'video.remove',
            target_user_id: removeVideo.user_id,
            reason: note,
            metadata: { video_id: removeVideo.id, title: removeVideo.title, reason: reason ?? null },
          },
          tx,
        );
        notifications.push({
          user_id: removeVideo.user_id,
          type: 'video.removed',
          data: { video_id: removeVideo.id, title: removeVideo.title, reason: reason ?? null, note: note ?? null },
        });
      }
      if (reinstateVideo) {
        await activate(tx, reinstateVideo.id);
        notifications.push({
          user_id: reinstateVideo.user_id,
          type: 'video.restored',
          data: { video_id: reinstateVideo.id, title: reinstateVideo.title },
        });
      }
      if (removeComment) {
        await CommentModel.moderate(removeComment.id, actor, { reason, note }, tx);
        if (removeComment.user_id) {
          notifications.push({
            user_id: removeComment.user_id,
            type: 'comment.removed',
            data: { video_id: removeComment.video_id, reason: reason ?? null, note: note ?? null },
          });
        }
      }

      await ModerationModel.log(
        {
          actor_id: actor.id,
          action: status === 'dismissed' ? 'report.dismiss' : 'report.action',
          target_user_id: reportCase.target_user_id ?? undefined,
          reason: note,
          metadata: {
            case_id: reportCase.id,
            target_type: reportCase.target_type,
            target_id: reportCase.target_id,
            reason: reason ?? null,
            // Admin decidindo sobre denúncia contra o próprio conteúdo.
            self_decision: reportCase.target_user_id === actor.id,
          },
        },
        tx,
      );
      await NotificationModel.createMany(notifications, tx);
    });
  },

  // Em revisão: o vídeo some enquanto a moderação investiga; o caso continua aberto.
  async markUnderReview(
    actor: User,
    video: Pick<Video, 'id' | 'title' | 'user_id'>,
    reason: ReportReason | undefined,
    note: string | undefined,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.video.update({
        where: { id: video.id },
        data: {
          moderation_status: 'under_review',
          moderated_at: new Date(),
          moderated_by: actor.id,
          moderation_reason: reason ?? null,
          moderation_note: note ?? null,
        },
      });
      await ModerationModel.log(
        {
          actor_id: actor.id,
          action: 'video.review',
          target_user_id: video.user_id,
          reason: note,
          metadata: { video_id: video.id, title: video.title, reason: reason ?? null },
        },
        tx,
      );
      await NotificationModel.createMany(
        [{ user_id: video.user_id, type: 'video.under_review', data: { video_id: video.id, title: video.title } }],
        tx,
      );
    });
  },

  // Volta ao ar com a visibilidade que o dono tinha escolhido (a moderação nunca a altera).
  async restoreVideo(actor: User, video: Pick<Video, 'id' | 'title' | 'user_id'>): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await activate(tx, video.id);
      await ModerationModel.log(
        {
          actor_id: actor.id,
          action: 'video.restore',
          target_user_id: video.user_id,
          metadata: { video_id: video.id, title: video.title },
        },
        tx,
      );
      await NotificationModel.createMany(
        [{ user_id: video.user_id, type: 'video.restored', data: { video_id: video.id, title: video.title } }],
        tx,
      );
    });
  },
};
