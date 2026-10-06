import { z } from 'zod';
import { prisma } from '../config/database.js';
import type { Prisma, Video, VideoStatus, VideoVisibility } from '../generated/prisma/client.js';
import { bannedUser } from './restriction.model.js';
import type { CursorPosition } from '../utils/cursor.js';

export type { Video, VideoStatus, VideoVisibility };
export type VideoAuthor = { id: string; username: string; display_name: string };
export type VideoWithStats = Video & { likes_count: number; comments_count: number; author: VideoAuthor };

// O dono do vídeo é sempre o usuário autenticado (não vem no corpo da requisição).
export const createVideoSchema = z.object({
  title: z.string({ error: 'TITLE_REQUIRED' }).trim().min(1, 'TITLE_REQUIRED').max(200, 'TITLE_TOO_LONG'),
  description: z.string().trim().max(5000, 'DESCRIPTION_TOO_LONG').optional(),
  // Novo vídeo nasce privado: o dono confere e publica quando quiser.
  visibility: z.enum(['public', 'private'], { error: 'VISIBILITY_INVALID' }).default('private'),
});

export const importVideoSchema = z.object({
  bunny_video_id: z.string({ error: 'BUNNY_VIDEO_ID_REQUIRED' }).trim().min(1, 'BUNNY_VIDEO_ID_REQUIRED'),
});

export const updateVideoSchema = z
  .object({
    title: z.string().trim().min(1, 'TITLE_EMPTY').max(200, 'TITLE_TOO_LONG').optional(),
    // String vazia apaga a descrição.
    description: z.string().trim().max(5000, 'DESCRIPTION_TOO_LONG').optional(),
    visibility: z.enum(['public', 'private'], { error: 'VISIBILITY_INVALID' }).optional(),
  })
  .refine((data) => data.title !== undefined || data.description !== undefined || data.visibility !== undefined, {
    message: 'VIDEO_UPDATE_EMPTY',
  });

export const listVideosQuerySchema = z.object({ user_id: z.uuid('INVALID_ID').optional() });

export type CreateVideoInput = z.infer<typeof createVideoSchema>;

// O que os outros veem: público (escolha do dono), ativo (moderação) e de conta não banida.
// Nada é apagado: publicar, liberar a revisão ou revogar o banimento traz o vídeo de volta.
export const visibleVideo: Prisma.VideoWhereInput = {
  visibility: 'public',
  moderation_status: 'active',
  NOT: { user: bannedUser },
};
const visible = visibleVideo;

// Autor (dados públicos) e contagens calculadas pelo banco junto com o vídeo.
// Só likes são públicos; comentários removidos não contam.
const statsInclude = {
  user: { select: { id: true, username: true, display_name: true } },
  _count: {
    select: {
      reactions: { where: { type: 'like' } },
      comments: { where: { deleted_at: null, moderated_at: null, NOT: { user: bannedUser } } },
    },
  },
} satisfies Prisma.VideoInclude;

type VideoWithCount = Prisma.VideoGetPayload<{ include: typeof statsInclude }>;

// Quem moderou não aparece para o dono (só a decisão e o motivo).
function withStats({ _count, user, moderated_by: _moderator, ...video }: VideoWithCount): VideoWithStats {
  return { ...video, moderated_by: null, author: user, likes_count: _count.reactions, comments_count: _count.comments };
}

export const VideoModel = {
  // ownerView: o dono vê todos os próprios vídeos no "Meu canal" (privados, em revisão, removidos).
  async findAllWithStats(filter: { user_id?: string } = {}, ownerView = false): Promise<VideoWithStats[]> {
    const videos = await prisma.video.findMany({
      where: { ...filter, ...(ownerView ? { NOT: { user: bannedUser } } : visible) },
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
        ...visible,
        ...after,
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: statsInclude,
    });
    return { items: rows.slice(0, limit).map(withStats), hasMore: rows.length > limit };
  },

  async countReadyByUser(userId: string): Promise<number> {
    return prisma.video.count({ where: { user_id: userId, status: 'ready', ...visible } });
  },

  async findByIdWithStats(id: string): Promise<VideoWithStats | null> {
    // Quem pode ver (dono, moderação) é decidido no service.
    const video = await prisma.video.findFirst({ where: { id, NOT: { user: bannedUser } }, include: statsInclude });
    return video && withStats(video);
  },

  // Para assistir: não encontra vídeo de conta banida.
  async findVisibleById(id: string): Promise<Video | null> {
    return prisma.video.findFirst({ where: { id, ...visible } });
  },

  async findByIdExceptBanned(id: string): Promise<Video | null> {
    return prisma.video.findFirst({ where: { id, NOT: { user: bannedUser } } });
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
