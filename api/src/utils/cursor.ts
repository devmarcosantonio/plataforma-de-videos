import { AppError } from './errors/app-error.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cursor opaco para paginação: posição = (created_at, id) do último item da página.
export interface CursorPosition {
  created_at: string;
  id: string;
}

export function encodeCursor(position: CursorPosition): string {
  return Buffer.from(`${position.created_at}|${position.id}`).toString('base64url');
}

export function decodeCursor(cursor: string): CursorPosition {
  const [created_at, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  if (!created_at || !id || Number.isNaN(Date.parse(created_at)) || !UUID.test(id)) {
    throw new AppError('Cursor inválido');
  }
  return { created_at, id };
}
