// Chamadas à API feitas no servidor (Server Components). Repassam o token da sessão, se houver.
import { getToken } from "./auth";
import type {
  AdminSummary,
  AdminUploadRequest,
  AdminUser,
  AdminUserDetails,
  CommentPage,
  HistoryItem,
  ModerationLog,
  Page,
  Playback,
  Profile,
  ReactionStatus,
  ReportCasePage,
  ReportCaseSort,
  ReportCaseStatus,
  Settings,
  UploadAccess,
  ReviewStatus,
  Video,
} from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

async function get<T>(path: string): Promise<T | null> {
  const token = await getToken();
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`API respondeu ${response.status} em ${path}`);
  return response.json() as Promise<T>;
}

export async function getVideos(): Promise<Video[]> {
  return (await get<Video[]>("/videos")) ?? [];
}

export async function getVideosByUser(userId: string): Promise<Video[]> {
  return (await get<Video[]>(`/videos?user_id=${encodeURIComponent(userId)}`)) ?? [];
}

export async function getVideo(id: string): Promise<Video | null> {
  return get<Video>(`/videos/${encodeURIComponent(id)}`);
}

export async function getPlayback(id: string): Promise<Playback | null> {
  return get<Playback>(`/videos/${encodeURIComponent(id)}/playback`);
}

// Com sessão, a API devolve também a reação do usuário logado.
export async function getReactionStatus(videoId: string): Promise<ReactionStatus | null> {
  return get<ReactionStatus>(`/videos/${encodeURIComponent(videoId)}/reaction`);
}

export async function getComments(videoId: string): Promise<CommentPage> {
  return (await get<CommentPage>(`/videos/${encodeURIComponent(videoId)}/comments`)) ?? {
    items: [],
    next_cursor: null,
  };
}

export async function getProfile(username: string): Promise<Profile | null> {
  return get<Profile>(`/users/by-username/${encodeURIComponent(username)}`);
}

export async function getFeed(): Promise<Page<Video>> {
  return (await get<Page<Video>>("/feed")) ?? { items: [], next_cursor: null };
}

// ---- Histórico (só com sessão) ----

export async function getHistory(): Promise<Page<HistoryItem>> {
  return (await get<Page<HistoryItem>>("/me/history")) ?? { items: [], next_cursor: null };
}

export async function getContinueWatching(): Promise<HistoryItem[]> {
  return (await get<HistoryItem[]>("/me/continue-watching")) ?? [];
}

export async function getSettings(): Promise<Settings | null> {
  return get<Settings>("/me/settings");
}

export async function getUploadAccess(): Promise<UploadAccess | null> {
  return get<UploadAccess>("/me/upload-access");
}

// ---- Moderação (só moderador/admin) ----

const emptyPage = { items: [], next_cursor: null };

export async function getAdminSummary(): Promise<AdminSummary | null> {
  return get<AdminSummary>("/admin/summary");
}

export async function getReportCases(status: ReportCaseStatus, sort: ReportCaseSort): Promise<ReportCasePage> {
  return (
    (await get<ReportCasePage>(`/admin/reports?status=${status}&sort=${sort}`)) ?? { items: [], page: 1, has_more: false }
  );
}

export async function getUploadRequests(status: ReviewStatus): Promise<Page<AdminUploadRequest>> {
  return (await get<Page<AdminUploadRequest>>(`/admin/upload-requests?status=${status}`)) ?? emptyPage;
}

export async function getAdminUsers(q: string): Promise<Page<AdminUser>> {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return (await get<Page<AdminUser>>(`/admin/users${query}`)) ?? emptyPage;
}

export async function getModerationLogs(): Promise<Page<ModerationLog>> {
  return (await get<Page<ModerationLog>>("/admin/logs")) ?? emptyPage;
}

export async function getAdminUserDetails(id: string): Promise<AdminUserDetails | null> {
  return get<AdminUserDetails>(`/admin/users/${encodeURIComponent(id)}`);
}
