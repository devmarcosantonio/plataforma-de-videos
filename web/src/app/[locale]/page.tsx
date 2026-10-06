import { getTranslations } from "next-intl/server";
import { SearchX, Upload, VideoOff } from "lucide-react";
import { ContinueWatching } from "@/components/continue-watching";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { VideoGrid } from "@/components/video-card";
import { Link } from "@/i18n/navigation";
import { getContinueWatching, getVideos } from "@/lib/api";
import { getSession } from "@/lib/auth";

export default async function HomePage({ searchParams }: PageProps<"/[locale]">) {
  const t = await getTranslations("home");
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  const session = await getSession();
  const [videos, continueWatching] = await Promise.all([
    getVideos(),
    // Só para quem está logado e fora da busca.
    session && !query ? getContinueWatching() : Promise.resolve([]),
  ]);

  const filtered = videos
    .filter((video) => !query || video.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (videos.length === 0) {
    return (
      <EmptyState icon={<VideoOff />} title={t("empty")} description={t("emptyHint")}>
        <Button asChild className="rounded-full px-5">
          <Link href="/upload">
            <Upload />
            {t("upload")}
          </Link>
        </Button>
      </EmptyState>
    );
  }

  if (filtered.length === 0) {
    return <EmptyState icon={<SearchX />} title={t("noResults", { query })} description={t("noResultsHint")} />;
  }

  return (
    <section>
      <ContinueWatching items={continueWatching} />
      {query && (
        <p className="mb-6 text-sm text-muted-foreground">
          {t("results", { count: filtered.length })} <span className="font-medium text-foreground">“{query}”</span>
        </p>
      )}
      <VideoGrid items={filtered.map((video) => ({ video, author: video.author }))} />
    </section>
  );
}
