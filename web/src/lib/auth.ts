// Sessão no servidor: o token fica num cookie httpOnly definido pela API (via proxy /api/*).
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthUser } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:3000";
export const AUTH_COOKIE = "token";

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(AUTH_COOKIE)?.value;
}

// cache(): várias partes da mesma página podem pedir a sessão sem repetir a chamada.
export const getSession = cache(async (): Promise<AuthUser | null> => {
  const token = await getToken();
  if (!token) return null;

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  // Token expirado ou inválido: trata como visitante.
  if (!response.ok) return null;
  return response.json() as Promise<AuthUser>;
});

// Para páginas que exigem login: manda para /login e volta depois.
export async function requireSession(returnTo: string): Promise<AuthUser> {
  const user = await getSession();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

// Aceita só caminhos internos, para o ?next= não virar um redirecionamento para outro site.
export function safeNext(next: string | string[] | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
