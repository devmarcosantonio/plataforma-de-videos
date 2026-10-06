import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MonitorPlay, VideoOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { FadeIn } from "@/components/fade-in";
import { FollowButton, FollowersCount, FollowProvider } from "@/components/follow/follow";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { VideoGrid } from "@/components/video-card";
import { getProfile, getVideosByUser } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { fullName, handle } from "@/lib/format";

// Servida em /@username (rewrite no next.config.ts).
export async function generateMetadata({ params }: PageProps<"/channel/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(decodeURIComponent(username));
  return { title: profile ? `${fullName(profile)} (${handle(profile)})` : "Canal" };
}

export default async function ChannelPage({ params }: PageProps<"/channel/[username]">) {
  const { username } = await params;
  const [profile, session] = await Promise.all([getProfile(decodeURIComponent(username)), getSession()]);
  if (!profile) notFound();

  const isSelf = session?.id === profile.id;
  // O canal público mostra só vídeos prontos (o "Meu canal" mostra todos para o dono).
  const videos = (await getVideosByUser(profile.id)).filter((video) => video.status === "ready");

  return (
    <FollowProvider
      // Remonta ao entrar/sair para refletir se o usuário segue o canal.
      key={session?.id ?? "visitante"}
      userId={profile.id}
      initial={{ following: profile.is_following, followers_count: profile.followers_count }}
      loggedIn={!!session}
      isSelf={isSelf}
    >
      <div className="mx-auto max-w-[1600px]">
        <FadeIn y={0} className="relative overflow-hidden rounded-3xl border bg-card">
          {/* Faixa decorativa no topo do canal. */}
          <div className="h-28 bg-linear-to-r from-primary/40 via-primary/15 to-accent sm:h-36" />
          <div className="flex flex-col gap-4 px-5 pb-6 sm:flex-row sm:items-end sm:px-8">
            <UserAvatar
              user={profile}
              size="lg"
              className="-mt-12 size-24 text-3xl ring-4 ring-card sm:-mt-14 sm:size-28"
            />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{fullName(profile)}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{handle(profile)}</span>
                <span>·</span>
                <FollowersCount />
                <span>·</span>
                <span>
                  {profile.videos_count} vídeo{profile.videos_count === 1 ? "" : "s"}
                </span>
              </p>
            </div>
            {isSelf ? (
              <Button asChild variant="secondary" className="h-9 rounded-full px-4">
                <Link href="/studio">
                  <MonitorPlay />
                  Gerenciar canal
                </Link>
              </Button>
            ) : (
              <FollowButton />
            )}
          </div>
        </FadeIn>

        <section className="mt-8">
          <h2 className="mb-5 text-lg font-semibold">Vídeos</h2>
          {videos.length === 0 ? (
            <EmptyState icon={<VideoOff />} title="Nenhum vídeo publicado" description="Este canal ainda não publicou vídeos." />
          ) : (
            <VideoGrid items={videos.map((video) => ({ video, author: video.author }))} />
          )}
        </section>
      </div>
    </FollowProvider>
  );
}
