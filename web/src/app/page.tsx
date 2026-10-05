import Link from "next/link";
import { SearchX, Upload, VideoOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { VideoGrid } from "@/components/video-card";
import { getUsersById, getVideos } from "@/lib/api";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  const [videos, users] = await Promise.all([getVideos(), getUsersById()]);

  const filtered = videos
    .filter((video) => !query || video.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (videos.length === 0) {
    return (
      <EmptyState icon={<VideoOff />} title="Nenhum vídeo ainda" description="Envie o primeiro vídeo para ele aparecer aqui.">
        <Button asChild className="rounded-full px-5">
          <Link href="/upload">
            <Upload />
            Enviar vídeo
          </Link>
        </Button>
      </EmptyState>
    );
  }

  if (filtered.length === 0) {
    return <EmptyState icon={<SearchX />} title={`Nada encontrado para “${query}”`} description="Tente outras palavras." />;
  }

  return (
    <section>
      {query && (
        <p className="mb-6 text-sm text-muted-foreground">
          {filtered.length} resultado{filtered.length > 1 && "s"} para{" "}
          <span className="font-medium text-foreground">“{query}”</span>
        </p>
      )}
      <VideoGrid items={filtered.map((video) => ({ video, author: users.get(video.user_id) }))} />
    </section>
  );
}
