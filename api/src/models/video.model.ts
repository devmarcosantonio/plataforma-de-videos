import { z } from 'zod';
import { prisma } from '../config/database.js';
import type { Prisma, Video, VideoStatus } from '../generated/prisma/client.js';
import type { CursorPosition } from '../utils/cursor.js';

export type { Video, VideoStatus };
export type VideoAuthor = { id: string; username: string; display_name: string };
export type VideoWithStats = Video & { likes_count: number; comments_count: number; author: VideoAuthor };

// O dono do vídeo é sempre o usuário autenticado (não vem no corpo da requisição).
export const createVideoSchema = z.object({
  title: z.string({ error: 'TITLE_REQUIRED' }).trim().min(1, 'TITLE_REQUIRED').max(200, 'TITLE_TOO_LONG'),
  description: z.string().trim().max(5000, 'DESCRIPTION_TOO_LONG').optional(),
});

export const importVideoSchema = z.object({
  bunny_video_id: z.string({ error: 'BUNNY_VIDEO_ID_REQUIRED' }).trim().min(1, 'BUNNY_VIDEO_ID_REQUIRED'),
});

export const updateVideoSchema = z
  .object({
    title: z.string().trim().min(1, 'TITLE_EMPTY').max(200, 'TITLE_TOO_LONG').optional(),
    // String vazia apaga a descrição.
    description: z.string().trim().max(5000, 'DESCRIPTION_TOO_LONG').optional(),
  })
  .refine((data) => data.title !== undefined || data.description !== undefined, {
    message: 'VIDEO_UPDATE_EMPTY',
  });

export const listVideosQuerySchema = z.object({ user_id: z.uuid('INVALID_ID').optional() });

export type CreateVideoInput = z.infer<typeof createVideoSchema>;

// Autor (dados públicos) e contagens calculadas pelo banco junto com o vídeo.
// Só likes são públicos; comentários removidos não contam.
const statsInclude = {
  user: { select: { id: true, username: true, display_name: true } },
  _count: {
    select: {
      reactions: { where: { type: 'like' } },
      comments: { where: { deleted_at: null } },
    },
  },
} satisfies Prisma.VideoInclude;

type VideoWithCount = Prisma.VideoGetPayload<{ include: typeof statsInclude }>;

function withStats({ _count, user, ...video }: VideoWithCount): VideoWithStats {
  return { ...video, author: user, likes_count: _count.reactions, comments_count: _count.comments };
}

export const VideoModel = {
  async findAllWithStats(filter: { user_id?: string } = {}): Promise<VideoWithStats[]> {
    const videos = await prisma.video.findMany({
      where: filter,
      include: statsInclude,
      orderBy: { created_at: 'desc' },
    });
    return videos.map(withStats);
  },

  // Feed "Seguindo": vídeos prontos de quem o usuário segue, do mais novo ao mais antigo.
  async findFeedWithStats(followerId: string, cursor: CursorPosition | undefined, limit: number) {
    const after: Prisma.VideoWhereInput = cursor
      ? {
          OR: [
            { created_at: { lt: new Date(cursor.created_at) } },
            { created_at: new Date(cursor.created_at), id: { lt: cursor.id } },
          ],
        }
      : {};
    const rows = await prisma.video.findMany({
      where: {
        status: 'ready',
        user: { followers: { some: { follower_id: followerId } } },
        ...after,
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: statsInclude,
    });
    return { items: rows.slice(0, limit).map(withStats), hasMore: rows.length > limit };
  },

  async countReadyByUser(userId: string): Promise<number> {
    return prisma.video.count({ where: { user_id: userId, status: 'ready' } });
  },

  async findByIdWithStats(id: string): Promise<VideoWithStats | null> {
    const video = await prisma.video.findUnique({ where: { id }, include: statsInclude });
    return video && withStats(video);
  },

  async findById(id: string): Promise<Video | null> {
    return prisma.video.findUnique({ where: { id } });
  },

  async findByBunnyId(bunnyVideoId: string): Promise<Video | null> {
    return prisma.video.findUnique({ where: { bunny_video_id: bunnyVideoId } });
  },

  async create(data: Prisma.VideoUncheckedCreateInput): Promise<Video> {
    return prisma.video.create({ data });
  },

  async update(id: string, data: Prisma.VideoUncheckedUpdateInput): Promise<Video> {
    return prisma.video.update({ where: { id }, data });
  },

  // Likes e comentários saem em cascata (ON DELETE CASCADE).
  async delete(id: string): Promise<boolean> {
    const { count } = await prisma.video.deleteMany({ where: { id } });
    return count > 0;
  },
};
