import { jwtVerify, SignJWT } from 'jose';
import { env } from '../config/env.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ALGORITHM = 'HS256';

export const TOKEN_MAX_AGE_SECONDS = env.JWT_EXPIRES_IN_DAYS * 24 * 60 * 60;

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_EXPIRES_IN_DAYS}d`)
    .sign(secret);
}

// Devolve o id do usuário, ou null se o token for inválido ou estiver expirado.
export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALGORITHM] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
