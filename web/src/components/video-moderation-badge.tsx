"use client";

import { EyeOff, Globe, Lock, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { Video } from "@/lib/types";

type Props = { video: Pick<Video, "visibility" | "moderation_status" | "moderation_reason" | "moderation_note"> };

// Situação do vídeo para o dono: decisão da moderação (tem prioridade) ou a visibilidade escolhida.
export function VideoModerationBadge({ video }: Props) {
  const t = useTranslations("visibility");
  const tr = useTranslations("report.reasons");

  if (video.moderation_status !== "active") {
    const reason = video.moderation_reason ? tr(`${video.moderation_reason}.label`) : null;
    const title = [reason, video.moderation_note].filter(Boolean).join(" — ") || undefined;
    return (
      <Badge variant="destructive" title={title}>
        {video.moderation_status === "removed" ? <EyeOff /> : <ShieldAlert />}
        {t(video.moderation_status === "removed" ? "removed" : "underReview")}
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      {video.visibility === "public" ? <Globe /> : <Lock />}
      {t(`${video.visibility}.label`)}
    </Badge>
  );
}
