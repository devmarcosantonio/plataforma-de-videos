import { z } from 'zod';
import { UserModel, type User } from '../models/user.model.js';
import { AppError } from '../utils/errors/app-error.js';
import { signToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { createUser, toPrivate, type PrivateUser } from './user.service.js';

const loginSchema = z.object({
  // Aceita e-mail ou @username.
  login: z.string({ error: 'Informe o e-mail ou nome de usuário' }).trim().min(1, 'Informe o e-mail ou nome de usuário'),
  password: z.string({ error: 'Informe a senha' }).min(1, 'Informe a senha'),
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
    throw new AppError('E-mail, usuário ou senha incorretos', 401);
  }

  return { token: await signToken(user.id), user: toPrivate(user) };
}

export function me(user: User): PrivateUser {
  return toPrivate(user);
}
