import type { Request, Response } from 'express';
import * as videoService from '../services/video.service.js';

type IdParams = { id: string };

export async function index(req: Request, res: Response) {
  res.json(await videoService.listVideos(req.query));
}

export async function update(req: Request<IdParams>, res: Response) {
  res.json(await videoService.updateVideo(req.user!, req.params.id, req.body ?? {}));
}

export async function show(req: Request<IdParams>, res: Response) {
  res.json(await videoService.getVideo(req.params.id));
}

export async function store(req: Request, res: Response) {
  const result = await videoService.createVideo(req.user!, req.body ?? {});
  res.status(201).json(result);
}

export async function importFromBunny(req: Request, res: Response) {
  res.status(201).json(await videoService.importVideo(req.user!, req.body ?? {}));
}

export async function upload(req: Request<IdParams>, res: Response) {
  res.json(await videoService.getUploadCredentials(req.user!, req.params.id));
}

export async function playback(req: Request<IdParams>, res: Response) {
  res.json(await videoService.getPlayback(req.params.id));
}

export async function sync(req: Request<IdParams>, res: Response) {
  res.json(await videoService.syncVideoById(req.user!, req.params.id));
}

export async function destroy(req: Request<IdParams>, res: Response) {
  await videoService.deleteVideo(req.user!, req.params.id);
  res.status(204).send();
}
