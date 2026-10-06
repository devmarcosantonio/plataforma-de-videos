import { isMessageCode, translate, type Locale, type MessageCode } from '../i18n/messages.js';
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
import { profileStats } from './follow.service.js';

// O que qualquer pessoa pode ver de um usuário (sem e-mail).
export type PublicProfile = Pick<User, 'id' | 'username' | 'display_name' | 'created_at'>;

// O que o próprio usuário vê da conta dele (sem o hash da senha).
export type PrivateUser = Omit<User, 'password_hash'>;

export function toPublicProfile(user: User): PublicProfile {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    created_at: user.created_at,
  };
}

export function toPrivate({ password_hash, ...user }: User): PrivateUser {
  return user;
}

function ensureSelf(actor: User, id: string) {
  if (actor.id !== id) throw new AppError('ACCOUNT_FORBIDDEN', 403);
}

export async function listUsers(): Promise<PublicProfile[]> {
  const users = await UserModel.findAll();
  return users.map(toPublicProfile);
}

export async function getUser(id: string): Promise<PublicProfile> {
  const user = await UserModel.findById(id);
  if (!user) throw new AppError('USER_NOT_FOUND', 404);
  return toPublicProfile(user);
}

// Página do canal: perfil público + números (seguidores, seguindo, vídeos) + "is_following".
export async function getUserByUsername(actor: User | undefined, username: string) {
  const user = await UserModel.findByUsername(username.trim().toLowerCase().replace(/^@/, ''));
  if (!user) throw new AppError('USER_NOT_FOUND', 404);
  return { ...toPublicProfile(user), ...(await profileStats(actor, user.id)) };
}

// Para o formulário avisar enquanto a pessoa digita: formato inválido não é erro, é "indisponível".
export async function checkUsernameAvailability(
  locale: Locale,
  query: unknown,
): Promise<{ username: string; available: boolean; code: MessageCode | null; message: string | null }> {
  const raw = typeof (query as { username?: unknown })?.username === 'string'
    ? (query as { username: string }).username
    : '';
  const parsed = usernameSchema.safeParse(raw);
  const username = raw.trim().toLowerCase();

  if (!parsed.success) {
    const issue = parsed.error.issues[0].message;
    const code = isMessageCode(issue) ? issue : 'INVALID_VALUE';
    return { username, available: false, code, message: translate(locale, code) };
  }
  if (await UserModel.findByUsername(parsed.data)) {
    return { username: parsed.data, available: false, code: 'USERNAME_TAKEN', message: translate(locale, 'USERNAME_TAKEN') };
  }
  return { username: parsed.data, available: true, code: null, message: null };
}

async function ensureUniqueFields(data: { email?: string; username?: string }, currentId?: string) {
  if (data.email !== undefined) {
    const existing = await UserModel.findByEmail(data.email);
    if (existing && existing.id !== currentId) throw new AppError('EMAIL_TAKEN', 409);
  }
  if (data.username !== undefined) {
    const existing = await UserModel.findByUsername(data.username);
    if (existing && existing.id !== currentId) throw new AppError('USERNAME_TAKEN', 409);
  }
}

// Usado pelo cadastro (POST /auth/register).
export async function createUser(input: unknown): Promise<PrivateUser> {
  const { password, ...data } = createUserSchema.parse(input);
  await ensureUniqueFields(data);

  const user = await UserModel.create({
    ...data,
    display_name: data.display_name ?? data.username,
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
    throw new AppError('ACCOUNT_HAS_VIDEOS', 409);
  }

  // Comentários seguem a regra de remoção; reações saem em cascata no banco.
  await deleteCommentsByUser(id);
  await UserModel.delete(id);
}
