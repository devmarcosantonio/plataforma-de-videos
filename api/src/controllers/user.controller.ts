import type { Request, Response } from 'express';
import { clearAuthCookie } from '../middlewares/auth.middleware.js';
import * as userService from '../services/user.service.js';

type IdParams = { id: string };

export async function index(req: Request, res: Response) {
  res.json(await userService.listUsers());
}

export async function show(req: Request<IdParams>, res: Response) {
  res.json(await userService.getUser(req.params.id));
}

export async function showByUsername(req: Request<{ username: string }>, res: Response) {
  res.json(await userService.getUserByUsername(req.user, req.params.username));
}

export async function usernameAvailable(req: Request, res: Response) {
  res.json(await userService.checkUsernameAvailability(req.query));
}

export async function update(req: Request<IdParams>, res: Response) {
  res.json(await userService.updateUser(req.user!, req.params.id, req.body ?? {}));
}

export async function destroy(req: Request<IdParams>, res: Response) {
  await userService.deleteUser(req.user!, req.params.id);
  // A conta não existe mais: encerra a sessão.
  clearAuthCookie(res);
  res.status(204).send();
}
