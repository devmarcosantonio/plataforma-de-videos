import type { NextFunction, Request, Response } from 'express';
import type { User, UserRole } from '../generated/prisma/client.js';
import { AppError } from './errors/app-error.js';

// O que cada papel pode fazer. Regras de "dono" (editar o próprio vídeo etc.) continuam nos services;
// o papel só acrescenta poderes.
const PERMISSIONS = {
  // Publicar sem precisar de aprovação.
  'video:publish_without_approval': ['moderator', 'admin'],
  // Analisar pedidos de permissão para publicar.
  'upload_request:review': ['moderator', 'admin'],
  // Liberar a publicação direto pelo painel (sem pedido).
  'upload_access:manage': ['moderator', 'admin'],
  // Restringir (comentar, publicar, reagir, suspender) por até 30 dias, e revogar restrições.
  'restriction:apply': ['moderator', 'admin'],
  // Restrições permanentes e banimento.
  'restriction:apply_permanent': ['admin'],
  'restriction:ban': ['admin'],
  // Analisar denúncias (dispensar, remover conteúdo) e restaurar vídeos removidos.
  'report:review': ['moderator', 'admin'],
  // Decidir denúncias contra o próprio conteúdo (fica marcado no registro). Moderador não pode.
  'report:review_own': ['admin'],
  // Remover (soft delete, reversível) e restaurar vídeos e comentários de outras pessoas.
  'content:remove': ['moderator', 'admin'],
  'content:restore': ['moderator', 'admin'],
  // Exclusão permanente (delete real) de conteúdo de outras pessoas, depois de removido.
  'content:purge': ['admin'],
  // Ver usuários e o painel de moderação.
  'admin:access': ['moderator', 'admin'],
  // Trocar o papel das pessoas e ver todo o log de moderação.
  'user:change_role': ['admin'],
  'moderation_log:view_all': ['admin'],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

const RANK: Record<UserRole, number> = { user: 0, moderator: 1, admin: 2 };

export function hasPermission(user: Pick<User, 'role'> | undefined, permission: Permission): boolean {
  return !!user && (PERMISSIONS[permission] as readonly UserRole[]).includes(user.role);
}

// Hierarquia: só age sobre quem está em um nível abaixo.
export function outranks(actor: Pick<User, 'role'>, target: Pick<User, 'role'>): boolean {
  return RANK[actor.role] > RANK[target.role];
}

// Middleware de rota: exige login (antes) e a permissão indicada.
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!hasPermission(req.user, permission)) {
      next(new AppError('FORBIDDEN', 403));
      return;
    }
    next();
  };
}
