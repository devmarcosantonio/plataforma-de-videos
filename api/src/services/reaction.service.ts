import { ReactionModel, setReactionSchema, type ReactionStatus } from '../models/reaction.model.js';
import type { User } from '../models/user.model.js';
import { VideoModel, type Video } from '../models/video.model.js';
import { AppError } from '../utils/errors/app-error.js';

async function findVideoOrFail(videoId: string): Promise<Video> {
  const video = await VideoModel.findById(videoId);
  if (!video) throw new AppError('Vídeo não encontrado', 404);
  return video;
}

async function status(actor: User | undefined, video: Video): Promise<ReactionStatus> {
  const [reaction, counts] = await Promise.all([
    actor ? ReactionModel.find(actor.id, video.id) : null,
    ReactionModel.countByVideo(video.id),
  ]);

  return {
    reaction: reaction?.type ?? null,
    likes_count: counts.like,
    // Como no YouTube: a contagem de "não gostei" só é visível para o dono do vídeo.
    ...(actor?.id === video.user_id && { dislikes_count: counts.dislike }),
  };
}

// Visitantes também podem consultar (veem só a contagem de likes).
export async function getReactionStatus(actor: User | undefined, videoId: string): Promise<ReactionStatus> {
  return status(actor, await findVideoOrFail(videoId));
}

export async function setReaction(actor: User, videoId: string, input: unknown): Promise<ReactionStatus> {
  const { type } = setReactionSchema.parse(input);

  const video = await findVideoOrFail(videoId);
  if (video.status !== 'ready') {
    throw new AppError('Só é possível reagir a vídeos prontos', 409);
  }

  await ReactionModel.set(actor.id, videoId, type);
  return status(actor, video);
}

export async function removeReaction(actor: User, videoId: string): Promise<ReactionStatus> {
  const video = await findVideoOrFail(videoId);
  await ReactionModel.remove(actor.id, videoId);
  return status(actor, video);
}
