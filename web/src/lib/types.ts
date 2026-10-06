export type VideoStatus = "pending_upload" | "processing" | "ready" | "failed";
// Escolha do dono.
export type VideoVisibility = "public" | "private";
// Decisão da moderação (separada da escolha do dono).
export type VideoModerationStatus = "active" | "under_review" | "removed";

// Dados públicos de um usuário (o que qualquer pessoa vê).
export interface User {
  id: string;
  username: string;
  // Nome livre (pessoa ou marca); quem identifica é o username.
  display_name: string;
}

export type UserRole = "user" | "moderator" | "admin";

// O usuário logado vendo a própria conta.
export interface AuthUser extends User {
  email: string;
  created_at: string;
  // Idioma salvo na conta (nulo = segue o navegador).
  locale: string | null;
  role: UserRole;
  // O que a pessoa pode fazer agora (calculado pela API a partir da aprovação e das restrições).
  access: Access;
}

export type RestrictionType = "comment" | "upload" | "react" | "suspend" | "ban";

export interface ActiveRestriction {
  id: string;
  type: RestrictionType;
  // Nulo = permanente.
  until: string | null;
  reason: string;
}

export interface Access {
  can_upload: boolean;
  can_comment: boolean;
  can_react: boolean;
  can_follow: boolean;
  // Por que não pode publicar: falta aprovação ou há restrição (nulo = pode).
  upload_blocked_by: "approval" | "restriction" | null;
  restrictions: ActiveRestriction[];
}

// Página do canal: perfil público + números.
export interface Profile extends User {
  created_at: string;
  followers_count: number;
  following_count: number;
  videos_count: number;
  is_following: boolean;
}

export interface FollowStatus {
  following: boolean;
  followers_count: number;
}

export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}

export interface Video {
  id: string;
  user_id: string;
  bunny_video_id: string;
  title: string;
  description: string | null;
  status: VideoStatus;
  duration: number | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  likes_count: number;
  comments_count: number;
  author: User;
  visibility: VideoVisibility;
  moderation_status: VideoModerationStatus;
  // Motivo pronto e observação da moderação (o dono vê no "Meu canal").
  moderation_reason: ReportReason | null;
  moderation_note: string | null;
  // Progresso do usuário logado (nulo para visitante ou vídeo nunca assistido).
  watch_progress?: WatchProgress | null;
}

export interface WatchProgress {
  position_seconds: number;
  completed: boolean;
}

export interface HistoryItem {
  video: Video;
  position_seconds: number;
  completed: boolean;
  watch_count: number;
  last_watched_at: string;
}

export interface Settings {
  history_paused: boolean;
}

export interface Comment {
  id: string;
  video_id: string;
  parent_id: string | null;
  content: string | null;
  created_at: string;
  edited_at: string | null;
  deleted: boolean;
  // Removido pela moderação (reversível). Só a moderação recebe o texto.
  moderated: boolean;
  author: User | null;
  replies_count: number;
}

export interface CommentPage {
  items: Comment[];
  next_cursor: string | null;
}

export type ReactionType = "like" | "dislike";

export interface ReactionStatus {
  reaction: ReactionType | null;
  likes_count: number;
  // Só vem para o dono do vídeo.
  dislikes_count?: number;
}

export interface Playback {
  embed_url: string;
  hls_url: string;
  thumbnail_url: string | null;
  expires_at: string | null;
}

export interface UploadCredentials {
  endpoint: string;
  headers: Record<string, string>;
  expires_at: string;
}

export interface ApiErrorBody {
  error: string;
  details?: { field: string; message: string }[];
}

// ---- Permissão de publicar ----

export type UploadRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
// Filtros da fila de moderação (cancelados não aparecem lá).
export type ReviewStatus = Exclude<UploadRequestStatus, "cancelled">;

export interface UploadRequest {
  id: string;
  status: UploadRequestStatus;
  message: string;
  portfolio_url: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface UploadAccess {
  can_upload: boolean;
  blocked_by: Access["upload_blocked_by"];
  // Restrições que impedem publicar (com prazo e motivo).
  restrictions: ActiveRestriction[];
  request: UploadRequest | null;
  // Depois de uma recusa: quando pode pedir de novo (nulo = já pode).
  retry_at: string | null;
}

// ---- Notificações ----

export type NotificationType =
  | "upload_request.created"
  | "upload_request.approved"
  | "upload_request.rejected"
  | "upload_access.granted"
  | "upload_access.revoked"
  | "role.changed"
  | "restriction.applied"
  | "restriction.revoked"
  | "video.under_review"
  | "video.removed"
  | "video.restored"
  | "video.purged"
  | "comment.removed"
  | "comment.restored";

export interface AppNotification {
  id: string;
  type: NotificationType;
  data: {
    username?: string;
    note?: string | null;
    reason?: string | null;
    role?: UserRole;
    retry_at?: string;
    types?: RestrictionType[];
    type?: RestrictionType;
    until?: string | null;
    video_id?: string;
    title?: string;
    target_type?: ReportTargetType;
  };
  read_at: string | null;
  created_at: string;
}

// ---- Moderação ----

export interface AdminUploadRequest extends UploadRequest {
  user: User & { created_at: string };
  reviewer: User | null;
}

export interface AdminUser extends User {
  email: string;
  role: UserRole;
  created_at: string;
  videos_count: number;
  access: Access;
}

export interface RestrictionRecord {
  id: string;
  type: RestrictionType;
  reason: string;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
  status: "active" | "expired" | "revoked";
  author: User | null;
  revoker: User | null;
}

export interface AdminUserDetails {
  user: Omit<AdminUser, "access">;
  access: Access;
  restrictions: RestrictionRecord[];
  requests: AdminUploadRequest[];
  reports: ReportCase[];
  logs: ModerationLog[];
}

// ---- Denúncias ----

export type ReportTargetType = "video" | "comment";
export type ReportReason = "spam" | "harassment" | "hate" | "violence" | "sexual" | "misleading" | "copyright" | "other";
export type ReportCaseStatus = "open" | "actioned" | "dismissed";
export type ReportCaseSort = "priority" | "oldest" | "newest" | "most_reported" | "least_reported";

export interface ReportCase {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  status: ReportCaseStatus;
  reports_count: number;
  severity: number;
  created_at: string;
  last_reported_at: string;
  resolved_at: string | null;
  resolution_reason: ReportReason | null;
  resolution_note: string | null;
  target_user: (User & { role: UserRole }) | null;
  resolver: User | null;
  reasons: { reason: ReportReason; count: number }[];
  details: { id: string; reason: ReportReason; details: string; created_at: string; reporter: User | null }[];
  // Prévia do conteúdo (nula se foi apagado depois da denúncia).
  target: ReportVideoPreview | ReportCommentPreview | null;
}

export interface ReportVideoPreview {
  id: string;
  title: string;
  thumbnail_url: string | null;
  status: VideoStatus;
  visibility: VideoVisibility;
  moderation_status: VideoModerationStatus;
  moderation_reason: ReportReason | null;
  moderation_note: string | null;
}

export interface ReportCommentPreview {
  id: string;
  content: string | null;
  deleted_at: string | null;
  moderated_at: string | null;
  video_id: string;
  video: { title: string };
}

export interface AdminSummary {
  pending_requests: number;
  open_reports: number;
  // Desde quando o caso aberto mais antigo espera.
  oldest_open_report_at: string | null;
}

export interface ReportCasePage {
  items: ReportCase[];
  page: number;
  has_more: boolean;
}

export interface ModerationLog {
  id: string;
  action: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: (User & { role: UserRole }) | null;
  target_user: (User & { role: UserRole }) | null;
}
