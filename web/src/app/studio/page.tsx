import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/fade-in";
import { VideoManager } from "@/components/studio/video-manager";
import { UserAvatar } from "@/components/user-avatar";
import { getProfile, getVideosByUser } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { channelHref, formatFollowers, fullName, handle } from "@/lib/format";

export const metadata: Metadata = { title: "Meu canal" };

export default async function StudioPage() {
  const user = await requireSession("/studio");
  const [videos, profile] = await Promise.all([getVideosByUser(user.id), getProfile(user.username)]);

  return (
    <div className="mx-auto max-w-6xl">
      <FadeIn className="flex flex-wrap items-center gap-4">
        <UserAvatar user={user} size="lg" className="size-16 text-xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Meu canal</h1>
          <p className="text-sm text-muted-foreground">
            {fullName(user)} ·{" "}
            <Link href={channelHref(user)} className="hover:text-primary">
              {handle(user)}
            </Link>{" "}
            · {formatFollowers(profile?.followers_count ?? 0)}
          </p>
        </div>
      </FadeIn>

      <VideoManager initialVideos={videos} />
    </div>
  );
}
