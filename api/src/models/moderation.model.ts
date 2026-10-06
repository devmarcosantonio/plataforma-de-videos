import { z } from 'zod';
import { prisma } from '../config/database.js';
import type { ModerationLog, Prisma, UploadRequest, User, UserRole } from '../generated/prisma/client.js';
import type { CursorPosition } from '../utils/cursor.js';
import { NotificationModel } from './notification.model.js';

export type { ModerationLog, UploadRequest };

const message = z
  .string({ error: 'REQUEST_MESSAGE_REQUIRED' })
  .trim()
  .min(1, 'REQUEST_MESSAGE_REQUIRED')
  .max(1000, 'REQUEST_MESSAGE_TOO_LONG');

export const createUploadRequestSchema = z.object({
  message,
  portfolio_url: z
    .string()
    .trim()
    .max(500, 'PORTFOLIO_URL_INVALID')
    .optional()
    .transform((value) => value || undefined)
    .pipe(z.url({ protocol: /^https?$/, error: 'PORTFOLIO_URL_INVALID' }).optional()),
});

const reviewNote = z.string().trim().max(500, 'REVIEW_NOTE_TOO_LONG');

export const approveSchema = z.object({ note: reviewNote.optional().transform((value) => value || undefined) });
export const rejectSchema = z.object({ note: reviewNote.min(1, 'REVIEW_NOTE_REQUIRED') });
export const changeRoleSchema = z.object({
  role: z.enum(['user', 'moderator', 'admin'], { error: 'ROLE_INVALID' }),
});

export const requestListSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).default('pending'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const userListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['user', 'moderator', 'admin']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const logListSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

const publicUser = { select: { id: true, username: true, display_name: true, role: true } } as const;

const requestInclude = {
  user: { select: { id: true, username: true, display_name: true, created_at: true } },
  reviewer: { select: { id: true, username: true, display_name: true } },
} satisfies Prisma.UploadRequestInclude;

export type UploadRequestWithUsers = Prisma.UploadRequestGetPayload<{ include: typeof requestInclude }>;

interface LogEntry {
  actor_id: string | null;
  action: string;
  target_user_id?: string;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
}

// Paginação por (created_at, id), do mais recente ao mais antigo (ou do mais antigo, na fila de pendentes).
function cursorWhere(cursor: CursorPosition | undefined, direction: 'lt' | 'gt') {
  if (!cursor) return {};
  const createdAt = new Date(cursor.created_at);
  return { OR: [{ created_at: { [direction]: createdAt } }, { created_at: createdAt, id: { [direction]: cursor.id } }] };
}

export const ModerationModel = {
  // ---------- Solicitações ----------

  // Aprovado para publicar = existe um pedido aprovado (pedido analisado ou liberação direta).
  async hasApprovedRequest(userId: string): Promise<boolean> {
    return (await prisma.uploadRequest.count({ where: { user_id: userId, status: 'approved' }, take: 1 })) > 0;
  },

  async latestRequest(userId: string): Promise<UploadRequest | null> {
    return prisma.uploadRequest.findFirst({ where: { user_id: userId }, orderBy: { created_at: 'desc' } });
  },

  async findRequest(id: string): Promise<UploadRequestWithUsers | null> {
    return prisma.uploadRequest.findUnique({ where: { id }, include: requestInclude });
  },

  // Cria a solicitação e avisa moderadores/admins, numa transação.
  async createRequest(user: User, data: { message: string; portfolio_url?: string }): Promise<UploadRequest> {
    return prisma.$transaction(async (tx) => {
      const request = await tx.uploadRequest.create({ data: { user_id: user.id, ...data } });
      const reviewers = await tx.user.findMany({ where: { role: { in: ['moderator', 'admin'] } }, select: { id: true } });
      await NotificationModel.createMany(
        reviewers.map((reviewer) => ({
          user_id: reviewer.id,
          type: 'upload_request.created',
          data: { request_id: request.id, username: user.username },
        })),
        tx,
      );
      return request;
    });
  },

  async cancelPending(userId: string): Promise<boolean> {
    const { count } = await prisma.uploadRequest.updateMany({
      where: { user_id: userId, status: 'pending' },
      data: { status: 'cancelled' },
    });
    return count > 0;
  },

  // Fila de análise: pendentes da mais antiga para a mais nova; as demais, da mais recente.
  async listRequests(status: UploadRequest['status'], cursor: CursorPosition | undefined, limit: number) {
    const oldestFirst = status === 'pending';
    const order = oldestFirst ? 'asc' : 'desc';
    const rows = await prisma.uploadRequest.findMany({
      where: { status, ...cursorWhere(cursor, oldestFirst ? 'gt' : 'lt') },
      orderBy: [{ created_at: order }, { id: order }],
      take: limit + 1,
      include: requestInclude,
    });
    return { items: rows.slice(0, limit), hasMore: rows.length > limit };
  },

  async listRequestsByUser(userId: string): Promise<UploadRequestWithUsers[]> {
    return prisma.uploadRequest.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: requestInclude,
    });
  },

  async countPending(): Promise<number> {
    return prisma.uploadRequest.count({ where: { status: 'pending' } });
  },

  // Aprova ou recusa: atualiza o pedido, a permissão do usuário, o log e a notificação juntos.
  async reviewRequest(
    reviewer: User,
    request: UploadRequest,
    decision: 'approved' | 'rejected',
    note: string | undefined,
    notificationData: Prisma.InputJsonValue,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // updateMany com status pendente: se outro moderador já decidiu, nada muda (evita decisão dupla).
      const { count } = await tx.uploadRequest.updateMany({
        where: { id: request.id, status: 'pending' },
        data: { status: decision, reviewer_id: reviewer.id, review_note: note ?? null, reviewed_at: new Date() },
      });
      if (count === 0) throw new Error('ALREADY_REVIEWED');

      await this.log({ actor_id: reviewer.id, action: `upload_request.${decision === 'approved' ? 'approve' : 'reject'}`, target_user_id: request.user_id, reason: note, metadata: { request_id: request.id } }, tx);
      await NotificationModel.createMany([{ user_id: request.user_id, type: `upload_request.${decision}`, data: notificationData }], tx);
    });
  },

  // Liberação direta pelo painel: vira um pedido já aprovado, para toda aprovação ficar num lugar só.
  // Um pedido pendente da pessoa, se houver, é o que fica aprovado.
  async grantUploadAccess(actor: User, target: User, note: string | undefined): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const review = { status: 'approved' as const, reviewer_id: actor.id, review_note: note ?? null, reviewed_at: new Date() };
      const { count } = await tx.uploadRequest.updateMany({ where: { user_id: target.id, status: 'pending' }, data: review });
      if (count === 0) {
        await tx.uploadRequest.create({
          data: { user_id: target.id, message: 'Liberado diretamente pela moderação', ...review },
        });
      }
      await this.log({ actor_id: actor.id, action: 'upload_access.grant', target_user_id: target.id, reason: note }, tx);
      await NotificationModel.createMany([{ user_id: target.id, type: 'upload_access.granted' }], tx);
    });
  },

  async changeRole(actor: User | null, target: User, role: UserRole): Promise<User> {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: target.id }, data: { role } });
      await this.log({ actor_id: actor?.id ?? null, action: 'role.change', target_user_id: target.id, metadata: { from: target.role, to: role } }, tx);
      await NotificationModel.createMany([{ user_id: target.id, type: 'role.changed', data: { role } }], tx);
      return updated;
    });
  },

  // ---------- Usuários (painel) ----------

  async listUsers(
    filter: { q?: string; role?: UserRole },
    cursor: CursorPosition | undefined,
    limit: number,
    activeRestrictions: Prisma.UserRestrictionWhereInput,
  ) {
    const where: Prisma.UserWhereInput = {
      ...(filter.role && { role: filter.role }),
      ...(filter.q && {
        OR: [
          { username: { contains: filter.q.toLowerCase().replace(/^@/, '') } },
          { display_name: { contains: filter.q, mode: 'insensitive' } },
          { email: { contains: filter.q.toLowerCase() } },
        ],
      }),
      ...cursorWhere(cursor, 'lt'),
    };
    const rows = await prisma.user.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true, username: true, display_name: true, email: true, role: true, created_at: true,
        _count: { select: { videos: true } },
        // Para calcular os acessos de cada linha sem consultas extras.
        restrictions: { where: activeRestrictions, select: { id: true, type: true, expires_at: true, reason: true } },
        upload_requests: { where: { status: 'approved' }, select: { id: true }, take: 1 },
      },
    });
    return { items: rows.slice(0, limit), hasMore: rows.length > limit };
  },

  // ---------- Log ----------

  async log(entry: LogEntry, db: Prisma.TransactionClient | typeof prisma = prisma): Promise<void> {
    await db.moderationLog.create({ data: { ...entry, metadata: entry.metadata ?? undefined } });
  },

  async listLogs(
    filter: { actorId?: string; targetUserId?: string },
    cursor: CursorPosition | undefined,
    limit: number,
  ) {
    const rows = await prisma.moderationLog.findMany({
      where: {
        ...(filter.actorId && { actor_id: filter.actorId }),
        ...(filter.targetUserId && { target_user_id: filter.targetUserId }),
        ...cursorWhere(cursor, 'lt'),
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { actor: publicUser, target_user: publicUser },
    });
    return { items: rows.slice(0, limit), hasMore: rows.length > limit };
  },
};
