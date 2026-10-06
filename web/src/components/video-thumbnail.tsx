"use client";

import { useState } from "react";
import Image from "next/image";
import { Film, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/format";
import type { Video } from "@/lib/types";
import { cn } from "@/lib/utils";

export function VideoThumbnail({ video, sizes, className }: { video: Video; sizes: string; className?: string }) {
  const t = useTranslations("video.status");
  const [failed, setFailed] = useState(false);
  const duration = formatDuration(video.duration);
  const progress = video.watch_progress;
  // Fração assistida (0 a 1): concluído = barra cheia.
  const watched = !progress
    ? 0
    : progress.completed
      ? 1
      : video.duration
        ? Math.min(progress.position_seconds / video.duration, 1)
        : 0;

  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-xl bg-muted", className)}>
      {video.thumbnail_url && !failed ? (
        <Image
          src={video.thumbnail_url}
          alt=""
          fill
          sizes={sizes}
          // O Bunny bloqueia acesso sem Referer (proteção contra hotlink). O otimizador do Next
          // busca a imagem no servidor, sem Referer, e recebe 403; então o navegador carrega direto.
          unoptimized
          onError={() => setFailed(true)}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="grid h-full place-items-center bg-linear-to-br from-primary/25 via-muted to-card">
          <Film className="size-8 text-muted-foreground" />
        </div>
      )}

      {/* Escurece e mostra o "play" ao passar o mouse. */}
      <div className="absolute inset-0 grid place-items-center bg-black/0 transition-colors duration-300 group-hover:bg-black/25">
        <span className="grid size-12 scale-75 place-items-center rounded-full bg-background/90 text-foreground opacity-0 shadow-lg transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
          <Play className="ml-0.5 size-5 fill-current" />
        </span>
      </div>

      {video.status !== "ready" && (
        <Badge
          variant={video.status === "failed" ? "destructive" : "secondary"}
          className="absolute left-2 top-2 backdrop-blur"
        >
          {t(video.status)}
        </Badge>
      )}

      {duration && (
        <span
          className={cn(
            "absolute right-2 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-xs text-white backdrop-blur",
            watched > 0 ? "bottom-3" : "bottom-2",
          )}
        >
          {duration}
        </span>
      )}

      {/* Quanto do vídeo o usuário logado já assistiu. */}
      {watched > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30" aria-hidden>
          <div className="h-full bg-primary" style={{ width: `${watched * 100}%` }} />
        </div>
      )}
    </div>
  );
}
