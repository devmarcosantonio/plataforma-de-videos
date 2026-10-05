// Chamadas à API feitas no servidor (Server Components).
import type { CommentPage, Playback, ReactionStatus, User, Video } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

async function get<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`API respondeu ${response.status} em ${path}`);
  return response.json() as Promise<T>;
}

export async function getVideos(): Promise<Video[]> {
  return (await get<Video[]>("/videos")) ?? [];
}

export async function getVideo(id: string): Promise<Video | null> {
  return get<Video>(`/videos/${encodeURIComponent(id)}`);
}

export async function getPlayback(id: string): Promise<Playback | null> {
  return get<Playback>(`/videos/${encodeURIComponent(id)}/playback`);
}

export async function getReactionStatus(videoId: string, userId: string | null): Promise<ReactionStatus | null> {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  return get<ReactionStatus>(`/videos/${encodeURIComponent(videoId)}/reaction${query}`);
}

export async function getComments(videoId: string): Promise<CommentPage> {
  return (await get<CommentPage>(`/videos/${encodeURIComponent(videoId)}/comments`)) ?? {
    items: [],
    next_cursor: null,
  };
}

export async function getUsers(): Promise<User[]> {
  return (await get<User[]>("/users")) ?? [];
}

export async function getUsersById(): Promise<Map<string, User>> {
  const users = await getUsers();
  return new Map(users.map((user) => [user.id, user]));
}
