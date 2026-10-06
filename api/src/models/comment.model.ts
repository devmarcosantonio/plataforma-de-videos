import { z } from 'zod';
import { prisma } from '../config/database.js';
import type { Comment, Prisma, ReportReason, User } from '../generated/prisma/client.js';
import { bannedUser } from './restriction.model.js';
import type { CursorPosition } from '../utils/cursor.js';

export type { Comment };

const content = z
  .string({ error: 'COMMENT_REQUIRED' })
  .trim()
  .min(1, 'COMMENT_EMPTY')
  .max(2000, 'COMMENT_TOO_LONG');

// O autor é sempre o usuário autenticado (não vem no corpo da requisição).
export const createCommentSchema = z.object({
  content,
  parent_id: z.uuid('INVALID_ID').optional(),
});

export const updateCommentSchema = z.object({ content });

export const listCommentsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// Autor e quantidade de respostas vêm na mesma consulta.
const include = {
  user: { select: { id: true, username: true, display_name: true } },
  _count: { select: { replies: true } },
} satisfies Prisma.CommentInclude;

export type CommentWithRelations = Prisma.CommentGetPayload<{ include: typeof include }>;

type Order = 'desc' | 'asc';

// (created_at, id) depois do cursor, na direção da ordenação.
function afterCursor(cursor: CursorPosition | undefined, order: Order): Prisma.CommentWhereInput {
  if (!cursor) return {};
  const createdAt = new Date(cursor.created_at);
  const op = order === 'desc' ? 'lt' : 'gt';
  return {
    OR: [{ created_at: { [op]: createdAt } }, { created_at: createdAt, id: { [op]: cursor.id } }],
  };
}

async function page(where: Prisma.CommentWhereInput, order: Order, cursor: CursorPosition | undefined, limit: number) {
  // Busca um a mais para saber se existe próxima página.
  const rows = await prisma.comment.findMany({
    // Comentários de conta banida ficam ocultos.
    where: { ...where, NOT: { user: bannedUser }, ...afterCursor(cursor, order) },
    orderBy: [{ created_at: order }, { id: order }],
    take: limit + 1,
    include,
  });
  return { items: rows.slice(0, limit), hasMore: rows.length > limit };
}

export const CommentModel = {
  async findById(id: string): Promise<Comment | null> {
    return prisma.comment.findUnique({ where: { id } });
  },

  async create(data: Prisma.CommentUncheckedCreateInput): Promise<CommentWithRelations> {
    return prisma.comment.create({ data, include });
  },

  async update(id: string, data: Prisma.CommentUncheckedUpdateInput): Promise<CommentWithRelations> {
    return prisma.comment.update({ where: { id }, data, include });
  },

  async listTopLevel(videoId: string, cursor: CursorPosition | undefined, limit: number) {
    return page({ video_id: videoId, parent_id: null }, 'desc', cursor, limit);
  },

  async listReplies(parentId: string, cursor: CursorPosition | undefined, limit: number) {
    return page({ parent_id: parentId }, 'asc', cursor, limit);
  },

  // Remoção pela moderação (soft delete): o texto fica guardado, só deixa de aparecer. Reversível.
  async moderate(
    id: string,
    actor: Pick<User, 'id'>,
    data: { reason?: ReportReason; note?: string },
    db: Prisma.TransactionClient | typeof prisma = prisma,
  ): Promise<void> {
    await db.comment.update({
      where: { id },
      data: { moderated_at: new Date(), moderated_by: actor.id, moderation_reason: data.reason ?? null, moderation_note: data.note ?? null },
    });
  },

  async unmoderate(id: string): Promise<void> {
    await prisma.comment.update({
      where: { id },
      data: { moderated_at: null, moderated_by: null, moderation_reason: null, moderation_note: null },
    });
  },

  async findActiveByUser(userId: string): Promise<Comment[]> {
    return prisma.comment.findMany({ where: { user_id: userId, deleted_at: null } });
  },

  // Regra de remoção, numa transação:
  // - comentário principal com respostas vira "removido" (conteúdo apagado, conversa mantida);
  // - sem respostas, é apagado de verdade;
  // - se era a última resposta de um comentário já removido, ele também sai.
  async remove(comment: Comment): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const replies = comment.parent_id === null ? await tx.comment.count({ where: { parent_id: comment.id } }) : 0;

      if (replies > 0) {
        await tx.comment.update({ where: { id: comment.id }, data: { content: null, deleted_at: new Date() } });
        return;
      }

      await tx.comment.deleteMany({ where: { id: comment.id } });

      if (comment.parent_id) {
        await tx.comment.deleteMany({
          where: { id: comment.parent_id, deleted_at: { not: null }, replies: { none: {} } },
        });
      }
    });
  },
};
