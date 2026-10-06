// Chamadas à API feitas no navegador, via proxy /api/* do Next.
import type { ApiErrorBody } from "./types";

export class ApiError extends Error {}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      // Idioma da página (<html lang>): a API devolve os erros já traduzidos.
      "Accept-Language": document.documentElement.lang || "pt-BR",
      ...(body !== undefined && { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as ApiErrorBody | null;
    const details = data?.details?.map((detail) => detail.message).join(" · ");
    throw new ApiError(details || data?.error || `Erro ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getJson<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>("POST", path, body);
}

export function sendJson<T>(method: Exclude<Method, "GET">, path: string, body: unknown): Promise<T> {
  return request<T>(method, path, body);
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
