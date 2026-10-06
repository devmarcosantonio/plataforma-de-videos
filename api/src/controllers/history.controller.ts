import type { Request, Response } from 'express';
import * as historyService from '../services/history.service.js';

type IdParams = { id: string };
type VideoParams = { videoId: string };

export async function saveProgress(req: Request<IdParams>, res: Response) {
  res.json(await historyService.saveProgress(req.user!, req.params.id, req.body ?? {}));
}

export async function getProgress(req: Request<IdParams>, res: Response) {
  res.json(await historyService.getProgress(req.user!, req.params.id));
}

export async function list(req: Request, res: Response) {
  res.json(await historyService.listHistory(req.user!, req.query));
}

export async function continueWatching(req: Request, res: Response) {
  res.json(await historyService.continueWatching(req.user!));
}

export async function remove(req: Request<VideoParams>, res: Response) {
  await historyService.removeFromHistory(req.user!, req.params.videoId);
  res.status(204).send();
}

export async function clear(req: Request, res: Response) {
  res.json(await historyService.clearHistory(req.user!));
}

export async function getSettings(req: Request, res: Response) {
  res.json(await historyService.getSettings(req.user!));
}

export async function updateSettings(req: Request, res: Response) {
  res.json(await historyService.updateSettings(req.user!, req.body ?? {}));
}
