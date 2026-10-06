import {
  CommentModel,
  createCommentSchema,
  listCommentsQuerySchema,
  updateCommentSchema,
  type Comment,
  type CommentWithRelations,
} from '../models/comment.model.js';
import type { User } from '../models/user.model.js';
import { VideoModel } from '../models/video.model.js';
import { decodeCursor, encodeCursor } from '../utils/cursor.js';
import { AppError } from '../utils/errors/app-error.js';

export interface PublicComment {
  id: string;
  video_id: string;
  parent_id: string | null;
  content: string | null;
  created_at: Date;
  edited_at: Date | null;
  deleted: boolean;
  author: { id: string; username: string; name: string; last_name: string } | null;
  replies_count: number;
}

export interface CommentPage {
  items: PublicComment[];
  next_cursor: string | null;
}

function toPublic(comment: CommentWithRelations): PublicComment {
  const deleted = comment.deleted_at !== null;
  return {
    id: comment.id,
    video_id: comment.video_id,
    parent_id: comment.parent_id,
    content: deleted ? null : comment.content,
    created_at: comment.created_at,
    edited_at: comment.edited_at,
    deleted,
    author: deleted ? null : comment.user,
    replies_count: comment._count.replies,
  };
}

function toPage(result: { items: CommentWithRelations[]; hasMore: boolean }): CommentPage {
  const last = result.items.at(-1);
  return {
    items: result.items.map(toPublic),
    next_cursor:
      result.hasMore && last ? encodeCursor({ created_at: last.created_at.toISOString(), id: last.id }) : null,
  };
}

async function findVideoOrFail(videoId: string) {
  const video = await VideoModel.findById(videoId);
  if (!video) throw new AppError('Vídeo não encontrado', 404);
  return video;
}

async function findCommentOrFail(id: string): Promise<Comment> {
  const comment = await CommentModel.findById(id);
  if (!comment) throw new AppError('Comentário não encontrado', 404);
  return comment;
}

export async function listComments(videoId: string, query: unknown): Promise<CommentPage> {
  const { cursor, limit } = listCommentsQuerySchema.parse(query);
  await findVideoOrFail(videoId);
  return toPage(await CommentModel.listTopLevel(videoId, cursor ? decodeCursor(cursor) : undefined, limit));
}

export async function listReplies(commentId: string, query: unknown): Promise<CommentPage> {
  const { cursor, limit } = listCommentsQuerySchema.parse(query);
  const comment = await findCommentOrFail(commentId);
  if (comment.parent_id !== null) throw new AppError('Respostas não têm respostas próprias');
  return toPage(await CommentModel.listReplies(commentId, cursor ? decodeCursor(cursor) : undefined, limit));
}

export async function createComment(actor: User, videoId: string, input: unknown): Promise<PublicComment> {
  const data = createCommentSchema.parse(input);

  const video = await findVideoOrFail(videoId);
  if (video.status !== 'ready') throw new AppError('Só é possível comentar em vídeos prontos', 409);

  let parentId: string | null = null;
  if (data.parent_id) {
    const parent = await findCommentOrFail(data.parent_id);
    if (parent.video_id !== videoId) throw new AppError('O comentário respondido é de outro vídeo');
    if (parent.deleted_at) throw new AppError('Não é possível responder um comentário removido', 409);
    // Só um nível de respostas: responder uma resposta entra na mesma conversa.
    parentId = parent.parent_id ?? parent.id;
  }

  const comment = await CommentModel.create({
    video_id: videoId,
    user_id: actor.id,
    parent_id: parentId,
    content: data.content,
  });
  return toPublic(comment);
}

export async function updateComment(actor: User, commentId: string, input: unknown): Promise<PublicComment> {
  const data = updateCommentSchema.parse(input);
  const comment = await findCommentOrFail(commentId);

  if (comment.deleted_at) throw new AppError('Comentário não encontrado', 404);
  if (comment.user_id !== actor.id) throw new AppError('Só o autor pode editar o comentário', 403);

  const updated = await CommentModel.update(comment.id, { content: data.content, edited_at: new Date() });
  return toPublic(updated);
}

export async function deleteComment(actor: User, commentId: string): Promise<void> {
  const comment = await findCommentOrFail(commentId);
  if (comment.deleted_at) return;

  const video = await VideoModel.findById(comment.video_id);
  const isAuthor = comment.user_id === actor.id;
  const isVideoOwner = video?.user_id === actor.id;
  if (!isAuthor && !isVideoOwner) {
    throw new AppError('Só o autor ou o dono do vídeo podem remover o comentário', 403);
  }

  await CommentModel.remove(comment);
}

export async function deleteCommentsByUser(userId: string): Promise<void> {
  for (const comment of await CommentModel.findActiveByUser(userId)) {
    // Uma remoção anterior pode já ter apagado este comentário (pai sem respostas).
    const current = await CommentModel.findById(comment.id);
    if (current && !current.deleted_at) await CommentModel.remove(current);
  }
}
