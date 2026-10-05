import type { Request, Response } from 'express';
import * as videoService from '../services/video.service.js';

type IdParams = { id: string };

export async function index(req: Request, res: Response) {
  res.json(await videoService.listVideos());
}

export async function show(req: Request<IdParams>, res: Response) {
  res.json(await videoService.getVideo(req.params.id));
}

export async function store(req: Request, res: Response) {
  const result = await videoService.createVideo(req.body ?? {});
  res.status(201).json(result);
}

export async function importFromBunny(req: Request, res: Response) {
  res.status(201).json(await videoService.importVideo(req.body ?? {}));
}

export async function upload(req: Request<IdParams>, res: Response) {
  res.json(await videoService.getUploadCredentials(req.params.id));
}

export async function playback(req: Request<IdParams>, res: Response) {
  res.json(await videoService.getPlayback(req.params.id));
}

export async function sync(req: Request<IdParams>, res: Response) {
  res.json(await videoService.syncVideoById(req.params.id));
}

export async function destroy(req: Request<IdParams>, res: Response) {
  await videoService.deleteVideo(req.params.id);
  res.status(204).send();
}
