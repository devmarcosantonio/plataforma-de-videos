import { env } from '../config/env.js';
import {
  approveSchema,
  changeRoleSchema,
  logListSchema,
  ModerationModel,
  rejectSchema,
  requestListSchema,
  userListSchema,
} from '../models/moderation.model.js';
import {
  activeWhere,
  applyRestrictionSchema,
  DURATIONS,
  RestrictionModel,
  revokeRestrictionSchema,
  type RestrictionType,
} from '../models/restriction.model.js';
import { UserModel, type User } from '../models/user.model.js';
import { decodeCursor, encodeCursor } from '../utils/cursor.js';
import { AppError } from '../utils/errors/app-error.js';
import { hasPermission, outranks } from '../utils/permissions.js';
import { computeAccess } from './access.service.js';
import { casesAgainstUser, openSummary as openReportsSummary } from './report.service.js';

const nextCursor = (hasMore: boolean, last: { created_at: Date; id: string } | undefined) =>
  hasMore && last ? encodeCursor({ created_at: last.created_at.toISOString(), id: last.id }) : null;

async function findTargetOrFail(id: string): Promise<User> {
  const user = await UserModel.findById(id);
  if (!user) throw new AppError('USER_NOT_FOUND', 404);
  return user;
}

// ---------- Solicitações ----------

export async function listRequests(query: unknown) {
  const { status, cursor, limit } = requestListSchema.parse(query);
  const page = await ModerationModel.listRequests(status, cursor ? decodeCursor(cursor) : undefined, limit);
  return { items: page.items, next_cursor: nextCursor(page.hasMore, page.items.at(-1)) };
}

async function review(actor: User, requestId: string, decision: 'approved' | 'rejected', note: string | undefined) {
  const request = await ModerationModel.findRequest(requestId);
  if (!request) throw new AppError('UPLOAD_REQUEST_NOT_FOUND', 404);
  if (request.status !== 'pending') throw new AppError('UPLOAD_REQUEST_ALREADY_REVIEWED', 409);
  // Ninguém analisa o próprio pedido.
  if (request.user_id === actor.id) throw new AppError('FORBIDDEN', 403);

  const retryAt =
    decision === 'rejected' ? new Date(Date.now() + env.UPLOAD_REQUEST_COOLDOWN_MINUTES * 60 * 1000).toISOString() : null;
  try {
    await ModerationModel.reviewRequest(actor, request, decision, note, {
      request_id: request.id,
      ...(note && { note }),
      ...(retryAt && { retry_at: retryAt }),
    });
  } catch (error) {
    if ((error as Error).message === 'ALREADY_REVIEWED') throw new AppError('UPLOAD_REQUEST_ALREADY_REVIEWED', 409);
    throw error;
  }
  return ModerationModel.findRequest(request.id);
}

export async function approveRequest(actor: User, requestId: string, input: unknown) {
  const { note } = approveSchema.parse(input);
  return review(actor, requestId, 'approved', note);
}

export async function rejectRequest(actor: User, requestId: string, input: unknown) {
  const { note } = rejectSchema.parse(input);
  return review(actor, requestId, 'rejected', note);
}

// ---------- Permissão de publicar (direto, sem pedido) ----------

export async function grantUploadAccess(actor: User, userId: string, input: unknown) {
  const { note } = approveSchema.parse(input);
  const target = await findTargetOrFail(userId);
  if (!outranks(actor, target)) throw new AppError('CANNOT_ACT_ON_SAME_OR_HIGHER_ROLE', 403);
  if (!(await ModerationModel.hasApprovedRequest(target.id))) await ModerationModel.grantUploadAccess(actor, target, note);
  return { access: await accessOf(target) };
}

// ---------- Restrições ----------

export async function applyRestriction(actor: User, userId: string, input: unknown) {
  const data = applyRestrictionSchema.parse(input);
  const target = await findTargetOrFail(userId);
  if (!outranks(actor, target)) throw new AppError('CANNOT_ACT_ON_SAME_OR_HIGHER_ROLE', 403);

  // Banimento vale sozinho (já bloqueia tudo) e é sempre permanente.
  const banning = data.types.includes('ban');
  const types: RestrictionType[] = banning ? ['ban'] : data.types;
  const permanent = banning || data.duration === 'permanent';
  if (banning && !hasPermission(actor, 'restriction:ban')) throw new AppError('RESTRICTION_NOT_ALLOWED', 403);
  if (permanent && !hasPermission(actor, 'restriction:apply_permanent')) throw new AppError('RESTRICTION_NOT_ALLOWED', 403);

  const ms = DURATIONS[data.duration];
  const expiresAt = permanent || ms === null ? null : new Date(Date.now() + ms);
  await RestrictionModel.apply(actor, target, types, expiresAt, data.reason);
  return { access: await accessOf(target) };
}

export async function revokeRestriction(actor: User, restrictionId: string, input: unknown) {
  const { reason } = revokeRestrictionSchema.parse(input);
  const restriction = await RestrictionModel.findById(restrictionId);
  if (!restriction) throw new AppError('RESTRICTION_NOT_FOUND', 404);
  if (restriction.revoked_at) throw new AppError('RESTRICTION_ALREADY_REVOKED', 409);

  const target = await findTargetOrFail(restriction.user_id);
  if (!outranks(actor, target)) throw new AppError('CANNOT_ACT_ON_SAME_OR_HIGHER_ROLE', 403);
  // Desfazer exige o mesmo poder de aplicar.
  if (restriction.type === 'ban' && !hasPermission(actor, 'restriction:ban')) throw new AppError('RESTRICTION_NOT_ALLOWED', 403);
  if (!restriction.expires_at && !hasPermission(actor, 'restriction:apply_permanent')) {
    throw new AppError('RESTRICTION_NOT_ALLOWED', 403);
  }

  try {
    await RestrictionModel.revoke(actor, restriction, reason);
  } catch (error) {
    if ((error as Error).message === 'ALREADY_REVOKED') throw new AppError('RESTRICTION_ALREADY_REVOKED', 409);
    throw error;
  }
  return { access: await accessOf(target) };
}

// Acesso calculado na hora (sem o cache por requisição, que pode ter ficado para trás após a ação).
async function accessOf(user: User) {
  const [active, approved] = await Promise.all([RestrictionModel.active(user.id), ModerationModel.hasApprovedRequest(user.id)]);
  return computeAccess(user, approved, active);
}

// ---------- Papéis (só admin) ----------

export async function changeRole(actor: User, userId: string, input: unknown) {
  const { role } = changeRoleSchema.parse(input);
  if (actor.id === userId) throw new AppError('CANNOT_CHANGE_OWN_ROLE', 403);
  const target = await findTargetOrFail(userId);
  // Um admin não rebaixa outro admin pelo painel (evita disputa); isso fica para o script de terminal.
  if (!outranks(actor, target)) throw new AppError('CANNOT_ACT_ON_SAME_OR_HIGHER_ROLE', 403);
  if (target.role === role) return { id: target.id, role };
  const updated = await ModerationModel.changeRole(actor, target, role);
  return { id: updated.id, role: updated.role };
}

// ---------- Painel ----------

export async function listUsers(query: unknown) {
  const { q, role, cursor, limit } = userListSchema.parse(query);
  const page = await ModerationModel.listUsers({ q, role }, cursor ? decodeCursor(cursor) : undefined, limit, activeWhere());
  return {
    items: page.items.map(({ _count, restrictions, upload_requests, ...user }) => ({
      ...user,
      videos_count: _count.videos,
      access: computeAccess(user, upload_requests.length > 0, restrictions),
    })),
    next_cursor: nextCursor(page.hasMore, page.items.at(-1)),
  };
}

// Tudo sobre uma pessoa: acessos, restrições (com situação), pedidos e o que a moderação fez com ela.
export async function getUserDetails(userId: string) {
  const target = await findTargetOrFail(userId);
  const now = new Date();
  const [access, restrictions, requests, logs, videos_count, reports] = await Promise.all([
    accessOf(target),
    RestrictionModel.listByUser(target.id),
    ModerationModel.listRequestsByUser(target.id),
    ModerationModel.listLogs({ targetUserId: target.id }, undefined, 30),
    UserModel.countVideos(target.id),
    casesAgainstUser(target.id),
  ]);
  return {
    user: {
      id: target.id,
      username: target.username,
      display_name: target.display_name,
      email: target.email,
      role: target.role,
      created_at: target.created_at,
      videos_count,
    },
    access,
    restrictions: restrictions.map((item) => ({
      ...item,
      status: item.revoked_at ? 'revoked' : item.expires_at && item.expires_at <= now ? 'expired' : 'active',
    })),
    requests,
    reports,
    logs: logs.items,
  };
}

// Admin vê tudo; moderador vê só as próprias ações.
export async function listLogs(actor: User, query: unknown) {
  const { cursor, limit } = logListSchema.parse(query);
  const onlyMine = hasPermission(actor, 'moderation_log:view_all') ? undefined : actor.id;
  const page = await ModerationModel.listLogs({ actorId: onlyMine }, cursor ? decodeCursor(cursor) : undefined, limit);
  return { items: page.items, next_cursor: nextCursor(page.hasMore, page.items.at(-1)) };
}

export async function summary() {
  const [pending_requests, reports] = await Promise.all([ModerationModel.countPending(), openReportsSummary()]);
  // oldest_open_report_at: há quanto tempo o caso mais antigo espera (mostra se a moderação está dando conta).
  return { pending_requests, open_reports: reports.count, oldest_open_report_at: reports.oldest };
}
