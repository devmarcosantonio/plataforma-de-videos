"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { getJson, postJson } from "@/lib/client-api";
import type { AppNotification, Page } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TimeAgo } from "../time-ago";

const POLL_MS = 60_000;

// Para onde cada notificação leva.
function hrefFor(notification: AppNotification): string {
  switch (notification.type) {
    case "upload_request.created":
      return "/admin";
    case "role.changed":
      return notification.data.role === "user" ? "/" : "/admin";
    case "video.under_review":
    case "video.removed":
    case "video.purged":
      return "/studio";
    case "video.restored":
      return `/watch/${notification.data.video_id}`;
    case "comment.removed":
    case "comment.restored":
      return notification.data.video_id ? `/watch/${notification.data.video_id}` : "/";
    case "restriction.applied":
    case "restriction.revoked":
      // Publicação afeta a página Criar; o resto vale para o site todo.
      return notification.data.types?.includes("upload") || notification.data.type === "upload" ? "/upload" : "/";
    default:
      return "/upload";
  }
}

export function NotificationBell() {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      setCount((await getJson<{ count: number }>("/me/notifications/unread-count")).count);
    } catch {
      // Sem rede ou sessão expirada: tenta de novo no próximo ciclo.
    }
  }, []);

  // Contador: ao abrir a página, a cada minuto (só com a aba visível) e ao voltar para a aba.
  useEffect(() => {
    // Primeira busca fora do corpo do efeito (o setState acontece num callback).
    const first = setTimeout(() => void refreshCount(), 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refreshCount();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void refreshCount();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshCount]);

  async function load(cursor?: string) {
    setLoading(true);
    try {
      const page = await getJson<Page<AppNotification>>(
        `/me/notifications${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
      setItems((current) => (cursor && current ? [...current, ...page.items] : page.items));
      setNextCursor(page.next_cursor);
    } catch {
      setItems((current) => current ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function open(notification: AppNotification) {
    if (!notification.read_at) {
      setItems((current) =>
        current?.map((item) => (item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item)) ??
        null,
      );
      postJson<{ count: number }>(`/me/notifications/${notification.id}/read`, {})
        .then(({ count }) => setCount(count))
        .catch(() => {});
    }
    router.push(hrefFor(notification));
    // A página de destino pode depender do que mudou (ex.: permissão aprovada).
    router.refresh();
  }

  async function markAll() {
    const now = new Date().toISOString();
    setItems((current) => current?.map((item) => ({ ...item, read_at: item.read_at ?? now })) ?? null);
    setCount(0);
    await postJson("/me/notifications/read-all", {}).catch(() => refreshCount());
  }

  return (
    <DropdownMenu onOpenChange={(isOpen) => isOpen && void load()}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="relative shrink-0 rounded-full"
          aria-label={count ? t("labelUnread", { count }) : t("label")}
        >
          <Bell className="size-5" />
          <AnimatePresence>
            {count > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
              >
                {count > 99 ? "99+" : count}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">{t("title")}</DropdownMenuLabel>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="h-7 rounded-full text-xs" onClick={markAll}>
              <CheckCheck />
              {t("markAll")}
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[min(28rem,70dvh)] overflow-y-auto p-1">
          {items === null ? (
            <div className="grid place-items-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <>
              {items.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onSelect={() => void open(item)}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                >
                  <span
                    className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.read_at ? "bg-transparent" : "bg-primary")}
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className={cn("text-sm", !item.read_at && "font-medium")}>
                      <NotificationText notification={item} />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      <TimeAgo date={item.created_at} />
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
              {nextCursor && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full rounded-lg"
                  disabled={loading}
                  onClick={() => void load(nextCursor)}
                >
                  {loading && <Loader2 className="animate-spin" />}
                  {t("more")}
                </Button>
              )}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// O texto é montado aqui, traduzido, a partir do tipo e dos dados da notificação.
function NotificationText({ notification }: { notification: AppNotification }) {
  const t = useTranslations("notifications.types");
  const tr = useTranslations("roles");
  const trs = useTranslations("restrictions");
  const trr = useTranslations("report.reasons");
  const format = useFormatter();
  const { data } = notification;
  // Motivo pronto traduzido + observação da moderação.
  const moderationReason = (d: AppNotification["data"]) =>
    [d.reason ? trr(`${d.reason as "spam"}.label`) : null, d.note ? `“${d.note}”` : null].filter(Boolean).join(" — ") ||
    "—";

  switch (notification.type) {
    case "upload_request.created":
      return t("uploadRequestCreated", { username: data.username ?? "?" });
    case "upload_request.approved":
      return t("uploadRequestApproved");
    case "upload_request.rejected":
      return data.note ? t("uploadRequestRejectedNote", { note: data.note }) : t("uploadRequestRejected");
    case "upload_access.granted":
      return t("uploadAccessGranted");
    case "upload_access.revoked":
      return data.reason ? t("uploadAccessRevokedReason", { reason: data.reason }) : t("uploadAccessRevoked");
    case "role.changed":
      return t("roleChanged", { role: tr(data.role ?? "user") });
    case "restriction.applied": {
      const types = (data.types ?? []).map((type) => trs(`types.${type}`)).join(", ");
      return data.until
        ? t("restrictionApplied", {
            types,
            until: format.dateTime(new Date(data.until), { dateStyle: "short", timeStyle: "short" }),
            reason: data.reason ?? "",
          })
        : t("restrictionAppliedPermanent", { types, reason: data.reason ?? "" });
    }
    case "restriction.revoked":
      return t("restrictionRevoked", { type: trs(`types.${data.type ?? "comment"}`) });
    case "video.under_review":
      return t("videoUnderReview", { title: data.title ?? "" });
    case "video.removed":
      return t("videoRemoved", { title: data.title ?? "", reason: moderationReason(data) });
    case "video.restored":
      return t("videoRestored", { title: data.title ?? "" });
    case "video.purged":
      return t("videoPurged", { title: data.title ?? "", reason: moderationReason(data) });
    case "comment.removed":
      return t("commentRemoved", { reason: moderationReason(data) });
    case "comment.restored":
      return t("commentRestored");
    default:
      return t("unknown");
  }
}
