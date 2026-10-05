import { z } from 'zod';
import { prisma } from '../config/database.js';
import type { Reaction, ReactionType } from '../generated/prisma/client.js';

export type { Reaction, ReactionType };

export interface ReactionStatus {
  reaction: ReactionType | null;
  likes_count: number;
  // Só aparece para o dono do vídeo.
  dislikes_count?: number;
}

// user_id é temporário: virá do usuário autenticado quando houver login.
export const setReactionSchema = z.object({
  user_id: z.uuid('user_id inválido'),
  type: z.enum(['like', 'dislike'], { error: 'type deve ser "like" ou "dislike"' }),
});

export const removeReactionSchema = z.object({
  user_id: z.uuid('user_id inválido'),
});

export const reactionStatusQuerySchema = z.object({
  user_id: z.uuid('user_id inválido').optional(),
});

const byKey = (userId: string, videoId: string) => ({
  user_id_video_id: { user_id: userId, video_id: videoId },
});

export const ReactionModel = {
  async find(userId: string, videoId: string): Promise<Reaction | null> {
    return prisma.reaction.findUnique({ where: byKey(userId, videoId) });
  },

  // Idempotente: cria a reação ou troca o tipo (like <-> dislike) na mesma linha.
  async set(userId: string, videoId: string, type: ReactionType): Promise<Reaction> {
    return prisma.reaction.upsert({
      where: byKey(userId, videoId),
      create: { user_id: userId, video_id: videoId, type },
      update: { type },
    });
  },

  // Idempotente: remover uma reação inexistente não dá erro.
  async remove(userId: string, videoId: string): Promise<void> {
    await prisma.reaction.deleteMany({ where: { user_id: userId, video_id: videoId } });
  },

  async countByVideo(videoId: string): Promise<Record<ReactionType, number>> {
    const groups = await prisma.reaction.groupBy({
      by: ['type'],
      where: { video_id: videoId },
      _count: { _all: true },
    });
    const counts: Record<ReactionType, number> = { like: 0, dislike: 0 };
    for (const group of groups) counts[group.type] = group._count._all;
    return counts;
  },
};
