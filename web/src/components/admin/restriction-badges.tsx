"use client";

import { Ban, Clock } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { Access } from "@/lib/types";

// Selos das restrições ativas: "Comentários · até 13/10", "Banido".
export function RestrictionBadges({ access }: { access: Access }) {
  const t = useTranslations("restrictions");
  const format = useFormatter();
  if (access.restrictions.length === 0) return null;

  return (
    <>
      {access.restrictions.map((restriction) => (
        <Badge key={restriction.id} variant="destructive" title={restriction.reason}>
          {restriction.until ? <Clock /> : <Ban />}
          {t(`types.${restriction.type}`)}
          {restriction.until &&
            ` · ${t("until", { date: format.dateTime(new Date(restriction.until), { dateStyle: "short" }) })}`}
        </Badge>
      ))}
    </>
  );
}
