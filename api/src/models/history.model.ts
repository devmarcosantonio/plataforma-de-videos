import { z } from 'zod';
import { prisma } from '../config/database.js';
import type { Prisma, WatchHistory } from '../generated/prisma/client.js';
import type { CursorPosition } from '../utils/cursor.js';

export type { WatchHistory };

export interface WatchProgress {
  position_seconds: number;
  completed: boolean;
}

export const progressSchema = z.object({
  position: z.coerce.number({ error: 'POSITION_INVALID' }).min(0, 'POSITION_INVALID').max(60 * 60 * 24, 'POSITION_INVALID'),
});

export const historyPageSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// Abrir o vídeo de novo depois desse intervalo conta como uma nova vez assistida.
const NEW_SESSION_AFTER_MS = 30 * 60 * 1000;

const videoInclude = {
  video: {
    include: {
      user: { select: { id: true, username: true, display_name: true } },
      _count: {
        select: {
          reactions: { where: { type: 'like' } },
          comments: { where: { deleted_at: null } },
        },
      },
    },
  },
} satisfies Prisma.WatchHistoryInclude;

export type HistoryRow = Prisma.WatchHistoryGetPayload<{ include: typeof videoInclude }>;

const byKey = (userId: string, videoId: string) => ({ user_id_video_id: { user_id: userId, video_id: videoId } });

export const HistoryModel = {
  async find(userId: string, videoId: string): Promise<WatchHistory | null> {
    return prisma.watchHistory.findUnique({ where: byKey(userId, videoId) });
  },

  // Cria ou atualiza a linha do par usuário/vídeo (receber o mesmo aviso de novo não causa problema).
  async saveProgress(userId: string, videoId: string, position: number, completed: boolean): Promise<WatchHistory> {
    const now = new Date();
    const current = await this.find(userId, videoId);
    const newSession = current ? now.getTime() - current.last_watched_at.getTime() > NEW_SESSION_AFTER_MS : false;

    return prisma.watchHistory.upsert({
      where: byKey(userId, videoId),
      create: { user_id: userId, video_id: videoId, position_seconds: position, completed, last_watched_at: now },
      update: {
        position_seconds: position,
        // Reflete a última vez que assistiu: reassistir e parar no meio volta a "continuar assistindo".
        completed,
        last_watched_at: now,
        ...(newSession && { watch_count: { increment: 1 } }),
      },
    });
  },

  // Do mais recente ao mais antigo, paginado por (last_watched_at, video_id).
  async list(userId: string, cursor: CursorPosition | undefined, limit: number) {
    const after: Prisma.WatchHistoryWhereInput = cursor
      ? {
          OR: [
            { last_watched_at: { lt: new Date(cursor.created_at) } },
            { last_watched_at: new Date(cursor.created_at), video_id: { lt: cursor.id } },
          ],
        }
      : {};
    const rows = await prisma.watchHistory.findMany({
      where: { user_id: userId, ...after },
      orderBy: [{ last_watched_at: 'desc' }, { video_id: 'desc' }],
      take: limit + 1,
      include: videoInclude,
    });
    return { items: rows.slice(0, limit), hasMore: rows.length > limit };
  },

  // "Continuar assistindo": começados (≥ 10 s) e não concluídos, de vídeos prontos.
  async continueWatching(userId: string, limit: number): Promise<HistoryRow[]> {
    return prisma.watchHistory.findMany({
      where: { user_id: userId, completed: false, position_seconds: { gte: 10 }, video: { status: 'ready' } },
      orderBy: { last_watched_at: 'desc' },
      take: limit,
      include: videoInclude,
    });
  },

  // Progresso de vários vídeos de uma vez (para as barrinhas nas capas).
  async progressFor(userId: string, videoIds: string[]): Promise<Map<string, WatchProgress>> {
    if (videoIds.length === 0) return new Map();
    const rows = await prisma.watchHistory.findMany({
      where: { user_id: userId, video_id: { in: videoIds } },
      select: { video_id: true, position_seconds: true, completed: true },
    });
    return new Map(rows.map((row) => [row.video_id, { position_seconds: row.position_seconds, completed: row.completed }]));
  },

  async remove(userId: string, videoId: string): Promise<void> {
    await prisma.watchHistory.deleteMany({ where: { user_id: userId, video_id: videoId } });
  },

  async clear(userId: string): Promise<number> {
    const { count } = await prisma.watchHistory.deleteMany({ where: { user_id: userId } });
    return count;
  },
};
