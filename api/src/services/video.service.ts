import { env } from '../config/env.js';
import { bunnyClient } from '../integrations/bunny/bunny.client.js';
import { createEmbedUrl, createUploadCredentials } from '../integrations/bunny/bunny.signing.js';
import {
  BunnyVideoStatus,
  type BunnyUploadCredentials,
  type BunnyVideo,
} from '../integrations/bunny/bunny.types.js';
import { UserModel } from '../models/user.model.js';
import {
  VideoModel,
  createVideoSchema,
  importVideoSchema,
  type Video,
  type VideoStatus,
  type VideoWithStats,
} from '../models/video.model.js';
import { AppError } from '../utils/errors/app-error.js';

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
  if (!video) throw new AppError('Vídeo não encontrado', 404);
  return video;
}

async function ensureUser(userId: string) {
  if (!(await UserModel.findById(userId))) throw new AppError('Usuário não encontrado', 404);
}

export async function createVideo(
  input: unknown,
): Promise<{ video: Video; upload: BunnyUploadCredentials }> {
  const data = createVideoSchema.parse(input);
  await ensureUser(data.user_id);

  const bunnyVideo = await bunnyClient.createVideo(data.title);

  try {
    const video = await VideoModel.create({
      user_id: data.user_id,
      bunny_video_id: bunnyVideo.guid,
      title: data.title,
      description: data.description ?? null,
    });
    return { video, upload: createUploadCredentials(bunnyVideo.guid) };
  } catch (error) {
    // Não deixa vídeo órfão no Bunny se o registro local falhar.
    await bunnyClient.deleteVideo(bunnyVideo.guid).catch(() => {});
    throw error;
  }
}

// Registra um vídeo que já existe no Bunny (ex.: enviado antes da persistência no banco).
export async function importVideo(input: unknown): Promise<Video> {
  const data = importVideoSchema.parse(input);
  await ensureUser(data.user_id);

  if (await VideoModel.findByBunnyId(data.bunny_video_id)) {
    throw new AppError('Este vídeo já está cadastrado', 409);
  }

  const bunnyVideo = await bunnyClient.getVideo(data.bunny_video_id);
  if (!bunnyVideo) throw new AppError('Vídeo não encontrado no Bunny', 404);

  return VideoModel.create({
    user_id: data.user_id,
    bunny_video_id: bunnyVideo.guid,
    title: bunnyVideo.title.slice(0, 200) || 'Sem título',
    ...fromBunny(bunnyVideo),
  });
}

export async function listVideos(): Promise<VideoWithStats[]> {
  return VideoModel.findAllWithStats();
}

export async function getVideo(id: string): Promise<VideoWithStats> {
  const video = await VideoModel.findByIdWithStats(id);
  if (!video) throw new AppError('Vídeo não encontrado', 404);
  return video;
}

export async function getUploadCredentials(id: string): Promise<BunnyUploadCredentials> {
  const video = await findOrFail(id);
  if (video.status !== 'pending_upload') {
    throw new AppError('Este vídeo já foi enviado', 409);
  }
  return createUploadCredentials(video.bunny_video_id);
}

export async function getPlayback(id: string) {
  const video = await findOrFail(id);
  if (video.status !== 'ready') {
    throw new AppError('O vídeo ainda não está pronto para reprodução', 409);
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

export async function syncVideoById(id: string): Promise<Video> {
  return syncVideo(await findOrFail(id));
}

export async function handleBunnyWebhook(libraryId: number, bunnyVideoId: string): Promise<void> {
  if (String(libraryId) !== env.BUNNY_LIBRARY_ID) return;

  const video = await VideoModel.findByBunnyId(bunnyVideoId);
  // Vídeo criado fora da aplicação ou já removido: nada a fazer.
  if (!video) return;

  await syncVideo(video);
}

export async function deleteVideo(id: string): Promise<void> {
  const video = await findOrFail(id);
  await bunnyClient.deleteVideo(video.bunny_video_id);
  // Likes e comentários saem em cascata no banco.
  await VideoModel.delete(video.id);
}
