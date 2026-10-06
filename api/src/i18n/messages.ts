// Mensagens da API em cada idioma. A resposta de erro sempre traz o `code` (estável, para os
// clientes tratarem) e o texto já traduzido conforme o Accept-Language da requisição.

export const LOCALES = ['pt-BR', 'en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt-BR';

const ptBR = {
  // Gerais
  VALIDATION_ERROR: 'Dados inválidos',
  INVALID_VALUE: 'Valor inválido',
  INVALID_ID: 'Identificador inválido',
  INVALID_CURSOR: 'Cursor inválido',
  RESOURCE_NOT_FOUND: 'Recurso não encontrado',
  ROUTE_NOT_FOUND: 'Rota não encontrada',
  INTERNAL_ERROR: 'Erro interno do servidor',
  DUPLICATE_RECORD: 'Registro duplicado',
  RELATION_CONFLICT: 'Operação viola um relacionamento existente',
  RECORD_NOT_FOUND: 'Registro não encontrado',

  // Autenticação e conta
  AUTH_REQUIRED: 'Faça login para continuar',
  INVALID_CREDENTIALS: 'E-mail, usuário ou senha incorretos',
  LOGIN_REQUIRED: 'Informe o e-mail ou nome de usuário',
  PASSWORD_REQUIRED: 'Informe a senha',
  PASSWORD_TOO_SHORT: 'A senha deve ter pelo menos 8 caracteres',
  EMAIL_REQUIRED: 'O e-mail é obrigatório',
  EMAIL_INVALID: 'E-mail inválido',
  EMAIL_TAKEN: 'E-mail já cadastrado',
  USER_NOT_FOUND: 'Usuário não encontrado',
  ACCOUNT_FORBIDDEN: 'Você só pode alterar a sua própria conta',
  ACCOUNT_HAS_VIDEOS: 'Você possui vídeos. Remova os vídeos antes de apagar a conta',
  LOCALE_INVALID: 'Idioma não suportado',

  // Username e nome de exibição
  USERNAME_REQUIRED: 'O nome de usuário é obrigatório',
  USERNAME_TOO_SHORT: 'O nome de usuário deve ter pelo menos 3 caracteres',
  USERNAME_TOO_LONG: 'O nome de usuário pode ter no máximo 30 caracteres',
  USERNAME_INVALID_CHARS: 'Use apenas letras minúsculas, números, ponto e underline',
  USERNAME_INVALID_START: 'O nome de usuário deve começar com letra ou número',
  USERNAME_DOUBLE_DOT: 'O nome de usuário não pode ter dois pontos seguidos',
  USERNAME_TRAILING_DOT: 'O nome de usuário não pode terminar com ponto',
  USERNAME_RESERVED: 'Este nome de usuário é reservado',
  USERNAME_TAKEN: 'Nome de usuário já está em uso',
  DISPLAY_NAME_EMPTY: 'O nome de exibição não pode ficar vazio',
  DISPLAY_NAME_TOO_LONG: 'O nome de exibição pode ter no máximo 50 caracteres',

  // Vídeos
  VIDEO_NOT_FOUND: 'Vídeo não encontrado',
  VIDEO_OWNER_ONLY: 'Só o dono do vídeo pode fazer isso',
  VIDEO_NOT_READY: 'O vídeo ainda não está pronto para reprodução',
  VIDEO_ALREADY_UPLOADED: 'Este vídeo já foi enviado',
  VIDEO_ALREADY_IMPORTED: 'Este vídeo já está cadastrado',
  VIDEO_PROVIDER_ERROR: 'Falha ao comunicar com o provedor de vídeo',
  BUNNY_VIDEO_NOT_FOUND: 'Vídeo não encontrado no Bunny',
  BUNNY_VIDEO_ID_REQUIRED: 'bunny_video_id é obrigatório',
  TITLE_REQUIRED: 'O título é obrigatório',
  TITLE_EMPTY: 'O título não pode ficar vazio',
  TITLE_TOO_LONG: 'O título pode ter no máximo 200 caracteres',
  DESCRIPTION_TOO_LONG: 'A descrição pode ter no máximo 5000 caracteres',
  VIDEO_UPDATE_EMPTY: 'Informe o título ou a descrição',

  // Reações
  REACTION_TYPE_INVALID: 'type deve ser "like" ou "dislike"',
  REACTION_VIDEO_NOT_READY: 'Só é possível reagir a vídeos prontos',

  // Comentários
  COMMENT_NOT_FOUND: 'Comentário não encontrado',
  COMMENT_REQUIRED: 'O comentário é obrigatório',
  COMMENT_EMPTY: 'O comentário não pode ficar vazio',
  COMMENT_TOO_LONG: 'O comentário pode ter no máximo 2000 caracteres',
  COMMENT_VIDEO_NOT_READY: 'Só é possível comentar em vídeos prontos',
  COMMENT_AUTHOR_ONLY: 'Só o autor pode editar o comentário',
  COMMENT_DELETE_FORBIDDEN: 'Só o autor ou o dono do vídeo podem remover o comentário',
  PARENT_COMMENT_OTHER_VIDEO: 'O comentário respondido é de outro vídeo',
  PARENT_COMMENT_DELETED: 'Não é possível responder um comentário removido',
  REPLY_TO_REPLY_NOT_ALLOWED: 'Respostas não têm respostas próprias',

  // Seguir
  CANNOT_FOLLOW_SELF: 'Você não pode seguir a si mesmo',
  FOLLOWING_LIST_FORBIDDEN: 'Você só pode ver quem você segue',
} as const;

export type MessageCode = keyof typeof ptBR;
type Dictionary = Record<MessageCode, string>;

const en: Dictionary = {
  VALIDATION_ERROR: 'Invalid data',
  INVALID_VALUE: 'Invalid value',
  INVALID_ID: 'Invalid identifier',
  INVALID_CURSOR: 'Invalid cursor',
  RESOURCE_NOT_FOUND: 'Resource not found',
  ROUTE_NOT_FOUND: 'Route not found',
  INTERNAL_ERROR: 'Internal server error',
  DUPLICATE_RECORD: 'Duplicate record',
  RELATION_CONFLICT: 'Operation conflicts with an existing relationship',
  RECORD_NOT_FOUND: 'Record not found',

  AUTH_REQUIRED: 'Please sign in to continue',
  INVALID_CREDENTIALS: 'Incorrect email, username or password',
  LOGIN_REQUIRED: 'Enter your email or username',
  PASSWORD_REQUIRED: 'Enter your password',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_INVALID: 'Invalid email',
  EMAIL_TAKEN: 'Email is already registered',
  USER_NOT_FOUND: 'User not found',
  ACCOUNT_FORBIDDEN: 'You can only change your own account',
  ACCOUNT_HAS_VIDEOS: 'You have videos. Remove them before deleting your account',
  LOCALE_INVALID: 'Unsupported language',

  USERNAME_REQUIRED: 'Username is required',
  USERNAME_TOO_SHORT: 'Username must be at least 3 characters',
  USERNAME_TOO_LONG: 'Username can be at most 30 characters',
  USERNAME_INVALID_CHARS: 'Use only lowercase letters, numbers, dots and underscores',
  USERNAME_INVALID_START: 'Username must start with a letter or number',
  USERNAME_DOUBLE_DOT: 'Username cannot contain two dots in a row',
  USERNAME_TRAILING_DOT: 'Username cannot end with a dot',
  USERNAME_RESERVED: 'This username is reserved',
  USERNAME_TAKEN: 'Username is already taken',
  DISPLAY_NAME_EMPTY: 'Display name cannot be empty',
  DISPLAY_NAME_TOO_LONG: 'Display name can be at most 50 characters',

  VIDEO_NOT_FOUND: 'Video not found',
  VIDEO_OWNER_ONLY: 'Only the video owner can do this',
  VIDEO_NOT_READY: 'The video is not ready to play yet',
  VIDEO_ALREADY_UPLOADED: 'This video has already been uploaded',
  VIDEO_ALREADY_IMPORTED: 'This video is already registered',
  VIDEO_PROVIDER_ERROR: 'Could not reach the video provider',
  BUNNY_VIDEO_NOT_FOUND: 'Video not found on Bunny',
  BUNNY_VIDEO_ID_REQUIRED: 'bunny_video_id is required',
  TITLE_REQUIRED: 'Title is required',
  TITLE_EMPTY: 'Title cannot be empty',
  TITLE_TOO_LONG: 'Title can be at most 200 characters',
  DESCRIPTION_TOO_LONG: 'Description can be at most 5000 characters',
  VIDEO_UPDATE_EMPTY: 'Provide a title or a description',

  REACTION_TYPE_INVALID: 'type must be "like" or "dislike"',
  REACTION_VIDEO_NOT_READY: 'You can only react to ready videos',

  COMMENT_NOT_FOUND: 'Comment not found',
  COMMENT_REQUIRED: 'Comment is required',
  COMMENT_EMPTY: 'Comment cannot be empty',
  COMMENT_TOO_LONG: 'Comment can be at most 2000 characters',
  COMMENT_VIDEO_NOT_READY: 'You can only comment on ready videos',
  COMMENT_AUTHOR_ONLY: 'Only the author can edit this comment',
  COMMENT_DELETE_FORBIDDEN: 'Only the author or the video owner can remove this comment',
  PARENT_COMMENT_OTHER_VIDEO: 'The replied comment belongs to another video',
  PARENT_COMMENT_DELETED: 'You cannot reply to a removed comment',
  REPLY_TO_REPLY_NOT_ALLOWED: 'Replies do not have their own replies',

  CANNOT_FOLLOW_SELF: 'You cannot follow yourself',
  FOLLOWING_LIST_FORBIDDEN: 'You can only see who you follow',
};

const es: Dictionary = {
  VALIDATION_ERROR: 'Datos no válidos',
  INVALID_VALUE: 'Valor no válido',
  INVALID_ID: 'Identificador no válido',
  INVALID_CURSOR: 'Cursor no válido',
  RESOURCE_NOT_FOUND: 'Recurso no encontrado',
  ROUTE_NOT_FOUND: 'Ruta no encontrada',
  INTERNAL_ERROR: 'Error interno del servidor',
  DUPLICATE_RECORD: 'Registro duplicado',
  RELATION_CONFLICT: 'La operación entra en conflicto con una relación existente',
  RECORD_NOT_FOUND: 'Registro no encontrado',

  AUTH_REQUIRED: 'Inicia sesión para continuar',
  INVALID_CREDENTIALS: 'Correo, usuario o contraseña incorrectos',
  LOGIN_REQUIRED: 'Introduce tu correo o nombre de usuario',
  PASSWORD_REQUIRED: 'Introduce tu contraseña',
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres',
  EMAIL_REQUIRED: 'El correo es obligatorio',
  EMAIL_INVALID: 'Correo no válido',
  EMAIL_TAKEN: 'El correo ya está registrado',
  USER_NOT_FOUND: 'Usuario no encontrado',
  ACCOUNT_FORBIDDEN: 'Solo puedes modificar tu propia cuenta',
  ACCOUNT_HAS_VIDEOS: 'Tienes videos. Elimínalos antes de borrar tu cuenta',
  LOCALE_INVALID: 'Idioma no compatible',

  USERNAME_REQUIRED: 'El nombre de usuario es obligatorio',
  USERNAME_TOO_SHORT: 'El nombre de usuario debe tener al menos 3 caracteres',
  USERNAME_TOO_LONG: 'El nombre de usuario puede tener como máximo 30 caracteres',
  USERNAME_INVALID_CHARS: 'Usa solo letras minúsculas, números, punto y guion bajo',
  USERNAME_INVALID_START: 'El nombre de usuario debe empezar con una letra o un número',
  USERNAME_DOUBLE_DOT: 'El nombre de usuario no puede tener dos puntos seguidos',
  USERNAME_TRAILING_DOT: 'El nombre de usuario no puede terminar en punto',
  USERNAME_RESERVED: 'Este nombre de usuario está reservado',
  USERNAME_TAKEN: 'El nombre de usuario ya está en uso',
  DISPLAY_NAME_EMPTY: 'El nombre visible no puede quedar vacío',
  DISPLAY_NAME_TOO_LONG: 'El nombre visible puede tener como máximo 50 caracteres',

  VIDEO_NOT_FOUND: 'Video no encontrado',
  VIDEO_OWNER_ONLY: 'Solo el dueño del video puede hacer esto',
  VIDEO_NOT_READY: 'El video aún no está listo para reproducirse',
  VIDEO_ALREADY_UPLOADED: 'Este video ya fue subido',
  VIDEO_ALREADY_IMPORTED: 'Este video ya está registrado',
  VIDEO_PROVIDER_ERROR: 'No se pudo comunicar con el proveedor de video',
  BUNNY_VIDEO_NOT_FOUND: 'Video no encontrado en Bunny',
  BUNNY_VIDEO_ID_REQUIRED: 'bunny_video_id es obligatorio',
  TITLE_REQUIRED: 'El título es obligatorio',
  TITLE_EMPTY: 'El título no puede quedar vacío',
  TITLE_TOO_LONG: 'El título puede tener como máximo 200 caracteres',
  DESCRIPTION_TOO_LONG: 'La descripción puede tener como máximo 5000 caracteres',
  VIDEO_UPDATE_EMPTY: 'Indica el título o la descripción',

  REACTION_TYPE_INVALID: 'type debe ser "like" o "dislike"',
  REACTION_VIDEO_NOT_READY: 'Solo puedes reaccionar a videos listos',

  COMMENT_NOT_FOUND: 'Comentario no encontrado',
  COMMENT_REQUIRED: 'El comentario es obligatorio',
  COMMENT_EMPTY: 'El comentario no puede quedar vacío',
  COMMENT_TOO_LONG: 'El comentario puede tener como máximo 2000 caracteres',
  COMMENT_VIDEO_NOT_READY: 'Solo puedes comentar en videos listos',
  COMMENT_AUTHOR_ONLY: 'Solo el autor puede editar el comentario',
  COMMENT_DELETE_FORBIDDEN: 'Solo el autor o el dueño del video pueden eliminar el comentario',
  PARENT_COMMENT_OTHER_VIDEO: 'El comentario respondido es de otro video',
  PARENT_COMMENT_DELETED: 'No puedes responder a un comentario eliminado',
  REPLY_TO_REPLY_NOT_ALLOWED: 'Las respuestas no tienen respuestas propias',

  CANNOT_FOLLOW_SELF: 'No puedes seguirte a ti mismo',
  FOLLOWING_LIST_FORBIDDEN: 'Solo puedes ver a quién sigues',
};

const dictionaries: Record<Locale, Dictionary> = { 'pt-BR': ptBR, en, es };

export function isMessageCode(value: string): value is MessageCode {
  return value in ptBR;
}

export function translate(locale: Locale, code: MessageCode): string {
  return dictionaries[locale][code] ?? ptBR[code];
}

// Escolhe o idioma pelo Accept-Language ("en-US,en;q=0.9,pt;q=0.8"), respeitando a ordem de preferência.
export function negotiateLocale(header: string | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const preferred = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = Number(params.find((p) => p.trim().startsWith('q='))?.split('=')[1] ?? 1);
      return { tag: tag.toLowerCase(), q: Number.isNaN(q) ? 0 : q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of preferred) {
    if (tag.startsWith('pt')) return 'pt-BR';
    if (tag.startsWith('en')) return 'en';
    if (tag.startsWith('es')) return 'es';
  }
  return DEFAULT_LOCALE;
}
