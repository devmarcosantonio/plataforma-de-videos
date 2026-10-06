import type { RestrictionType, UserRestriction } from '../models/restriction.model.js';
import { RestrictionModel } from '../models/restriction.model.js';
import { ModerationModel } from '../models/moderation.model.js';
import type { User } from '../models/user.model.js';
import type { MessageCode } from '../i18n/messages.js';
import { AppError } from '../utils/errors/app-error.js';
import { hasPermission } from '../utils/permissions.js';

// O que a pessoa pode fazer agora. Não é gravado: é calculado a partir da aprovação (upload_requests),
// do papel e das restrições ativas, então está sempre certo (inclusive quando uma restrição vence).
export type AccessKey = 'upload' | 'comment' | 'react' | 'follow';

export interface ActiveRestriction {
  id: string;
  type: RestrictionType;
  until: Date | null;
  reason: string;
}

export interface Access {
  can_upload: boolean;
  can_comment: boolean;
  can_react: boolean;
  can_follow: boolean;
  // Por que não pode publicar: falta aprovação ou há restrição (nulo = pode).
  upload_blocked_by: 'approval' | 'restriction' | null;
  restrictions: ActiveRestriction[];
}

// Quais restrições bloqueiam cada acesso. Suspensão e banimento bloqueiam tudo.
const BLOCKED_BY: Record<AccessKey, readonly RestrictionType[]> = {
  upload: ['upload', 'suspend', 'ban'],
  comment: ['comment', 'suspend', 'ban'],
  react: ['react', 'suspend', 'ban'],
  follow: ['suspend', 'ban'],
};

const DENIED_CODE: Record<AccessKey, MessageCode> = {
  upload: 'RESTRICTED_UPLOAD',
  comment: 'RESTRICTED_COMMENT',
  react: 'RESTRICTED_REACT',
  follow: 'ACCOUNT_SUSPENDED',
};

const blocks = (restrictions: ActiveRestriction[], key: AccessKey) =>
  restrictions.some((restriction) => BLOCKED_BY[key].includes(restriction.type));

export function computeAccess(
  user: Pick<User, 'role'>,
  approved: boolean,
  active: Pick<UserRestriction, 'id' | 'type' | 'expires_at' | 'reason'>[],
): Access {
  const restrictions = active.map((item) => ({ id: item.id, type: item.type, until: item.expires_at, reason: item.reason }));
  const mayPublish = approved || hasPermission(user, 'video:publish_without_approval');
  const uploadRestricted = blocks(restrictions, 'upload');
  return {
    can_upload: mayPublish && !uploadRestricted,
    can_comment: !blocks(restrictions, 'comment'),
    can_react: !blocks(restrictions, 'react'),
    can_follow: !blocks(restrictions, 'follow'),
    // A punição tem prioridade: enquanto durar, não adianta pedir aprovação.
    upload_blocked_by: uploadRestricted ? 'restriction' : mayPublish ? null : 'approval',
    restrictions,
  };
}

export function isBanned(access: Access): boolean {
  return access.restrictions.some((restriction) => restriction.type === 'ban');
}

// Um cálculo por objeto de usuário: o mesmo pedido HTTP pode consultar o acesso várias vezes.
const cache = new WeakMap<User, Promise<Access>>();

export function getAccess(user: User): Promise<Access> {
  let access = cache.get(user);
  if (!access) {
    access = Promise.all([RestrictionModel.active(user.id), ModerationModel.hasApprovedRequest(user.id)]).then(
      ([active, approved]) => computeAccess(user, approved, active),
    );
    cache.set(user, access);
  }
  return access;
}

// Usado antes de cada ação: comentar, publicar, reagir, seguir.
export async function ensureAccess(user: User, key: AccessKey): Promise<void> {
  const access = await getAccess(user);
  if (key === 'upload' && access.upload_blocked_by === 'approval') throw new AppError('UPLOAD_NOT_ALLOWED', 403);
  if (!blocks(access.restrictions, key)) return;
  const suspended = access.restrictions.some((restriction) => restriction.type === 'suspend');
  throw new AppError(suspended ? 'ACCOUNT_SUSPENDED' : DENIED_CODE[key], 403);
}
