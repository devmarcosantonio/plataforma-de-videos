import { ReactionModel, setReactionSchema, type ReactionStatus } from '../models/reaction.model.js';
import type { User } from '../models/user.model.js';
import type { Video } from '../models/video.model.js';
import { AppError } from '../utils/errors/app-error.js';
import { ensureAccess } from './access.service.js';
import { findViewableOrFail } from './video-access.service.js';

// Reações só em vídeos que a pessoa pode ver (privado: só o dono e a moderação).
function findVideoOrFail(videoId: string, actor: User | undefined): Promise<Video> {
  return findViewableOrFail(videoId, actor);
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
  return status(actor, await findVideoOrFail(videoId, actor));
}

export async function setReaction(actor: User, videoId: string, input: unknown): Promise<ReactionStatus> {
  const { type } = setReactionSchema.parse(input);
  await ensureAccess(actor, 'react');

  const video = await findVideoOrFail(videoId, actor);
  if (video.status !== 'ready') {
    throw new AppError('REACTION_VIDEO_NOT_READY', 409);
  }

  await ReactionModel.set(actor.id, videoId, type);
  return status(actor, video);
}

export async function removeReaction(actor: User, videoId: string): Promise<ReactionStatus> {
  const video = await findVideoOrFail(videoId, actor);
  await ReactionModel.remove(actor.id, videoId);
  return status(actor, video);
}
