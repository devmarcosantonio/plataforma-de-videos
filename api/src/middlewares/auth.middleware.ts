import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { UserModel, type User } from '../models/user.model.js';
import { getAccess, isBanned } from '../services/access.service.js';
import { AppError } from '../utils/errors/app-error.js';
import { TOKEN_MAX_AGE_SECONDS, verifyToken } from '../utils/jwt.js';

export const AUTH_COOKIE = 'token';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // Preenchido pelo middleware authenticate quando há um token válido.
      user?: User;
    }
  }
}

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

// O token pode vir do cabeçalho Authorization (Next no servidor) ou do cookie (navegador).
function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return readCookie(req.headers.cookie, AUTH_COOKIE);
}

// Identifica o usuário quando há token, sem bloquear quem não está logado.
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const userId = await verifyToken(token);
    const user = userId ? await UserModel.findById(userId) : null;
    // Conta banida: o token deixa de valer (a pessoa passa a ser tratada como visitante).
    req.user = user && !isBanned(await getAccess(user)) ? user : undefined;
  }
  next();
}

// Bloqueia a rota para quem não está logado.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    next(new AppError('AUTH_REQUIRED', 401));
    return;
  }
  next();
}

// httpOnly: o JavaScript da página não lê o token (protege contra XSS).
// SameSite=Lax: o navegador não envia o cookie em requisições vindas de outros sites (protege contra CSRF).
export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: TOKEN_MAX_AGE_SECONDS * 1000,
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, { httpOnly: true, sameSite: 'lax', secure: env.NODE_ENV === 'production', path: '/' });
}
