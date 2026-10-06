"use client";

import { Ban } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ActiveRestriction } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { restriction: ActiveRestriction; className?: string };

// "Você não pode comentar até 13/10 às 15:00. Motivo: …" — no lugar da ação bloqueada.
export function RestrictionNotice({ restriction, className }: Props) {
  const t = useTranslations("restrictions");
  const format = useFormatter();
  const until = restriction.until
    ? format.dateTime(new Date(restriction.until), { dateStyle: "short", timeStyle: "short" })
    : null;

  return (
    <div className={cn("flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm", className)}>
      <Ban className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">
          {until
            ? t(`notice.${restriction.type}`, { until })
            : t(`noticePermanent.${restriction.type}`)}
        </p>
        <p className="whitespace-pre-line text-muted-foreground">{t("reason", { reason: restriction.reason })}</p>
      </div>
    </div>
  );
}
