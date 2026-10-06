import type { Request, Response } from 'express';
import * as followService from '../services/follow.service.js';

type IdParams = { id: string };

export async function follow(req: Request<IdParams>, res: Response) {
  res.json(await followService.follow(req.user!, req.params.id));
}

export async function unfollow(req: Request<IdParams>, res: Response) {
  res.json(await followService.unfollow(req.user!, req.params.id));
}

export async function following(req: Request<IdParams>, res: Response) {
  res.json(await followService.listFollowing(req.user!, req.params.id, req.query));
}

export async function feed(req: Request, res: Response) {
  res.json(await followService.feed(req.user!, req.query));
}
