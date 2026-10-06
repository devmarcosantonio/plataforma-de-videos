import { env } from '../config/env.js';
import { bunnyClient } from '../integrations/bunny/bunny.client.js';
import { createEmbedUrl, createUploadCredentials } from '../integrations/bunny/bunny.signing.js';
import {
  BunnyVideoStatus,
  type BunnyUploadCredentials,
  type BunnyVideo,
} from '../integrations/bunny/bunny.types.js';
import type { User } from '../models/user.model.js';
import {
  VideoModel,
  createVideoSchema,
  importVideoSchema,
  listVideosQuerySchema,
  updateVideoSchema,
  type Video,
  type VideoStatus,
  type VideoWithStats,
} from '../models/video.model.js';
import { AppError } from '../utils/errors/app-error.js';
import { withProgress } from './history.service.js';
import { ensureCanUpload } from './upload-access.service.js';
import { canViewVideo, findViewableOrFail } from './video-access.service.js';

function toVideoStatus(status: BunnyVideoStatus): VideoStatus {
  switch (status) {
    case BunnyVideoStatus.Created:
      return 'pending_upload';
    case BunnyVideoStatus.Finished:
      return 'ready';
    case BunnyVideoStatus.Error:
    case BunnyVideoStatus.UploadFailed:
      return 'failed';
    default:
      return 'processing';
  }
}

function thumbnailUrl(bunnyVideo: BunnyVideo): string | null {
  if (!bunnyVideo.thumbnailFileName) return null;
  return `https://${env.BUNNY_CDN_HOSTNAME}/${bunnyVideo.guid}/${bunnyVideo.thumbnailFileName}`;
}

// Campos que vêm do Bunny e são sincronizados no vídeo local.
function fromBunny(bunnyVideo: BunnyVideo) {
  return {
    status: toVideoStatus(bunnyVideo.status),
    duration: bunnyVideo.length ? Math.round(bunnyVideo.length) : null,
    thumbnail_url: thumbnailUrl(bunnyVideo),
  };
}

async function findOrFail(id: string): Promise<Video> {
  const video = await VideoModel.findById(id);
  if (!video) throw new AppError('VIDEO_NOT_FOUND', 404);
  return video;
}

export async function createVideo(
  actor: User,
  input: unknown,
): Promise<{ video: Video; upload: BunnyUploadCredentials }> {
  await ensureCanUpload(actor);
  const data = createVideoSchema.parse(input);

  const bunnyVideo = await bunnyClient.createVideo(data.title);

  try {
    const video = await VideoModel.create({
      user_id: actor.id,
      bunny_video_id: bunnyVideo.guid,
      title: data.title,
      description: data.description ?? null,
      visibility: data.visibility,
    });
    return { video, upload: createUploadCredentials(bunnyVideo.guid) };
  } catch (error) {
    // Não deixa vídeo órfão no Bunny se o registro local falhar.
    await bunnyClient.deleteVideo(bunnyVideo.guid).catch(() => {});
    throw error;
  }
}

// Registra um vídeo que já existe no Bunny (ex.: enviado antes da persistência no banco).
export async function importVideo(actor: User, input: unknown): Promise<Video> {
  await ensureCanUpload(actor);
  const data = importVideoSchema.parse(input);

  if (await VideoModel.findByBunnyId(data.bunny_video_id)) {
    throw new AppError('VIDEO_ALREADY_IMPORTED', 409);
  }

  const bunnyVideo = await bunnyClient.getVideo(data.bunny_video_id);
  if (!bunnyVideo) throw new AppError('BUNNY_VIDEO_NOT_FOUND', 404);

  return VideoModel.create({
    user_id: actor.id,
    bunny_video_id: bunnyVideo.guid,
    title: bunnyVideo.title.slice(0, 200) || 'Sem título',
    ...fromBunny(bunnyVideo),
  });
}

export async function listVideos(actor: User | undefined, query: unknown) {
  const { user_id } = listVideosQuerySchema.parse(query);
  const own = !!actor && user_id === actor.id;
  return withProgress(actor, await VideoModel.findAllWithStats(user_id ? { user_id } : {}, own));
}

async function findOwnedOrFail(id: string, actor: User): Promise<Video> {
  const video = await findOrFail(id);
  if (video.user_id !== actor.id) throw new AppError('VIDEO_OWNER_ONLY', 403);
  return video;
}

export async function updateVideo(actor: User, id: string, input: unknown): Promise<VideoWithStats> {
  const { title, description, visibility } = updateVideoSchema.parse(input);
  const video = await findOwnedOrFail(id, actor);

  // O dono muda a visibilidade a qualquer momento; em revisão/removido o vídeo continua oculto mesmo assim.
  await VideoModel.update(video.id, {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description: description || null }),
    ...(visibility !== undefined && { visibility }),
  });

  // Mantém o título igual no painel do Bunny; falhar aqui não desfaz a edição local.
  if (title !== undefined && title !== video.title) {
    await bunnyClient.updateTitle(video.bunny_video_id, title).catch((error) => {
      console.error('Não foi possível atualizar o título no Bunny:', error);
    });
  }

  return getVideo(video.id, actor);
}

export async function getVideo(id: string, actor?: User) {
  const video = await VideoModel.findByIdWithStats(id);
  if (!video || !canViewVideo(video, actor)) throw new AppError('VIDEO_NOT_FOUND', 404);
  const [withUserProgress] = await withProgress(actor, [video]);
  return withUserProgress;
}

export async function getUploadCredentials(actor: User, id: string): Promise<BunnyUploadCredentials> {
  await ensureCanUpload(actor);
  const video = await findOwnedOrFail(id, actor);
  if (video.status !== 'pending_upload') {
    throw new AppError('VIDEO_ALREADY_UPLOADED', 409);
  }
  return createUploadCredentials(video.bunny_video_id);
}

export async function getPlayback(id: string, actor?: User) {
  const video = await findViewableOrFail(id, actor);
  if (video.status !== 'ready') {
    throw new AppError('VIDEO_NOT_READY', 409);
  }

  const embed = createEmbedUrl(video.bunny_video_id);
  return {
    embed_url: embed.url,
    hls_url: `https://${env.BUNNY_CDN_HOSTNAME}/${video.bunny_video_id}/playlist.m3u8`,
    thumbnail_url: video.thumbnail_url,
    expires_at: embed.expires_at,
  };
}

// Busca o estado atual no Bunny e atualiza o vídeo local.
// Usado pelo webhook e pela sincronização manual: nunca confia no payload recebido.
export async function syncVideo(video: Video): Promise<Video> {
  const bunnyVideo = await bunnyClient.getVideo(video.bunny_video_id);
  if (!bunnyVideo) return VideoModel.update(video.id, { status: 'failed' });
  return VideoModel.update(video.id, fromBunny(bunnyVideo));
}

export async function syncVideoById(actor: User, id: string): Promise<Video> {
  return syncVideo(await findOwnedOrFail(id, actor));
}

export async function handleBunnyWebhook(libraryId: number, bunnyVideoId: string): Promise<void> {
  if (String(libraryId) !== env.BUNNY_LIBRARY_ID) return;

  const video = await VideoModel.findByBunnyId(bunnyVideoId);
  // Vídeo criado fora da aplicação ou já removido: nada a fazer.
  if (!video) return;

  await syncVideo(video);
}

export async function deleteVideo(actor: User, id: string): Promise<void> {
  const video = await findOwnedOrFail(id, actor);
  await bunnyClient.deleteVideo(video.bunny_video_id);
  // Likes e comentários saem em cascata no banco.
  await VideoModel.delete(video.id);
}
