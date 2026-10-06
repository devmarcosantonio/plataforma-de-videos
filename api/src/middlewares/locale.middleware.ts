import type { NextFunction, Request, Response } from 'express';
import { negotiateLocale, type Locale } from '../i18n/messages.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // Idioma das mensagens desta requisição (Accept-Language).
      locale: Locale;
    }
  }
}

export function detectLocale(req: Request, res: Response, next: NextFunction) {
  req.locale = negotiateLocale(req.headers['accept-language']);
  // A resposta varia conforme o idioma: caches intermediários precisam saber disso.
  res.vary('Accept-Language');
  next();
}
