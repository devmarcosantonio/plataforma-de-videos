"use client";

import { EyeOff, Lock, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Video } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { video: Video; isOwner: boolean };

// Na página do vídeo, para quem consegue ver um vídeo que os outros não veem (o dono ou a moderação).
export function HiddenNotice({ video, isOwner }: Props) {
  const t = useTranslations("visibility");
  const tr = useTranslations("report.reasons");
  const moderated = video.moderation_status !== "active";
  const reason = video.moderation_reason ? tr(`${video.moderation_reason}.label`) : null;
  const Icon = video.moderation_status === "removed" ? EyeOff : moderated ? ShieldAlert : Lock;

  return (
    <div
      className={cn(
        "mt-4 flex gap-3 rounded-xl border p-4 text-sm",
        moderated ? "border-destructive/30 bg-destructive/5" : "bg-muted/50",
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", moderated ? "text-destructive" : "text-muted-foreground")} />
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">
          {moderated
            ? t(video.moderation_status === "removed" ? "removedHint" : "underReviewHint")
            : t(isOwner ? "privateOwnerHint" : "privateStaffHint")}
        </p>
        {moderated && (reason || video.moderation_note) && (
          <p className="text-muted-foreground">
            {reason && t("reason", { reason })}
            {video.moderation_note && ` — “${video.moderation_note}”`}
          </p>
        )}
        {!isOwner && moderated && <p className="text-xs text-muted-foreground">{t("staffOnly")}</p>}
      </div>
    </div>
  );
}
