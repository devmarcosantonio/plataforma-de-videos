import { z } from 'zod';
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
  .string({ error: 'O nome de usuário é obrigatório' })
  .trim()
  .toLowerCase()
  .pipe(
    z
      .string()
      .min(3, 'O nome de usuário deve ter pelo menos 3 caracteres')
      .max(30, 'O nome de usuário pode ter no máximo 30 caracteres')
      .regex(/^[a-z0-9._]+$/, 'Use apenas letras minúsculas, números, ponto e underline')
      .regex(/^[a-z0-9]/, 'O nome de usuário deve começar com letra ou número')
      .refine((value) => !value.includes('..'), 'O nome de usuário não pode ter dois pontos seguidos')
      .refine((value) => !value.endsWith('.'), 'O nome de usuário não pode terminar com ponto')
      .refine((value) => !RESERVED_USERNAMES.has(value), 'Este nome de usuário é reservado'),
  );

export const createUserSchema = z.object({
  username: usernameSchema,
  name: z.string({ error: 'O nome é obrigatório' }).trim().min(1, 'O nome é obrigatório'),
  last_name: z
    .string({ error: 'O sobrenome é obrigatório' })
    .trim()
    .min(1, 'O sobrenome é obrigatório'),
  email: z
    .string({ error: 'O e-mail é obrigatório' })
    .trim()
    .toLowerCase()
    .pipe(z.email('E-mail inválido')),
  password: z
    .string({ error: 'A senha é obrigatória' })
    .min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

export const updateUserSchema = createUserSchema.partial();

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
