import { DEFAULT_LOCALE, translate, type MessageCode } from '../../i18n/messages.js';

// Erro de negócio com código estável; o texto é traduzido na resposta (Accept-Language).
export class AppError extends Error {
  constructor(
    public readonly code: MessageCode,
    public readonly statusCode = 400,
  ) {
    super(translate(DEFAULT_LOCALE, code));
  }
}
