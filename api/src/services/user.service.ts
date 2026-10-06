import { AppError } from '../utils/errors/app-error.js';
import {
  UserModel,
  createUserSchema,
  updateUserSchema,
  usernameSchema,
  type User,
} from '../models/user.model.js';
import { hashPassword } from '../utils/password.js';
import { deleteCommentsByUser } from './comment.service.js';

// O que qualquer pessoa pode ver de um usuário (sem e-mail).
export type PublicProfile = Pick<User, 'id' | 'username' | 'name' | 'last_name' | 'created_at'>;

// O que o próprio usuário vê da conta dele (sem o hash da senha).
export type PrivateUser = Omit<User, 'password_hash'>;

export function toPublicProfile(user: User): PublicProfile {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    last_name: user.last_name,
    created_at: user.created_at,
  };
}

export function toPrivate({ password_hash, ...user }: User): PrivateUser {
  return user;
}

function ensureSelf(actor: User, id: string) {
  if (actor.id !== id) throw new AppError('Você só pode alterar a sua própria conta', 403);
}

export async function listUsers(): Promise<PublicProfile[]> {
  const users = await UserModel.findAll();
  return users.map(toPublicProfile);
}

export async function getUser(id: string): Promise<PublicProfile> {
  const user = await UserModel.findById(id);
  if (!user) throw new AppError('Usuário não encontrado', 404);
  return toPublicProfile(user);
}

export async function getUserByUsername(username: string): Promise<PublicProfile> {
  const user = await UserModel.findByUsername(username.trim().toLowerCase());
  if (!user) throw new AppError('Usuário não encontrado', 404);
  return toPublicProfile(user);
}

// Para o formulário avisar enquanto a pessoa digita: formato inválido não é erro, é "indisponível".
export async function checkUsernameAvailability(
  query: unknown,
): Promise<{ username: string; available: boolean; message: string | null }> {
  const raw = typeof (query as { username?: unknown })?.username === 'string'
    ? (query as { username: string }).username
    : '';
  const parsed = usernameSchema.safeParse(raw);
  const username = raw.trim().toLowerCase();

  if (!parsed.success) {
    return { username, available: false, message: parsed.error.issues[0].message };
  }
  if (await UserModel.findByUsername(parsed.data)) {
    return { username: parsed.data, available: false, message: 'Nome de usuário já está em uso' };
  }
  return { username: parsed.data, available: true, message: null };
}

async function ensureUniqueFields(data: { email?: string; username?: string }, currentId?: string) {
  if (data.email !== undefined) {
    const existing = await UserModel.findByEmail(data.email);
    if (existing && existing.id !== currentId) throw new AppError('E-mail já cadastrado', 409);
  }
  if (data.username !== undefined) {
    const existing = await UserModel.findByUsername(data.username);
    if (existing && existing.id !== currentId) throw new AppError('Nome de usuário já está em uso', 409);
  }
}

// Usado pelo cadastro (POST /auth/register).
export async function createUser(input: unknown): Promise<PrivateUser> {
  const { password, ...data } = createUserSchema.parse(input);
  await ensureUniqueFields(data);

  const user = await UserModel.create({
    ...data,
    password_hash: await hashPassword(password),
  });
  return toPrivate(user);
}

export async function updateUser(actor: User, id: string, input: unknown): Promise<PrivateUser> {
  ensureSelf(actor, id);
  const { password, ...data } = updateUserSchema.parse(input);
  await ensureUniqueFields(data, id);

  const user = await UserModel.update(id, {
    ...data,
    ...(password !== undefined && { password_hash: await hashPassword(password) }),
  });
  return toPrivate(user);
}

export async function deleteUser(actor: User, id: string): Promise<void> {
  ensureSelf(actor, id);

  if ((await UserModel.countVideos(id)) > 0) {
    throw new AppError('Você possui vídeos. Remova os vídeos antes de apagar a conta', 409);
  }

  // Comentários seguem a regra de remoção; reações saem em cascata no banco.
  await deleteCommentsByUser(id);
  await UserModel.delete(id);
}
