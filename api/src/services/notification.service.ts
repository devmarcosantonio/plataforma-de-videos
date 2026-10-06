import { NotificationModel, notificationPageSchema } from '../models/notification.model.js';
import type { User } from '../models/user.model.js';
import { decodeCursor, encodeCursor } from '../utils/cursor.js';
import { AppError } from '../utils/errors/app-error.js';

export async function list(actor: User, query: unknown) {
  const { cursor, limit } = notificationPageSchema.parse(query);
  const page = await NotificationModel.list(actor.id, cursor ? decodeCursor(cursor) : undefined, limit);
  const last = page.items.at(-1);
  return {
    items: page.items,
    next_cursor: page.hasMore && last ? encodeCursor({ created_at: last.created_at.toISOString(), id: last.id }) : null,
  };
}

export async function unreadCount(actor: User) {
  return { count: await NotificationModel.unreadCount(actor.id) };
}

export async function markRead(actor: User, id: string) {
  if (!(await NotificationModel.markRead(actor.id, id))) throw new AppError('NOTIFICATION_NOT_FOUND', 404);
  return unreadCount(actor);
}

export async function markAllRead(actor: User) {
  await NotificationModel.markAllRead(actor.id);
  return unreadCount(actor);
}
