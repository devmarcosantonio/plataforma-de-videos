import { z } from 'zod';
import { LOCALES } from '../i18n/messages.js';
import { prisma } from '../config/database.js';
import type { Prisma, User } from '../generated/prisma/client.js';

export type { User };
export type PublicUser = Omit<User, 'password_hash'>;

// Nomes que não podem virar @username (rotas do site e termos que confundem usuários).
const RESERVED_USERNAMES = new Set([
  'admin', 'administrador', 'api', 'app', 'auth', 'comments', 'config', 'conta', 'dashboard', 'explore',
  'explorar', 'help', 'historico', 'history', 'home', 'inicio', 'login', 'logout', 'me', 'moderador',
  'null', 'playlists', 'root', 'settings', 'signin', 'signup', 'staff', 'suporte', 'support', 'system',
  'undefined', 'upload', 'users', 'videos', 'watch', 'webhooks',
]);

export const usernameSchema = z
  .string({ error: 'USERNAME_REQUIRED' })
  .trim()
  .toLowerCase()
  .pipe(
    z
      .string()
      .min(3, 'USERNAME_TOO_SHORT')
      .max(30, 'USERNAME_TOO_LONG')
      .regex(/^[a-z0-9._]+$/, 'USERNAME_INVALID_CHARS')
      .regex(/^[a-z0-9]/, 'USERNAME_INVALID_START')
      .refine((value) => !value.includes('..'), 'USERNAME_DOUBLE_DOT')
      .refine((value) => !value.endsWith('.'), 'USERNAME_TRAILING_DOT')
      .refine((value) => !RESERVED_USERNAMES.has(value), 'USERNAME_RESERVED'),
  );

const displayName = z
  .string()
  .trim()
  .min(1, 'DISPLAY_NAME_EMPTY')
  .max(50, 'DISPLAY_NAME_TOO_LONG');

export const createUserSchema = z.object({
  username: usernameSchema,
  // Opcional no cadastro: se vier vazio, usa o username.
  display_name: z
    .string()
    .trim()
    .max(50, 'DISPLAY_NAME_TOO_LONG')
    .optional()
    .transform((value) => value || undefined),
  email: z
    .string({ error: 'EMAIL_REQUIRED' })
    .trim()
    .toLowerCase()
    .pipe(z.email('EMAIL_INVALID')),
  // Idioma em que a pessoa se cadastrou (opcional).
  locale: z.enum(LOCALES, { error: 'LOCALE_INVALID' }).optional(),
  password: z
    .string({ error: 'PASSWORD_REQUIRED' })
    .min(8, 'PASSWORD_TOO_SHORT'),
});

export const updateUserSchema = createUserSchema
  .omit({ display_name: true })
  .partial()
  .extend({
    display_name: displayName.optional(),
    locale: z.enum(LOCALES, { error: 'LOCALE_INVALID' }).optional(),
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const UserModel = {
  async findAll(): Promise<User[]> {
    return prisma.user.findMany({ orderBy: { created_at: 'asc' } });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { username } });
  },

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  },

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },

  async countVideos(id: string): Promise<number> {
    return prisma.video.count({ where: { user_id: id } });
  },

  // Likes saem em cascata; comentários ficam com user_id nulo (ON DELETE SET NULL).
  async delete(id: string): Promise<boolean> {
    const { count } = await prisma.user.deleteMany({ where: { id } });
    return count > 0;
  },
};
