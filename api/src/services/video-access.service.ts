import type { User } from '../models/user.model.js';
import { VideoModel, type Video } from '../models/video.model.js';
import { AppError } from '../utils/errors/app-error.js';
import { hasPermission } from '../utils/permissions.js';

type Visibility = Pick<Video, 'user_id' | 'visibility' | 'moderation_status'>;

// Público e ativo: todos veem. Privado, em revisão ou removido: só o dono e a moderação.
export function canViewVideo(video: Visibility, actor: User | undefined): boolean {
  if (video.visibility === 'public' && video.moderation_status === 'active') return true;
  return !!actor && (actor.id === video.user_id || hasPermission(actor, 'report:review'));
}

// Para assistir, comentar, reagir e salvar progresso. Quem não pode ver recebe "não encontrado"
// (não revela que o vídeo existe). Conteúdo de conta banida não aparece para ninguém.
export async function findViewableOrFail(id: string, actor: User | undefined): Promise<Video> {
  const video = await VideoModel.findByIdExceptBanned(id);
  if (!video || !canViewVideo(video, actor)) throw new AppError('VIDEO_NOT_FOUND', 404);
  return video;
}
