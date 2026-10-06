export type VideoStatus = "pending_upload" | "processing" | "ready" | "failed";

// Dados públicos de um usuário (o que qualquer pessoa vê).
export interface User {
  id: string;
  username: string;
  name: string;
  last_name: string;
}

// O usuário logado vendo a própria conta.
export interface AuthUser extends User {
  email: string;
  created_at: string;
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
}

export interface Comment {
  id: string;
  video_id: string;
  parent_id: string | null;
  content: string | null;
  created_at: string;
  edited_at: string | null;
  deleted: boolean;
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
