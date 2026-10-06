import { z } from 'zod';
import { prisma } from '../config/database.js';
import type { Notification, Prisma } from '../generated/prisma/client.js';
import type { CursorPosition } from '../utils/cursor.js';

export type { Notification };

// Tipos de notificação. O texto é montado no front, traduzido, a partir de type + data.
export type NotificationType =
  | 'upload_request.created'
  | 'upload_request.approved'
  | 'upload_request.rejected'
  | 'upload_access.granted'
  | 'upload_access.revoked'
  | 'role.changed'
  | 'restriction.applied'
  | 'restriction.revoked'
  | 'video.under_review'
  | 'video.removed'
  | 'video.restored'
  | 'video.purged'
  | 'comment.removed'
  | 'comment.restored';

export interface NewNotification {
  user_id: string;
  type: NotificationType;
  data?: Prisma.InputJsonValue;
}

export const notificationPageSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// Aceita o cliente normal ou o de uma transação (para criar junto com a ação que gerou a notificação).
type Db = Prisma.TransactionClient | typeof prisma;

export const NotificationModel = {
  async createMany(items: NewNotification[], db: Db = prisma): Promise<void> {
    if (items.length === 0) return;
    await db.notification.createMany({
      data: items.map((item) => ({ user_id: item.user_id, type: item.type, data: item.data ?? {} })),
    });
  },

  async list(userId: string, cursor: CursorPosition | undefined, limit: number) {
    const after: Prisma.NotificationWhereInput = cursor
      ? {
          OR: [
            { created_at: { lt: new Date(cursor.created_at) } },
            { created_at: new Date(cursor.created_at), id: { lt: cursor.id } },
          ],
        }
      : {};
    const rows = await prisma.notification.findMany({
      where: { user_id: userId, ...after },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    return { items: rows.slice(0, limit), hasMore: rows.length > limit };
  },

  async unreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { user_id: userId, read_at: null } });
  },

  // Marca como lida só se for do próprio usuário; devolve se encontrou.
  async markRead(userId: string, id: string): Promise<boolean> {
    const { count } = await prisma.notification.updateMany({
      where: { id, user_id: userId },
      data: { read_at: new Date() },
    });
    return count > 0;
  },

  async markAllRead(userId: string): Promise<number> {
    const { count } = await prisma.notification.updateMany({
      where: { user_id: userId, read_at: null },
      data: { read_at: new Date() },
    });
    return count;
  },
};
