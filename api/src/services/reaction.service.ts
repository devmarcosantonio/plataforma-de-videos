import {
  ReactionModel,
  reactionStatusQuerySchema,
  removeReactionSchema,
  setReactionSchema,
  type ReactionStatus,
} from '../models/reaction.model.js';
import { UserModel } from '../models/user.model.js';
import { VideoModel, type Video } from '../models/video.model.js';
import { AppError } from '../utils/errors/app-error.js';

async function findVideoOrFail(videoId: string): Promise<Video> {
  const video = await VideoModel.findById(videoId);
  if (!video) throw new AppError('Vídeo não encontrado', 404);
  return video;
}

async function ensureUser(userId: string) {
  if (!(await UserModel.findById(userId))) throw new AppError('Usuário não encontrado', 404);
}

async function status(userId: string | undefined, video: Video): Promise<ReactionStatus> {
  const [reaction, counts] = await Promise.all([
    userId ? ReactionModel.find(userId, video.id) : null,
    ReactionModel.countByVideo(video.id),
  ]);

  return {
    reaction: reaction?.type ?? null,
    likes_count: counts.like,
    // Como no YouTube: a contagem de "não gostei" só é visível para o dono do vídeo.
    ...(userId === video.user_id && { dislikes_count: counts.dislike }),
  };
}

export async function getReactionStatus(videoId: string, query: unknown): Promise<ReactionStatus> {
  const { user_id } = reactionStatusQuerySchema.parse(query);
  return status(user_id, await findVideoOrFail(videoId));
}

export async function setReaction(videoId: string, input: unknown): Promise<ReactionStatus> {
  const { user_id, type } = setReactionSchema.parse(input);
  await ensureUser(user_id);

  const video = await findVideoOrFail(videoId);
  if (video.status !== 'ready') {
    throw new AppError('Só é possível reagir a vídeos prontos', 409);
  }

  await ReactionModel.set(user_id, videoId, type);
  return status(user_id, video);
}

export async function removeReaction(videoId: string, input: unknown): Promise<ReactionStatus> {
  const { user_id } = removeReactionSchema.parse(input);
  await ensureUser(user_id);
  const video = await findVideoOrFail(videoId);

  await ReactionModel.remove(user_id, videoId);
  return status(user_id, video);
}
