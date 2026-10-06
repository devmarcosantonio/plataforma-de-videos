import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import type { MessageCode } from '../i18n/messages.js';
import { AppError } from '../utils/errors/app-error.js';

// Limites de tentativas. Os contadores ficam na memória do processo: valem por instância da API e
// zeram ao reiniciar. Com mais de uma instância, troque o store por um compartilhado (ex.: Redis).

const MINUTE = 60 * 1000;

interface LimitOptions {
  // Prefixo do contador (cada limite conta separado).
  name: string;
  windowMs: number;
  limit: number;
  // De quem é o contador (padrão: IP).
  key?: (req: Request) => string;
  // Só conta as tentativas que falharam (ex.: senha errada); acertar não gasta o limite.
  failedOnly?: boolean;
  code?: MessageCode;
}

// IP de quem acessa: vem do proxy confiável (TRUST_PROXY); IPv6 agrupado por sub-rede.
const byIp = (req: Request) => ipKeyGenerator(req.ip ?? 'desconhecido');

function limiter({ name, windowMs, limit, key = byIp, failedOnly = false, code = 'TOO_MANY_REQUESTS' }: LimitOptions) {
  return rateLimit({
    windowMs,
    limit,
    // Cabeçalhos RateLimit/Retry-After padronizados (o cliente sabe quando tentar de novo).
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => `${name}:${key(req)}`,
    skipSuccessfulRequests: failedOnly,
    skip: () => !env.RATE_LIMIT_ENABLED,
    // Erro no formato padrão da API (code + mensagem traduzida).
    handler: (req, res, next) => next(new AppError(code, 429)),
  });
}

// Conta tentada no login (e-mail ou @usuário), normalizada como no login.
const loginIdentifier = (req: Request) => {
  const login: unknown = req.body?.login;
  return typeof login === 'string' && login.trim() ? login.trim().toLowerCase().replace(/^@/, '') : byIp(req);
};

// Login: senha errada conta para a conta tentada (barra quem tenta adivinhar a senha de alguém,
// venha de onde vier) e para o IP (barra quem testa muitas contas).
export const loginByAccount = limiter({
  name: 'login-account',
  windowMs: env.RATE_LIMIT_LOGIN_WINDOW_MINUTES * MINUTE,
  limit: env.RATE_LIMIT_LOGIN_PER_ACCOUNT,
  key: loginIdentifier,
  failedOnly: true,
  code: 'TOO_MANY_LOGIN_ATTEMPTS',
});

export const loginByIp = limiter({
  name: 'login-ip',
  windowMs: env.RATE_LIMIT_LOGIN_WINDOW_MINUTES * MINUTE,
  limit: env.RATE_LIMIT_LOGIN_PER_IP,
  failedOnly: true,
  code: 'TOO_MANY_LOGIN_ATTEMPTS',
});

// Cadastro: contas novas por IP por hora.
export const registerByIp = limiter({
  name: 'register-ip',
  windowMs: 60 * MINUTE,
  limit: env.RATE_LIMIT_REGISTER_PER_HOUR,
});

// Comentários e respostas: por usuário logado (rajada por minuto e total no dia).
const byUser = (req: Request) => req.user?.id ?? byIp(req);

export const commentsPerMinute = limiter({
  name: 'comment-minute',
  windowMs: MINUTE,
  limit: env.RATE_LIMIT_COMMENTS_PER_MINUTE,
  key: byUser,
});

export const commentsPerDay = limiter({
  name: 'comment-day',
  windowMs: 24 * 60 * MINUTE,
  limit: env.RATE_LIMIT_COMMENTS_PER_DAY,
  key: byUser,
});
