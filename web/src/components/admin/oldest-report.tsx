"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { TimeAgo } from "../time-ago";

// "Denúncia mais antiga aberta há 3 dias": mostra se a moderação está dando conta da fila.
export function OldestReport({ since }: { since: string }) {
  const t = useTranslations("admin.reports");
  return (
    <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="size-3.5" />
      {t("oldestOpen")} <TimeAgo date={since} />
    </p>
  );
}
