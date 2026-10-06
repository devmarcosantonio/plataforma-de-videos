import type { User, VideoStatus } from "./types";

export const SITE_NAME = "Plataforma";

export function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

const relativeFormat = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function timeAgo(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) >= size) return relativeFormat.format(Math.round(diff / size), unit);
  }
  return "agora mesmo";
}

const compactNumber = new Intl.NumberFormat("pt-BR", { notation: "compact" });

export function formatLikes(count: number): string {
  if (count === 0) return "Sem curtidas";
  return `${compactNumber.format(count)} curtida${count > 1 ? "s" : ""}`;
}

type Person = Pick<User, "name" | "last_name"> | null | undefined;

export function fullName(user: Person): string {
  return user ? `${user.name} ${user.last_name}` : "Usuário desconhecido";
}

export function channelHref(user: Pick<User, "username">): string {
  return `/@${user.username}`;
}

const followersFormat = new Intl.NumberFormat("pt-BR", { notation: "compact" });

export function formatFollowers(count: number): string {
  return `${followersFormat.format(count)} seguidor${count === 1 ? "" : "es"}`;
}

export function handle(user: Pick<User, "username"> | null | undefined): string {
  return user ? `@${user.username}` : "Usuário desconhecido";
}

export function initials(user: Person): string {
  return user ? `${user.name[0]}${user.last_name[0]}`.toUpperCase() : "?";
}

export const STATUS_LABEL: Record<VideoStatus, string> = {
  pending_upload: "Aguardando envio",
  processing: "Processando",
  ready: "Pronto",
  failed: "Falhou",
};
