import { z } from 'zod';
import { prisma } from '../config/database.js';
import type { Comment, Prisma } from '../generated/prisma/client.js';
import type { CursorPosition } from '../utils/cursor.js';

export type { Comment };

const content = z
  .string({ error: 'O comentário é obrigatório' })
  .trim()
  .min(1, 'O comentário não pode ficar vazio')
  .max(2000, 'O comentário pode ter no máximo 2000 caracteres');

// O autor é sempre o usuário autenticado (não vem no corpo da requisição).
export const createCommentSchema = z.object({
  content,
  parent_id: z.uuid('parent_id inválido').optional(),
});

export const updateCommentSchema = z.object({ content });

export const listCommentsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// Autor e quantidade de respostas vêm na mesma consulta.
const include = {
  user: { select: { id: true, username: true, name: true, last_name: true } },
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
    where: { ...where, ...afterCursor(cursor, order) },
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
