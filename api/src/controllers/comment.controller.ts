import type { Request, Response } from 'express';
import * as commentService from '../services/comment.service.js';

type IdParams = { id: string };

export async function index(req: Request<IdParams>, res: Response) {
  res.json(await commentService.listComments(req.params.id, req.query));
}

export async function store(req: Request<IdParams>, res: Response) {
  res.status(201).json(await commentService.createComment(req.user!, req.params.id, req.body ?? {}));
}

export async function replies(req: Request<IdParams>, res: Response) {
  res.json(await commentService.listReplies(req.params.id, req.query));
}

export async function update(req: Request<IdParams>, res: Response) {
  res.json(await commentService.updateComment(req.user!, req.params.id, req.body ?? {}));
}

export async function destroy(req: Request<IdParams>, res: Response) {
  await commentService.deleteComment(req.user!, req.params.id);
  res.status(204).send();
}
