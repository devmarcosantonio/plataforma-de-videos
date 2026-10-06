"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNow, useTranslations } from "next-intl";
import { History, Loader2, PauseCircle, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { TimeAgo } from "@/components/time-ago";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { Link } from "@/i18n/navigation";
import { errorMessage, getJson, sendJson } from "@/lib/client-api";
import { channelHref, handle } from "@/lib/format";
import type { HistoryItem, Page, Settings } from "@/lib/types";

type Group = "today" | "yesterday" | "thisWeek" | "older";
const GROUPS: Group[] = ["today", "yesterday", "thisWeek", "older"];

// Agrupa pela data em que foi assistido, relativa a agora (no fuso do navegador).
function groupOf(date: Date, now: Date): Group {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  const time = date.getTime();
  if (time >= startOfToday) return "today";
  if (time >= startOfToday - day) return "yesterday";
  if (time >= startOfToday - 6 * day) return "thisWeek";
  return "older";
}

type Props = { initialPage: Page<HistoryItem>; initialSettings: Settings };

export function HistoryList({ initialPage, initialSettings }: Props) {
  const t = useTranslations("history");
  const tc = useTranslations("common");
  const now = useNow();
  const [items, setItems] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.next_cursor);
  const [paused, setPaused] = useState(initialSettings.history_paused);
  const [loadingMore, setLoadingMore] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function togglePause(value: boolean) {
    setPaused(value);
    try {
      await sendJson<Settings>("PATCH", "/me/settings", { history_paused: value });
      toast.success(value ? t("paused") : t("resumed"));
    } catch (error) {
      setPaused(!value);
      toast.error(errorMessage(error, t("errors.settings")));
    }
  }

  async function remove(videoId: string) {
    const previous = items;
    setItems((current) => current.filter((item) => item.video.id !== videoId));
    try {
      await sendJson<void>("DELETE", `/me/history/${videoId}`, {});
      toast.success(t("removed"));
    } catch (error) {
      setItems(previous);
      toast.error(errorMessage(error, t("errors.remove")));
    }
  }

  async function clear() {
    setClearing(true);
    try {
      await sendJson<{ removed: number }>("DELETE", "/me/history", {});
      setItems([]);
      setNextCursor(null);
      setConfirmClear(false);
      toast.success(t("cleared"));
    } catch (error) {
      toast.error(errorMessage(error, t("errors.clear")));
    } finally {
      setClearing(false);
    }
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await getJson<Page<HistoryItem>>(`/me/history?cursor=${encodeURIComponent(nextCursor)}`);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (error) {
      toast.error(errorMessage(error, t("errors.loadMore")));
    } finally {
      setLoadingMore(false);
    }
  }

  const grouped = GROUPS.map((group) => ({
    group,
    items: items.filter((item) => groupOf(new Date(item.last_watched_at), now) === group),
  })).filter(({ items }) => items.length > 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <AnimatePresence>
          {paused && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 flex items-center gap-2 overflow-hidden rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground"
            >
              <PauseCircle className="size-4 shrink-0 text-primary" />
              {t("pausedBanner")}
            </motion.p>
          )}
        </AnimatePresence>

        {items.length === 0 ? (
          <EmptyState icon={<History />} title={t("empty")} description={t("emptyHint")} />
        ) : (
          <div className="flex flex-col gap-8">
            {grouped.map(({ group, items }) => (
              <section key={group}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(`groups.${group}`)}
                </h2>
                <div className="flex flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.div
                        key={item.video.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -40, height: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      >
                        <HistoryRow item={item} onRemove={() => remove(item.video.id)} removeLabel={t("remove")} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            ))}
            {nextCursor && (
              <Button variant="outline" className="w-fit rounded-full px-6" onClick={loadMore} disabled={loadingMore}>
                {loadingMore && <Loader2 className="animate-spin" />}
                {loadingMore ? tc("loading") : tc("loadMore")}
              </Button>
            )}
          </div>
        )}
      </div>

      <aside className="flex h-fit flex-col gap-5 rounded-2xl border bg-card p-5 lg:sticky lg:top-24">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label htmlFor="pause-history" className="font-medium">
              {t("pause")}
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">{t("pauseHint")}</p>
          </div>
          <Switch id="pause-history" checked={paused} onCheckedChange={togglePause} />
        </div>
        <Button
          variant="outline"
          className="rounded-full"
          disabled={items.length === 0}
          onClick={() => setConfirmClear(true)}
        >
          <Trash2 />
          {t("clear")}
        </Button>
      </aside>

      <AlertDialog open={confirmClear} onOpenChange={(open) => !clearing && setConfirmClear(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clearTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("clearDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>{tc("cancel")}</AlertDialogCancel>
            <Button variant="destructive" onClick={clear} disabled={clearing}>
              {clearing ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {t("clear")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function HistoryRow({ item, onRemove, removeLabel }: { item: HistoryItem; onRemove: () => void; removeLabel: string }) {
  const t = useTranslations("history");
  const video = { ...item.video, watch_progress: { position_seconds: item.position_seconds, completed: item.completed } };

  return (
    <div className="group/row flex gap-4 rounded-xl p-2 transition-colors hover:bg-muted/50">
      <Link href={`/watch/${video.id}`} className="group w-40 shrink-0 sm:w-48">
        <VideoThumbnail video={video} sizes="192px" className="rounded-lg" />
      </Link>
      <div className="min-w-0 flex-1 py-1">
        <Link href={`/watch/${video.id}`} className="line-clamp-2 font-medium leading-snug hover:text-primary">
          {video.title}
        </Link>
        <Link href={channelHref(video.author)} className="mt-1 block text-sm text-muted-foreground hover:text-primary">
          {handle(video.author)}
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.rich("watched", { time: () => <TimeAgo date={item.last_watched_at} /> })}
        </p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full opacity-100 transition-opacity sm:opacity-0 sm:group-hover/row:opacity-100 sm:focus-visible:opacity-100"
            aria-label={removeLabel}
            onClick={onRemove}
          >
            <X />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{removeLabel}</TooltipContent>
      </Tooltip>
    </div>
  );
}
