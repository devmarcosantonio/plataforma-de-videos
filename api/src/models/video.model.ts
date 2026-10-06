import { z } from 'zod';
import { prisma } from '../config/database.js';
import type { Prisma, Video, VideoStatus } from '../generated/prisma/client.js';

export type { Video, VideoStatus };
export type VideoAuthor = { id: string; username: string; name: string; last_name: string };
export type VideoWithStats = Video & { likes_count: number; comments_count: number; author: VideoAuthor };

// O dono do vídeo é sempre o usuário autenticado (não vem no corpo da requisição).
export const createVideoSchema = z.object({
  title: z.string({ error: 'O título é obrigatório' }).trim().min(1, 'O título é obrigatório').max(200),
  description: z.string().trim().max(5000).optional(),
});

export const importVideoSchema = z.object({
  bunny_video_id: z.string({ error: 'bunny_video_id é obrigatório' }).trim().min(1, 'bunny_video_id é obrigatório'),
});

export const updateVideoSchema = z
  .object({
    title: z.string().trim().min(1, 'O título não pode ficar vazio').max(200, 'O título pode ter no máximo 200 caracteres').optional(),
    // String vazia apaga a descrição.
    description: z.string().trim().max(5000, 'A descrição pode ter no máximo 5000 caracteres').optional(),
  })
  .refine((data) => data.title !== undefined || data.description !== undefined, {
    message: 'Informe o título ou a descrição',
  });

export const listVideosQuerySchema = z.object({ user_id: z.uuid('user_id inválido').optional() });

export type CreateVideoInput = z.infer<typeof createVideoSchema>;

// Autor (dados públicos) e contagens calculadas pelo banco junto com o vídeo.
// Só likes são públicos; comentários removidos não contam.
const statsInclude = {
  user: { select: { id: true, username: true, name: true, last_name: true } },
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
