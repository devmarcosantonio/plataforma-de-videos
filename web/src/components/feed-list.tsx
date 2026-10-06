"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorMessage, getJson } from "@/lib/client-api";
import type { Page, Video } from "@/lib/types";
import { VideoGrid } from "./video-card";

// Feed "Seguindo" com paginação por cursor ("Carregar mais").
export function FeedList({ initialPage }: { initialPage: Page<Video> }) {
  const [videos, setVideos] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.next_cursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!nextCursor) return;
    setLoading(true);
    try {
      const page = await getJson<Page<Video>>(`/feed?cursor=${encodeURIComponent(nextCursor)}`);
      setVideos((current) => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (error) {
      toast.error(errorMessage(error, "Não foi possível carregar mais vídeos."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <VideoGrid items={videos.map((video) => ({ video, author: video.author }))} />
      {nextCursor && (
        <div className="mt-10 flex justify-center">
          <Button variant="outline" className="rounded-full px-6" onClick={loadMore} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {loading ? "Carregando…" : "Carregar mais"}
          </Button>
        </div>
      )}
    </>
  );
}
