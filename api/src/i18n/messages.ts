// Mensagens da API em cada idioma. A resposta de erro sempre traz o `code` (estável, para os
// clientes tratarem) e o texto já traduzido conforme o Accept-Language da requisição.
import { ja, ko, zh } from './messages-cjk.js';

// zh = chinês simplificado.
export const LOCALES = ['pt-BR', 'en', 'es', 'ko', 'ja', 'zh'] as const;
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

  // Histórico
  POSITION_INVALID: 'Posição do vídeo inválida',

  // Permissões e moderação
  FORBIDDEN: 'Você não tem permissão para fazer isso',
  UPLOAD_NOT_ALLOWED: 'Sua conta ainda não pode publicar vídeos. Solicite a permissão',
  UPLOAD_ALREADY_ALLOWED: 'Sua conta já pode publicar vídeos',
  UPLOAD_REQUEST_PENDING: 'Você já tem uma solicitação em análise',
  UPLOAD_REQUEST_COOLDOWN: 'Aguarde um pouco antes de enviar uma nova solicitação',
  UPLOAD_REQUEST_NOT_FOUND: 'Solicitação não encontrada',
  UPLOAD_REQUEST_ALREADY_REVIEWED: 'Esta solicitação já foi analisada',
  REQUEST_MESSAGE_REQUIRED: 'Conte por que você quer publicar vídeos',
  REQUEST_MESSAGE_TOO_LONG: 'A motivação pode ter no máximo 1000 caracteres',
  PORTFOLIO_URL_INVALID: 'Link inválido (use um endereço que comece com http:// ou https://)',
  REVIEW_NOTE_REQUIRED: 'Informe o motivo',
  REVIEW_NOTE_TOO_LONG: 'O motivo pode ter no máximo 500 caracteres',
  CANNOT_ACT_ON_SAME_OR_HIGHER_ROLE: 'Você não pode fazer isso com alguém do mesmo nível ou acima',
  CANNOT_CHANGE_OWN_ROLE: 'Você não pode alterar o seu próprio papel',
  ROLE_INVALID: 'Papel inválido',
  NOTIFICATION_NOT_FOUND: 'Notificação não encontrada',
  RESTRICTED_COMMENT: 'Você está temporariamente impedido de comentar',
  RESTRICTED_UPLOAD: 'Você está temporariamente impedido de publicar vídeos',
  RESTRICTED_REACT: 'Você está temporariamente impedido de reagir a vídeos',
  ACCOUNT_SUSPENDED: 'Sua conta está suspensa: no momento você só pode assistir aos vídeos',
  ACCOUNT_BANNED: 'Esta conta foi banida',
  RESTRICTION_NOT_FOUND: 'Restrição não encontrada',
  RESTRICTION_ALREADY_REVOKED: 'Esta restrição já foi revogada',
  RESTRICTION_NOT_ALLOWED: 'Só administradores podem aplicar ou revogar restrições permanentes e banimentos',
  RESTRICTION_TYPES_REQUIRED: 'Escolha pelo menos um tipo de restrição',
  RESTRICTION_TYPE_INVALID: 'Tipo de restrição inválido',
  RESTRICTION_DURATION_INVALID: 'Prazo inválido',
  REPORT_TARGET_INVALID: 'Tipo de conteúdo inválido para denúncia',
  REPORT_TARGET_NOT_FOUND: 'O conteúdo denunciado não foi encontrado',
  REPORT_REASON_INVALID: 'Escolha um motivo',
  REPORT_DETAILS_TOO_LONG: 'Os detalhes devem ter no máximo 500 caracteres',
  CANNOT_REPORT_SELF: 'Você não pode denunciar o próprio conteúdo',
  ALREADY_REPORTED: 'Você já denunciou este conteúdo. A moderação vai analisar',
  REPORT_LIMIT: 'Você atingiu o limite de denúncias por hoje. Tente amanhã',
  CASE_NOT_FOUND: 'Caso não encontrado',
  CASE_ALREADY_RESOLVED: 'Este caso já foi resolvido',
  CASE_DECISION_INVALID: 'Decisão inválida para este caso',
  VIDEO_NOT_ACTIVE: 'Este vídeo já está em revisão ou removido',
  VISIBILITY_INVALID: 'Visibilidade inválida',
  COMMENT_MODERATED: 'Este comentário foi removido pela moderação e não pode ser editado',
  PURGE_CONFIRM_MISMATCH: 'Digite o título do vídeo exatamente como está para confirmar',
  TOO_MANY_REQUESTS: 'Muitas ações em pouco tempo. Aguarde um pouco e tente de novo',
  TOO_MANY_LOGIN_ATTEMPTS: 'Muitas tentativas de login. Aguarde alguns minutos e tente de novo',
} as const;

export type MessageCode = keyof typeof ptBR;
export type Dictionary = Record<MessageCode, string>;

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

  POSITION_INVALID: 'Invalid video position',

  FORBIDDEN: "You don't have permission to do this",
  UPLOAD_NOT_ALLOWED: "Your account can't publish videos yet. Request permission",
  UPLOAD_ALREADY_ALLOWED: 'Your account can already publish videos',
  UPLOAD_REQUEST_PENDING: 'You already have a request under review',
  UPLOAD_REQUEST_COOLDOWN: 'Please wait a bit before sending a new request',
  UPLOAD_REQUEST_NOT_FOUND: 'Request not found',
  UPLOAD_REQUEST_ALREADY_REVIEWED: 'This request has already been reviewed',
  REQUEST_MESSAGE_REQUIRED: 'Tell us why you want to publish videos',
  REQUEST_MESSAGE_TOO_LONG: 'Your reason can be at most 1000 characters',
  PORTFOLIO_URL_INVALID: 'Invalid link (use an address starting with http:// or https://)',
  REVIEW_NOTE_REQUIRED: 'Please provide a reason',
  REVIEW_NOTE_TOO_LONG: 'The reason can be at most 500 characters',
  CANNOT_ACT_ON_SAME_OR_HIGHER_ROLE: "You can't do this to someone at the same level or above",
  CANNOT_CHANGE_OWN_ROLE: "You can't change your own role",
  ROLE_INVALID: 'Invalid role',
  NOTIFICATION_NOT_FOUND: 'Notification not found',
  RESTRICTED_COMMENT: "You're temporarily restricted from commenting",
  RESTRICTED_UPLOAD: "You're temporarily restricted from publishing videos",
  RESTRICTED_REACT: "You're temporarily restricted from reacting to videos",
  ACCOUNT_SUSPENDED: 'Your account is suspended: for now you can only watch videos',
  ACCOUNT_BANNED: 'This account has been banned',
  RESTRICTION_NOT_FOUND: 'Restriction not found',
  RESTRICTION_ALREADY_REVOKED: 'This restriction has already been revoked',
  RESTRICTION_NOT_ALLOWED: 'Only administrators can apply or revoke permanent restrictions and bans',
  RESTRICTION_TYPES_REQUIRED: 'Choose at least one restriction type',
  RESTRICTION_TYPE_INVALID: 'Invalid restriction type',
  RESTRICTION_DURATION_INVALID: 'Invalid duration',
  REPORT_TARGET_INVALID: 'Invalid content type for a report',
  REPORT_TARGET_NOT_FOUND: 'The reported content was not found',
  REPORT_REASON_INVALID: 'Choose a reason',
  REPORT_DETAILS_TOO_LONG: 'Details must be at most 500 characters',
  CANNOT_REPORT_SELF: "You can't report your own content",
  ALREADY_REPORTED: "You've already reported this content. The moderators will review it",
  REPORT_LIMIT: "You've reached today's report limit. Try again tomorrow",
  CASE_NOT_FOUND: 'Case not found',
  CASE_ALREADY_RESOLVED: 'This case has already been resolved',
  CASE_DECISION_INVALID: 'Invalid decision for this case',
  VIDEO_NOT_ACTIVE: 'This video is already under review or removed',
  VISIBILITY_INVALID: 'Invalid visibility',
  COMMENT_MODERATED: 'This comment was removed by the moderators and cannot be edited',
  PURGE_CONFIRM_MISMATCH: 'Type the video title exactly as it is to confirm',
  TOO_MANY_REQUESTS: 'Too many actions in a short time. Please wait a moment and try again',
  TOO_MANY_LOGIN_ATTEMPTS: 'Too many sign-in attempts. Please wait a few minutes and try again',
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

  POSITION_INVALID: 'Posición del video no válida',

  FORBIDDEN: 'No tienes permiso para hacer esto',
  UPLOAD_NOT_ALLOWED: 'Tu cuenta aún no puede publicar videos. Solicita el permiso',
  UPLOAD_ALREADY_ALLOWED: 'Tu cuenta ya puede publicar videos',
  UPLOAD_REQUEST_PENDING: 'Ya tienes una solicitud en revisión',
  UPLOAD_REQUEST_COOLDOWN: 'Espera un poco antes de enviar una nueva solicitud',
  UPLOAD_REQUEST_NOT_FOUND: 'Solicitud no encontrada',
  UPLOAD_REQUEST_ALREADY_REVIEWED: 'Esta solicitud ya fue revisada',
  REQUEST_MESSAGE_REQUIRED: 'Cuéntanos por qué quieres publicar videos',
  REQUEST_MESSAGE_TOO_LONG: 'La motivación puede tener como máximo 1000 caracteres',
  PORTFOLIO_URL_INVALID: 'Enlace no válido (usa una dirección que empiece con http:// o https://)',
  REVIEW_NOTE_REQUIRED: 'Indica el motivo',
  REVIEW_NOTE_TOO_LONG: 'El motivo puede tener como máximo 500 caracteres',
  CANNOT_ACT_ON_SAME_OR_HIGHER_ROLE: 'No puedes hacer esto con alguien de tu mismo nivel o superior',
  CANNOT_CHANGE_OWN_ROLE: 'No puedes cambiar tu propio rol',
  ROLE_INVALID: 'Rol no válido',
  NOTIFICATION_NOT_FOUND: 'Notificación no encontrada',
  RESTRICTED_COMMENT: 'Tienes una restricción temporal para comentar',
  RESTRICTED_UPLOAD: 'Tienes una restricción temporal para publicar videos',
  RESTRICTED_REACT: 'Tienes una restricción temporal para reaccionar a videos',
  ACCOUNT_SUSPENDED: 'Tu cuenta está suspendida: por ahora solo puedes ver videos',
  ACCOUNT_BANNED: 'Esta cuenta fue bloqueada',
  RESTRICTION_NOT_FOUND: 'Restricción no encontrada',
  RESTRICTION_ALREADY_REVOKED: 'Esta restricción ya fue revocada',
  RESTRICTION_NOT_ALLOWED: 'Solo los administradores pueden aplicar o revocar restricciones permanentes y bloqueos',
  RESTRICTION_TYPES_REQUIRED: 'Elige al menos un tipo de restricción',
  RESTRICTION_TYPE_INVALID: 'Tipo de restricción inválido',
  RESTRICTION_DURATION_INVALID: 'Plazo inválido',
  REPORT_TARGET_INVALID: 'Tipo de contenido no válido para denunciar',
  REPORT_TARGET_NOT_FOUND: 'No se encontró el contenido denunciado',
  REPORT_REASON_INVALID: 'Elige un motivo',
  REPORT_DETAILS_TOO_LONG: 'Los detalles deben tener como máximo 500 caracteres',
  CANNOT_REPORT_SELF: 'No puedes denunciar tu propio contenido',
  ALREADY_REPORTED: 'Ya denunciaste este contenido. La moderación lo revisará',
  REPORT_LIMIT: 'Alcanzaste el límite de denuncias de hoy. Inténtalo mañana',
  CASE_NOT_FOUND: 'Caso no encontrado',
  CASE_ALREADY_RESOLVED: 'Este caso ya fue resuelto',
  CASE_DECISION_INVALID: 'Decisión no válida para este caso',
  VIDEO_NOT_ACTIVE: 'Este video ya está en revisión o eliminado',
  VISIBILITY_INVALID: 'Visibilidad no válida',
  COMMENT_MODERATED: 'La moderación eliminó este comentario y no se puede editar',
  PURGE_CONFIRM_MISMATCH: 'Escribe el título del video exactamente igual para confirmar',
  TOO_MANY_REQUESTS: 'Demasiadas acciones en poco tiempo. Espera un momento e inténtalo de nuevo',
  TOO_MANY_LOGIN_ATTEMPTS: 'Demasiados intentos de inicio de sesión. Espera unos minutos e inténtalo de nuevo',
};

const dictionaries: Record<Locale, Dictionary> = { 'pt-BR': ptBR, en, es, ko, ja, zh };

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
    if (tag.startsWith('ko')) return 'ko';
    if (tag.startsWith('ja')) return 'ja';
    // Chinês: zh, zh-CN, zh-Hans... (por enquanto só simplificado).
    if (tag.startsWith('zh')) return 'zh';
  }
  return DEFAULT_LOCALE;
}
