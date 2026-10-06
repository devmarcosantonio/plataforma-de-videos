import { HistoryModel, historyPageSchema, progressSchema, type HistoryRow, type WatchProgress } from '../models/history.model.js';
import { SettingsModel, updateSettingsSchema, type Settings } from '../models/settings.model.js';
import type { User } from '../models/user.model.js';
import { VideoModel } from '../models/video.model.js';
import { decodeCursor, encodeCursor } from '../utils/cursor.js';
import { AppError } from '../utils/errors/app-error.js';
import { findViewableOrFail } from './video-access.service.js';

// A partir desta fração da duração o vídeo conta como concluído.
const COMPLETED_RATIO = 0.9;

function toItem(row: HistoryRow) {
  const { user, _count, ...video } = row.video;
  return {
    video: { ...video, author: user, likes_count: _count.reactions, comments_count: _count.comments },
    position_seconds: row.position_seconds,
    completed: row.completed,
    watch_count: row.watch_count,
    last_watched_at: row.last_watched_at,
  };
}

// Recebido do player enquanto a pessoa assiste (a cada ~15 s, ao pausar e ao terminar).
export async function saveProgress(actor: User, videoId: string, input: unknown) {
  const { position } = progressSchema.parse(input);

  const video = await findViewableOrFail(videoId, actor);
  if (video.status !== 'ready') throw new AppError('VIDEO_NOT_READY', 409);

  // Histórico pausado pelo usuário: não grava nada.
  const { history_paused } = await SettingsModel.get(actor.id);
  if (history_paused) return { saved: false };

  const duration = video.duration ?? 0;
  const clamped = Math.round(duration > 0 ? Math.min(position, duration) : position);
  const completed = duration > 0 && clamped >= duration * COMPLETED_RATIO;

  const row = await HistoryModel.saveProgress(actor.id, videoId, clamped, completed);
  return { saved: true, position_seconds: row.position_seconds, completed: row.completed };
}

export async function getProgress(actor: User, videoId: string): Promise<WatchProgress | null> {
  const row = await HistoryModel.find(actor.id, videoId);
  return row && { position_seconds: row.position_seconds, completed: row.completed };
}

export async function listHistory(actor: User, query: unknown) {
  const { cursor, limit } = historyPageSchema.parse(query);
  const page = await HistoryModel.list(actor.id, cursor ? decodeCursor(cursor) : undefined, limit);
  const last = page.items.at(-1);
  return {
    items: page.items.map(toItem),
    next_cursor:
      page.hasMore && last ? encodeCursor({ created_at: last.last_watched_at.toISOString(), id: last.video_id }) : null,
  };
}

export async function continueWatching(actor: User) {
  const rows = await HistoryModel.continueWatching(actor.id, 12);
  return rows.map(toItem);
}

export async function removeFromHistory(actor: User, videoId: string): Promise<void> {
  await HistoryModel.remove(actor.id, videoId);
}

export async function clearHistory(actor: User): Promise<{ removed: number }> {
  return { removed: await HistoryModel.clear(actor.id) };
}

export async function getSettings(actor: User): Promise<Settings> {
  return SettingsModel.get(actor.id);
}

export async function updateSettings(actor: User, input: unknown): Promise<Settings> {
  return SettingsModel.update(actor.id, updateSettingsSchema.parse(input));
}

// Junta o progresso do usuário logado a uma lista de vídeos (barrinha nas capas).
export async function withProgress<T extends { id: string }>(
  actor: User | undefined,
  videos: T[],
): Promise<(T & { watch_progress: WatchProgress | null })[]> {
  if (!actor) return videos.map((video) => ({ ...video, watch_progress: null }));
  const progress = await HistoryModel.progressFor(actor.id, videos.map((video) => video.id));
  return videos.map((video) => ({ ...video, watch_progress: progress.get(video.id) ?? null }));
}
