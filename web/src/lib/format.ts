// Utilitários de formatação que não dependem de idioma.
// Textos e números/datas localizados ficam nas mensagens (messages/*.json) e no formatador do next-intl.
import type { User } from "./types";

export const SITE_NAME = "Criato";

// Duração no formato de player (6:30, 1:02:05): igual em qualquer idioma.
export function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

type Person = Pick<User, "display_name"> | null | undefined;

// `fallback` vem traduzido de quem chama (ex.: t("common.unknownUser")).
export function displayName(user: Person, fallback: string): string {
  return user ? user.display_name : fallback;
}

export function handle(user: Pick<User, "username">): string {
  return `@${user.username}`;
}

export function channelHref(user: Pick<User, "username">): string {
  return `/@${user.username}`;
}

// Primeira letra das duas primeiras palavras: "Marcos Branco" → MB, "TechBR" → T.
export function initials(user: Person): string {
  if (!user) return "?";
  const words = user.display_name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => [...word][0]).join("").toUpperCase() || "?";
}
