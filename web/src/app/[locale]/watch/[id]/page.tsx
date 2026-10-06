import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, Loader2, UploadCloud } from "lucide-react";
import { CommentSection } from "@/components/comments/comment-section";
import { FadeIn } from "@/components/fade-in";
import { FollowButton, FollowersCount, FollowProvider } from "@/components/follow/follow";
import { ReactionButtons } from "@/components/reaction-buttons";
import { SyncButton } from "@/components/sync-button";
import { UserAvatar } from "@/components/user-avatar";
import { VideoListItem } from "@/components/video-card";
import { VideoPlayer } from "@/components/video-player";
import { VideoDescription } from "@/components/video-description";
import { Link } from "@/i18n/navigation";
import { getComments, getPlayback, getProfile, getReactionStatus, getVideo, getVideos } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { channelHref, handle } from "@/lib/format";
import type { Video } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/[locale]/watch/[id]">): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideo(id);
  // Título do vídeo é conteúdo do usuário: fica no idioma em que foi escrito.
  return { title: video?.title ?? "404" };
}

export default async function WatchPage({ params }: PageProps<"/[locale]/watch/[id]">) {
  const { id } = await params;
  const t = await getTranslations("video");

  const [video, videos, session, reactionStatus, comments] = await Promise.all([
    getVideo(id),
    getVideos(),
    getSession(),
    getReactionStatus(id),
    getComments(id),
  ]);
  if (!video) notFound();

  const [playback, authorProfile] = await Promise.all([
    video.status === "ready" ? getPlayback(video.id) : null,
    getProfile(video.author.username),
  ]);
  const author = video.author;
  const isOwner = session?.id === video.user_id;

  // Retoma de onde parou: só se assistiu um pouco (≥ 10 s), não concluiu e não está no finalzinho.
  const progress = video.watch_progress;
  const resumeAt =
    progress && !progress.completed && progress.position_seconds >= 10 &&
    (!video.duration || progress.position_seconds < video.duration - 10)
      ? progress.position_seconds
      : 0;
  const others = videos.filter((other) => other.id !== video.id);

  return (
    <div className="mx-auto grid max-w-[1600px] gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <FadeIn y={0} className="aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl shadow-primary/10 ring-1 ring-border">
          {playback ? (
            <VideoPlayer
              // Remonta ao entrar/sair para ligar ou desligar o salvamento do progresso.
              key={`player-${session?.id ?? "visitante"}`}
              videoId={video.id}
              embedUrl={playback.embed_url}
              title={video.title}
              resumeAt={resumeAt}
              trackProgress={!!session}
            />
          ) : (
            <PlayerPlaceholder video={video} canSync={isOwner} />
          )}
        </FadeIn>

        <FadeIn delay={0.05}>
          <h1 className="mt-5 text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{video.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <FollowProvider
              // Remonta ao entrar/sair para refletir se o usuário segue o autor.
              key={`follow-${session?.id ?? "visitante"}`}
              userId={author.id}
              initial={{
                following: authorProfile?.is_following ?? false,
                followers_count: authorProfile?.followers_count ?? 0,
              }}
              loggedIn={!!session}
              isSelf={isOwner}
            >
              <Link href={channelHref(author)} className="group flex min-w-0 flex-1 items-center gap-3">
                <UserAvatar user={author} size="lg" className="transition-transform group-hover:scale-105" />
                <div className="min-w-0">
                  <p className="font-medium transition-colors group-hover:text-primary">{handle(author)}</p>
                  <FollowersCount className="text-sm text-muted-foreground" />
                </div>
              </Link>
              <FollowButton />
            </FollowProvider>
            <ReactionButtons
              // Remonta ao entrar/sair para refletir a reação do usuário.
              key={`reaction-${session?.id ?? "visitante"}`}
              videoId={video.id}
              initial={reactionStatus ?? { reaction: null, likes_count: video.likes_count }}
              loggedIn={!!session}
              disabled={video.status !== "ready"}
            />
          </div>
        </FadeIn>

        <FadeIn delay={0.1} className="mt-4">
          <VideoDescription description={video.description} publishedAt={video.created_at} />
        </FadeIn>

        <FadeIn delay={0.15}>
          <CommentSection
            // Remonta ao entrar/sair para atualizar as ações disponíveis.
            key={`comments-${session?.id ?? "visitante"}`}
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
        <h2 className="mb-3 px-1.5 text-sm font-medium text-muted-foreground">{t("otherVideos")}</h2>
        {others.length === 0 ? (
          <p className="px-1.5 text-sm text-muted-foreground">{t("noOtherVideos")}</p>
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

async function PlayerPlaceholder({ video, canSync }: { video: Video; canSync: boolean }) {
  const t = await getTranslations("video");
  const icon = {
    pending_upload: <UploadCloud className="size-8" />,
    processing: <Loader2 className="size-8 animate-spin" />,
    failed: <AlertTriangle className="size-8 text-destructive" />,
    ready: null,
  }[video.status];

  return (
    <div className="flex size-full flex-col items-center justify-center gap-3 bg-linear-to-br from-black via-zinc-900 to-primary/30 p-6 text-center text-white/80">
      {icon}
      <p className="font-medium text-white">{t(`status.${video.status}`)}</p>
      {video.status !== "ready" && <p className="max-w-sm text-sm">{t(`player.${video.status}`)}</p>}
      {/* Só o dono pode forçar a verificação no Bunny. */}
      {canSync && video.status !== "failed" && <SyncButton videoId={video.id} />}
    </div>
  );
}
