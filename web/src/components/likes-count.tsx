"use client";

import { useFormatter, useTranslations } from "next-intl";

// "1,2 mil curtidas" / "1.2K likes": número compacto + plural do idioma.
export function LikesCount({ count }: { count: number }) {
  const t = useTranslations("video");
  const format = useFormatter();
  return <>{t("likes", { count, formatted: format.number(count, { notation: "compact" }) })}</>;
}
