import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, Loader2, UploadCloud } from "lucide-react";
import { CommentSection } from "@/components/comments/comment-section";
import { FadeIn } from "@/components/fade-in";
import { ReactionButtons } from "@/components/reaction-buttons";
import { SyncButton } from "@/components/sync-button";
import { UserAvatar } from "@/components/user-avatar";
import { VideoListItem } from "@/components/video-card";
import { VideoDescription } from "@/components/video-description";
import { getComments, getPlayback, getReactionStatus, getVideo, getVideos } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { fullName, handle, STATUS_LABEL, timeAgo } from "@/lib/format";
import type { Video } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/watch/[id]">): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideo(id);
  return { title: video?.title ?? "Vídeo" };
}

export default async function WatchPage({ params }: PageProps<"/watch/[id]">) {
  const { id } = await params;

  const [video, videos, session, reactionStatus, comments] = await Promise.all([
    getVideo(id),
    getVideos(),
    getSession(),
    getReactionStatus(id),
    getComments(id),
  ]);
  if (!video) notFound();

  const playback = video.status === "ready" ? await getPlayback(video.id) : null;
  const author = video.author;
  const isOwner = session?.id === video.user_id;
  const others = videos.filter((other) => other.id !== video.id);

  return (
    <div className="mx-auto grid max-w-[1600px] gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <FadeIn y={0} className="aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl shadow-primary/10 ring-1 ring-border">
          {playback ? (
            <iframe
              src={playback.embed_url}
              title={video.title}
              className="size-full"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <PlayerPlaceholder video={video} canSync={isOwner} />
          )}
        </FadeIn>

        <FadeIn delay={0.05}>
          <h1 className="mt-5 text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{video.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <UserAvatar user={author} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{handle(author)}</p>
              <p className="truncate text-sm text-muted-foreground">{author ? fullName(author) : null}</p>
            </div>
            <ReactionButtons
              // Remonta ao entrar/sair para refletir a reação do usuário.
              key={session?.id ?? "visitante"}
              videoId={video.id}
              initial={reactionStatus ?? { reaction: null, likes_count: video.likes_count }}
              loggedIn={!!session}
              disabled={video.status !== "ready"}
            />
          </div>
        </FadeIn>

        <FadeIn delay={0.1} className="mt-4">
          <VideoDescription description={video.description} publishedLabel={`Publicado ${timeAgo(video.created_at)}`} />
        </FadeIn>

        <FadeIn delay={0.15}>
          <CommentSection
            // Remonta ao entrar/sair para atualizar as ações disponíveis.
            key={session?.id ?? "visitante"}
            videoId={video.id}
            videoOwnerId={video.user_id}
            currentUser={session}
            canComment={video.status === "ready"}
            initialPage={comments}
            initialCount={video.comments_count}
          />
        </FadeIn>
      </div>

      <aside>
        <h2 className="mb-3 px-1.5 text-sm font-medium text-muted-foreground">Outros vídeos</h2>
        {others.length === 0 ? (
          <p className="px-1.5 text-sm text-muted-foreground">Nenhum outro vídeo ainda.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {others.map((other, index) => (
              <VideoListItem key={other.id} index={index} video={other} author={other.author} />
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function PlayerPlaceholder({ video, canSync }: { video: Video; canSync: boolean }) {
  const content = {
    pending_upload: {
      icon: <UploadCloud className="size-8" />,
      text: "O arquivo deste vídeo ainda não foi enviado.",
    },
    processing: {
      icon: <Loader2 className="size-8 animate-spin" />,
      text: "O vídeo está sendo processado. Isso pode levar alguns minutos.",
    },
    failed: {
      icon: <AlertTriangle className="size-8 text-destructive" />,
      text: "O processamento deste vídeo falhou.",
    },
    ready: { icon: null, text: "" },
  }[video.status];

  return (
    <div className="flex size-full flex-col items-center justify-center gap-3 bg-linear-to-br from-black via-zinc-900 to-primary/30 p-6 text-center text-white/80">
      {content.icon}
      <p className="font-medium text-white">{STATUS_LABEL[video.status]}</p>
      <p className="max-w-sm text-sm">{content.text}</p>
      {/* Só o dono pode forçar a verificação no Bunny. */}
      {canSync && video.status !== "failed" && <SyncButton videoId={video.id} />}
    </div>
  );
}
