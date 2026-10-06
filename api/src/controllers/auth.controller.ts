import type { Request, Response } from 'express';
import { clearAuthCookie, setAuthCookie } from '../middlewares/auth.middleware.js';
import * as authService from '../services/auth.service.js';

export async function register(req: Request, res: Response) {
  const { token, user } = await authService.register(req.body ?? {});
  setAuthCookie(res, token);
  res.status(201).json({ token, user });
}

export async function login(req: Request, res: Response) {
  const { token, user } = await authService.login(req.body ?? {});
  setAuthCookie(res, token);
  res.json({ token, user });
}

export async function logout(req: Request, res: Response) {
  clearAuthCookie(res);
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  res.json(authService.me(req.user!));
}
