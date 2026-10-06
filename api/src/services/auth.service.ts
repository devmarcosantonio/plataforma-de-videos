import { z } from 'zod';
import { UserModel, type User } from '../models/user.model.js';
import { AppError } from '../utils/errors/app-error.js';
import { signToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { getAccess, isBanned, type Access } from './access.service.js';
import { createUser, toPrivate, type PrivateUser } from './user.service.js';

const loginSchema = z.object({
  // Aceita e-mail ou @username.
  login: z.string({ error: 'LOGIN_REQUIRED' }).trim().min(1, 'LOGIN_REQUIRED'),
  password: z.string({ error: 'PASSWORD_REQUIRED' }).min(1, 'PASSWORD_REQUIRED'),
});

const dummyHash = hashPassword('senha-que-nunca-confere');

export interface AuthResult {
  token: string;
  user: PrivateUser;
}

export async function register(input: unknown): Promise<AuthResult> {
  const user = await createUser(input);
  return { token: await signToken(user.id), user };
}

export async function login(input: unknown): Promise<AuthResult> {
  const { login, password } = loginSchema.parse(input);
  const identifier = login.toLowerCase().replace(/^@/, '');

  const user = identifier.includes('@')
    ? await UserModel.findByEmail(identifier)
    : await UserModel.findByUsername(identifier);

  // Mesma mensagem e mesmo custo (sempre calcula um hash) para usuário inexistente e senha errada:
  // não revela quais contas existem, nem pela resposta nem pelo tempo de resposta.
  const valid = await verifyPassword(password, user?.password_hash ?? (await dummyHash));
  if (!user || !valid) {
    throw new AppError('INVALID_CREDENTIALS', 401);
  }
  // Só depois da senha conferida: não revela a quem não sabe a senha que a conta existe e foi banida.
  if (isBanned(await getAccess(user))) throw new AppError('ACCOUNT_BANNED', 403);

  return { token: await signToken(user.id), user: toPrivate(user) };
}

// A própria conta, com os acessos calculados (o que pode fazer agora e por quê).
export async function me(user: User): Promise<PrivateUser & { access: Access }> {
  return { ...toPrivate(user), access: await getAccess(user) };
}
