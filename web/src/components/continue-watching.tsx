"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { PlayCircle } from "lucide-react";
import type { HistoryItem } from "@/lib/types";
import { VideoCard } from "./video-card";

// Faixa horizontal na home com os vídeos começados e não terminados.
export function ContinueWatching({ items }: { items: HistoryItem[] }) {
  const t = useTranslations("history");
  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <PlayCircle className="size-5 text-primary" />
        {t("continueWatching")}
      </h2>
      {/* snap: a rolagem para no início de cada card. */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        {items.map((item, index) => (
          <motion.div
            key={item.video.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 * index, type: "spring", stiffness: 260, damping: 26 }}
            className="w-64 shrink-0 snap-start sm:w-72"
          >
            <VideoCard
              video={{
                ...item.video,
                watch_progress: { position_seconds: item.position_seconds, completed: item.completed },
              }}
              author={item.video.author}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
