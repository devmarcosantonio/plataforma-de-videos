"use client";

import { useFormatter, useNow } from "next-intl";

// "há 2 dias" / "2 days ago" / "hace 2 días", no idioma atual; atualiza a cada minuto.
export function TimeAgo({ date }: { date: string }) {
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const value = new Date(date);

  return (
    <time dateTime={value.toISOString()} title={format.dateTime(value, { dateStyle: "long", timeStyle: "short" })}>
      {format.relativeTime(value, now)}
    </time>
  );
}
