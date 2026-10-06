import type { Request, Response } from 'express';
import * as notificationService from '../services/notification.service.js';

export async function index(req: Request, res: Response) {
  res.json(await notificationService.list(req.user!, req.query));
}

export async function unreadCount(req: Request, res: Response) {
  res.json(await notificationService.unreadCount(req.user!));
}

export async function markRead(req: Request<{ id: string }>, res: Response) {
  res.json(await notificationService.markRead(req.user!, req.params.id));
}

export async function markAllRead(req: Request, res: Response) {
  res.json(await notificationService.markAllRead(req.user!));
}
