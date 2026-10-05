import { AppError } from '../utils/errors/app-error.js';
import {
  UserModel,
  createUserSchema,
  updateUserSchema,
  usernameSchema,
  type PublicUser,
  type User,
} from '../models/user.model.js';
import { hashPassword } from '../utils/password.js';
import { deleteCommentsByUser } from './comment.service.js';

function toPublic({ password_hash, ...user }: User): PublicUser {
  return user;
}

export async function listUsers(): Promise<PublicUser[]> {
  const users = await UserModel.findAll();
  return users.map(toPublic);
}

export async function getUser(id: string): Promise<PublicUser> {
  const user = await UserModel.findById(id);
  if (!user) throw new AppError('Usuário não encontrado', 404);
  return toPublic(user);
}

// Perfil público (página de canal): sem e-mail.
export async function getUserByUsername(username: string) {
  const user = await UserModel.findByUsername(username.trim().toLowerCase());
  if (!user) throw new AppError('Usuário não encontrado', 404);
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    last_name: user.last_name,
    created_at: user.created_at,
  };
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

export async function createUser(input: unknown): Promise<PublicUser> {
  const { password, ...data } = createUserSchema.parse(input);
  await ensureUniqueFields(data);

  const user = await UserModel.create({
    ...data,
    password_hash: await hashPassword(password),
  });
  return toPublic(user);
}

export async function updateUser(id: string, input: unknown): Promise<PublicUser> {
  const { password, ...data } = updateUserSchema.parse(input);

  if (!(await UserModel.findById(id))) {
    throw new AppError('Usuário não encontrado', 404);
  }

  await ensureUniqueFields(data, id);

  const user = await UserModel.update(id, {
    ...data,
    ...(password !== undefined && { password_hash: await hashPassword(password) }),
  });
  return toPublic(user);
}

export async function deleteUser(id: string): Promise<void> {
  if (!(await UserModel.findById(id))) throw new AppError('Usuário não encontrado', 404);

  if ((await UserModel.countVideos(id)) > 0) {
    throw new AppError('O usuário possui vídeos. Remova os vídeos antes de apagar a conta', 409);
  }

  // Comentários seguem a regra de remoção; likes saem em cascata no banco.
  await deleteCommentsByUser(id);
  await UserModel.delete(id);
}
