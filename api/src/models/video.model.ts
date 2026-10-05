import { z } from 'zod';
import { prisma } from '../config/database.js';
import type { Prisma, Video, VideoStatus } from '../generated/prisma/client.js';

export type { Video, VideoStatus };
export type VideoWithStats = Video & { likes_count: number; comments_count: number };

export const createVideoSchema = z.object({
  // Temporário: virá do usuário autenticado quando houver login.
  user_id: z.uuid('user_id inválido'),
  title: z.string({ error: 'O título é obrigatório' }).trim().min(1, 'O título é obrigatório').max(200),
  description: z.string().trim().max(5000).optional(),
});

export const importVideoSchema = z.object({
  user_id: z.uuid('user_id inválido'),
  bunny_video_id: z.string({ error: 'bunny_video_id é obrigatório' }).trim().min(1, 'bunny_video_id é obrigatório'),
});

export type CreateVideoInput = z.infer<typeof createVideoSchema>;

// Contagens calculadas pelo banco junto com o vídeo. Só likes são públicos;
// comentários removidos não contam.
const statsInclude = {
  _count: {
    select: {
      reactions: { where: { type: 'like' } },
      comments: { where: { deleted_at: null } },
    },
  },
} satisfies Prisma.VideoInclude;

type VideoWithCount = Prisma.VideoGetPayload<{ include: typeof statsInclude }>;

function withStats({ _count, ...video }: VideoWithCount): VideoWithStats {
  return { ...video, likes_count: _count.reactions, comments_count: _count.comments };
}

export const VideoModel = {
  async findAllWithStats(): Promise<VideoWithStats[]> {
    const videos = await prisma.video.findMany({ include: statsInclude, orderBy: { created_at: 'desc' } });
    return videos.map(withStats);
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
