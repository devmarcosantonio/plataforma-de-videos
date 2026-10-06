import type { Request, Response } from 'express';
import * as reactionService from '../services/reaction.service.js';

type IdParams = { id: string };

export async function show(req: Request<IdParams>, res: Response) {
  res.json(await reactionService.getReactionStatus(req.user, req.params.id));
}

export async function update(req: Request<IdParams>, res: Response) {
  res.json(await reactionService.setReaction(req.user!, req.params.id, req.body ?? {}));
}

export async function destroy(req: Request<IdParams>, res: Response) {
  res.json(await reactionService.removeReaction(req.user!, req.params.id));
}
