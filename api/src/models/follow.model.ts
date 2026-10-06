import { z } from 'zod';
import { prisma } from '../config/database.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { CursorPosition } from '../utils/cursor.js';

export interface FollowStatus {
  following: boolean;
  followers_count: number;
}

export const pageQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const publicUser = { select: { id: true, username: true, display_name: true } } as const;

const byKey = (followerId: string, followedId: string) => ({
  follower_id_followed_id: { follower_id: followerId, followed_id: followedId },
});

export const FollowModel = {
  async exists(followerId: string, followedId: string): Promise<boolean> {
    return (await prisma.follow.findUnique({ where: byKey(followerId, followedId) })) !== null;
  },

  // Idempotente: seguir de novo não cria um segundo vínculo (chave primária composta).
  async follow(followerId: string, followedId: string): Promise<void> {
    await prisma.follow.createMany({
      data: { follower_id: followerId, followed_id: followedId },
      skipDuplicates: true,
    });
  },

  // Idempotente: deixar de seguir quem não seguia não dá erro.
  async unfollow(followerId: string, followedId: string): Promise<void> {
    await prisma.follow.deleteMany({ where: { follower_id: followerId, followed_id: followedId } });
  },

  async countFollowers(userId: string): Promise<number> {
    return prisma.follow.count({ where: { followed_id: userId } });
  },

  async countFollowing(userId: string): Promise<number> {
    return prisma.follow.count({ where: { follower_id: userId } });
  },

  // Quem o usuário segue, do vínculo mais recente ao mais antigo.
  async listFollowing(userId: string, cursor: CursorPosition | undefined, limit: number) {
    // O cursor usa (created_at, followed_id) do último item.
    const after: Prisma.FollowWhereInput = cursor
      ? {
          OR: [
            { created_at: { lt: new Date(cursor.created_at) } },
            { created_at: new Date(cursor.created_at), followed_id: { lt: cursor.id } },
          ],
        }
      : {};
    const rows = await prisma.follow.findMany({
      where: { follower_id: userId, ...after },
      orderBy: [{ created_at: 'desc' }, { followed_id: 'desc' }],
      take: limit + 1,
      include: { followed: publicUser },
    });
    return { items: rows.slice(0, limit), hasMore: rows.length > limit };
  },
};
