import { env } from '../config/env.js';
import { createUploadRequestSchema, ModerationModel, type UploadRequest } from '../models/moderation.model.js';
import type { User } from '../models/user.model.js';
import { AppError } from '../utils/errors/app-error.js';
import { ensureAccess, getAccess } from './access.service.js';

const COOLDOWN_MS = () => env.UPLOAD_REQUEST_COOLDOWN_MINUTES * 60 * 1000;

// Depois de uma recusa, quando a pessoa pode pedir de novo (nulo = já pode).
function retryAt(request: UploadRequest | null): Date | null {
  if (!request || request.status !== 'rejected' || !request.reviewed_at) return null;
  const at = new Date(request.reviewed_at.getTime() + COOLDOWN_MS());
  return at > new Date() ? at : null;
}

function toPublic(request: UploadRequest | null) {
  if (!request) return null;
  return {
    id: request.id,
    status: request.status,
    message: request.message,
    portfolio_url: request.portfolio_url,
    review_note: request.review_note,
    created_at: request.created_at,
    reviewed_at: request.reviewed_at,
  };
}

// Situação da pessoa: pode publicar? por que não? qual o último pedido? quando pode pedir de novo?
export async function getUploadAccess(actor: User) {
  const [access, request] = await Promise.all([getAccess(actor), ModerationModel.latestRequest(actor.id)]);
  return {
    can_upload: access.can_upload,
    blocked_by: access.upload_blocked_by,
    // Restrições que impedem publicar (para mostrar prazo e motivo).
    restrictions: access.restrictions.filter((item) => ['upload', 'suspend', 'ban'].includes(item.type)),
    request: toPublic(request),
    retry_at: retryAt(request),
  };
}

export async function createRequest(actor: User, input: unknown) {
  const data = createUploadRequestSchema.parse(input);
  const access = await getAccess(actor);
  // Punido: o pedido só faz sentido quando a restrição acabar.
  if (access.upload_blocked_by === 'restriction') await ensureAccess(actor, 'upload');
  if (access.upload_blocked_by === null) throw new AppError('UPLOAD_ALREADY_ALLOWED', 409);

  const latest = await ModerationModel.latestRequest(actor.id);
  if (latest?.status === 'pending') throw new AppError('UPLOAD_REQUEST_PENDING', 409);
  if (retryAt(latest)) throw new AppError('UPLOAD_REQUEST_COOLDOWN', 429);

  try {
    await ModerationModel.createRequest(actor, data);
  } catch (error) {
    // Duas requisições simultâneas: o índice único parcial garante só uma pendente.
    if ((error as { code?: string }).code === 'P2002') throw new AppError('UPLOAD_REQUEST_PENDING', 409);
    throw error;
  }
  return getUploadAccess(actor);
}

export async function cancelRequest(actor: User) {
  const cancelled = await ModerationModel.cancelPending(actor.id);
  if (!cancelled) throw new AppError('UPLOAD_REQUEST_NOT_FOUND', 404);
  return getUploadAccess(actor);
}

// Usado antes de criar vídeo / gerar credenciais de envio.
export function ensureCanUpload(actor: User): Promise<void> {
  return ensureAccess(actor, 'upload');
}
