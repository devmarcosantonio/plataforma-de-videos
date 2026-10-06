import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HistoryList } from "@/components/history/history-list";
import { getHistory, getSettings } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("history");
  return { title: t("title") };
}

export default async function HistoryPage() {
  await requireSession("/history");
  const [t, page, settings] = await Promise.all([getTranslations("history"), getHistory(), getSettings()]);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <HistoryList initialPage={page} initialSettings={settings ?? { history_paused: false }} />
    </div>
  );
}
