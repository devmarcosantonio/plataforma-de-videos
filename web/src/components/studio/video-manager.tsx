"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, Film, MessageSquare, MoreVertical, Pencil, Plus, ThumbsUp, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { AnimatedNumber } from "@/components/animated-number";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { Link } from "@/i18n/navigation";
import { errorMessage, sendJson } from "@/lib/client-api";
import type { Video, VideoVisibility } from "@/lib/types";
import { VideoModerationBadge } from "../video-moderation-badge";
import { DeleteVideoDialog } from "./delete-video-dialog";
import { EditVideoDialog } from "./edit-video-dialog";

type Props = { initialVideos: Video[] };

export function VideoManager({ initialVideos }: Props) {
  const t = useTranslations("studio");
  const [videos, setVideos] = useState(initialVideos);
  const [editing, setEditing] = useState<Video | null>(null);
  const [deleting, setDeleting] = useState<Video | null>(null);

  const totals = {
    videos: videos.length,
    likes: videos.reduce((sum, video) => sum + video.likes_count, 0),
    comments: videos.reduce((sum, video) => sum + video.comments_count, 0),
  };

  async function save(video: Video, changes: { title: string; description: string; visibility: VideoVisibility }) {
    try {
      const updated = await sendJson<Video>("PATCH", `/videos/${video.id}`, changes);
      setVideos((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(t("updated"));
    } catch (error) {
      toast.error(errorMessage(error, t("saveError")));
      throw error;
    }
  }

  async function remove(video: Video) {
    try {
      await sendJson<void>("DELETE", `/videos/${video.id}`, {});
      setVideos((current) => current.filter((item) => item.id !== video.id));
      toast.success(t("deleted", { title: video.title }));
    } catch (error) {
      toast.error(errorMessage(error, t("deleteError")));
      throw error;
    }
  }

  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Film />} label={t("stats.videos")} value={totals.videos} delay={0} />
        <StatCard icon={<ThumbsUp />} label={t("stats.likes")} value={totals.likes} delay={0.05} />
        <StatCard icon={<MessageSquare />} label={t("stats.comments")} value={totals.comments} delay={0.1} />
      </div>

      <div className="mt-10 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">{t("myVideos")}</h2>
        <Button asChild className="rounded-full">
          <Link href="/upload">
            <Plus />
            {t("upload")}
          </Link>
        </Button>
      </div>

      {videos.length === 0 ? (
        <EmptyState icon={<Film />} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {/* Cabeçalho das colunas (só em telas largas). */}
          <div className="hidden grid-cols-[minmax(0,1fr)_120px_110px_90px_90px_40px] gap-4 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground lg:grid">
            <span>{t("columns.video")}</span>
            <span>{t("columns.status")}</span>
            <span>{t("columns.date")}</span>
            <span className="text-right">{t("columns.likes")}</span>
            <span className="text-right">{t("columns.comments")}</span>
            <span />
          </div>

          <AnimatePresence initial={false}>
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.03 * index } }}
                exit={{ opacity: 0, x: -40, height: 0, marginTop: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <VideoRow video={video} onEdit={() => setEditing(video)} onDelete={() => setDeleting(video)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <EditVideoDialog
        video={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSave={(changes) => save(editing!, changes)}
      />
      <DeleteVideoDialog
        video={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => remove(deleting!)}
      />
    </>
  );
}

function StatCard({ icon, label, value, delay }: { icon: React.ReactNode; label: string; value: number; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 24 }}
    >
      <Card className="py-5">
        <CardContent className="flex items-center gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5">{icon}</span>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <AnimatedNumber value={value} className="text-2xl font-semibold" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function VideoRow({ video, onEdit, onDelete }: { video: Video; onEdit: () => void; onDelete: () => void }) {
  const t = useTranslations("studio");
  const format = useFormatter();
  const date = format.dateTime(new Date(video.created_at), { dateStyle: "medium" });
  return (
    <Card className="relative py-3 transition-colors hover:bg-muted/40">
      <CardContent className="grid items-center gap-4 px-3 sm:px-4 lg:grid-cols-[minmax(0,1fr)_120px_110px_90px_90px_40px]">
        <div className="flex min-w-0 items-center gap-4">
          <Link href={`/watch/${video.id}`} className="group w-32 shrink-0 sm:w-40">
            <VideoThumbnail video={video} sizes="160px" className="rounded-lg" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 pr-10 font-medium leading-snug lg:pr-0">{video.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <VideoModerationBadge video={video} />
            </div>
            {video.moderation_status !== "active" && <ModerationNote video={video} />}
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{video.description || t("noDescription")}</p>
            {/* Em telas pequenas, os dados das colunas aparecem aqui. */}
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground lg:hidden">
              <StatusBadge video={video} />
              <span>{date}</span>
              <span>{t("likesCount", { count: video.likes_count })}</span>
              <span>{t("commentsCount", { count: video.comments_count })}</span>
            </p>
          </div>
        </div>

        <div className="hidden lg:block">
          <StatusBadge video={video} />
        </div>
        <span className="hidden text-sm text-muted-foreground lg:block">
          {date}
        </span>
        <span className="hidden text-right font-mono text-sm tabular-nums lg:block">{video.likes_count}</span>
        <span className="hidden text-right font-mono text-sm tabular-nums lg:block">{video.comments_count}</span>

        <div className="absolute right-3 top-3 lg:static">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("actions", { title: video.title })}>
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/watch/${video.id}`}>
                  <Eye />
                  {t("view")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil />
                {t("edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 />
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// Por que a moderação tirou o vídeo do ar (motivo pronto + observação).
function ModerationNote({ video }: { video: Video }) {
  const t = useTranslations("visibility");
  const tr = useTranslations("report.reasons");
  const reason = video.moderation_reason ? tr(`${video.moderation_reason}.label`) : null;
  return (
    <p className="mt-1 text-xs text-destructive">
      {t(video.moderation_status === "removed" ? "removedHint" : "underReviewHint")}
      {reason && ` ${t("reason", { reason })}`}
      {video.moderation_note && ` — “${video.moderation_note}”`}
    </p>
  );
}

function StatusBadge({ video }: { video: Video }) {
  const t = useTranslations("video.status");
  const variant = video.status === "failed" ? "destructive" : video.status === "ready" ? "secondary" : "outline";
  return (
    <Badge variant={variant} className={video.status === "ready" ? "bg-primary/15 text-primary" : undefined}>
      {t(video.status)}
    </Badge>
  );
}
