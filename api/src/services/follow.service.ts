import { FollowModel, pageQuerySchema, type FollowStatus } from '../models/follow.model.js';
import { UserModel, type User } from '../models/user.model.js';
import { VideoModel, type VideoWithStats } from '../models/video.model.js';
import { decodeCursor, encodeCursor } from '../utils/cursor.js';
import { AppError } from '../utils/errors/app-error.js';
import { withProgress } from './history.service.js';

export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}

async function ensureUserExists(id: string) {
  if (!(await UserModel.findById(id))) throw new AppError('USER_NOT_FOUND', 404);
}

async function status(actor: User | undefined, targetId: string): Promise<FollowStatus> {
  const [following, followers_count] = await Promise.all([
    actor ? FollowModel.exists(actor.id, targetId) : false,
    FollowModel.countFollowers(targetId),
  ]);
  return { following, followers_count };
}

export async function follow(actor: User, targetId: string): Promise<FollowStatus> {
  if (actor.id === targetId) throw new AppError('CANNOT_FOLLOW_SELF');
  await ensureUserExists(targetId);
  await FollowModel.follow(actor.id, targetId);
  return status(actor, targetId);
}

export async function unfollow(actor: User, targetId: string): Promise<FollowStatus> {
  await ensureUserExists(targetId);
  await FollowModel.unfollow(actor.id, targetId);
  return status(actor, targetId);
}

// Só o próprio usuário vê a lista de quem ele segue (publicamente, só os números).
export async function listFollowing(actor: User, userId: string, query: unknown) {
  if (actor.id !== userId) throw new AppError('FOLLOWING_LIST_FORBIDDEN', 403);
  const { cursor, limit } = pageQuerySchema.parse(query);

  const page = await FollowModel.listFollowing(userId, cursor ? decodeCursor(cursor) : undefined, limit);
  const last = page.items.at(-1);
  return {
    items: page.items.map((row) => ({ ...row.followed, followed_at: row.created_at })),
    next_cursor:
      page.hasMore && last ? encodeCursor({ created_at: last.created_at.toISOString(), id: last.followed_id }) : null,
  };
}

export async function feed(actor: User, query: unknown) {
  const { cursor, limit } = pageQuerySchema.parse(query);
  const page = await VideoModel.findFeedWithStats(actor.id, cursor ? decodeCursor(cursor) : undefined, limit);
  const last = page.items.at(-1);
  return {
    items: await withProgress(actor, page.items),
    next_cursor:
      page.hasMore && last ? encodeCursor({ created_at: last.created_at.toISOString(), id: last.id }) : null,
  };
}

// Números públicos do canal, mais "is_following" para quem está logado.
export async function profileStats(actor: User | undefined, userId: string) {
  const [followers_count, following_count, videos_count, is_following] = await Promise.all([
    FollowModel.countFollowers(userId),
    FollowModel.countFollowing(userId),
    VideoModel.countReadyByUser(userId),
    actor ? FollowModel.exists(actor.id, userId) : false,
  ]);
  return { followers_count, following_count, videos_count, is_following };
}
