import type { Request, Response } from 'express';
import * as userService from '../services/user.service.js';

type IdParams = { id: string };

export async function index(req: Request, res: Response) {
  res.json(await userService.listUsers());
}

export async function show(req: Request<IdParams>, res: Response) {
  res.json(await userService.getUser(req.params.id));
}

export async function showByUsername(req: Request<{ username: string }>, res: Response) {
  res.json(await userService.getUserByUsername(req.params.username));
}

export async function usernameAvailable(req: Request, res: Response) {
  res.json(await userService.checkUsernameAvailability(req.query));
}

export async function store(req: Request, res: Response) {
  const user = await userService.createUser(req.body ?? {});
  res.status(201).json(user);
}

export async function update(req: Request<IdParams>, res: Response) {
  res.json(await userService.updateUser(req.params.id, req.body ?? {}));
}

export async function destroy(req: Request<IdParams>, res: Response) {
  await userService.deleteUser(req.params.id);
  res.status(204).send();
}
