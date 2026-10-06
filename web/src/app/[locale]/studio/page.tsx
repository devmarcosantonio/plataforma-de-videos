import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { FadeIn } from "@/components/fade-in";
import { VideoManager } from "@/components/studio/video-manager";
import { UserAvatar } from "@/components/user-avatar";
import { Link } from "@/i18n/navigation";
import { getProfile, getVideosByUser } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { channelHref, handle } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("studio");
  return { title: t("title") };
}

export default async function StudioPage() {
  const user = await requireSession("/studio");
  const [videos, profile, t, format] = await Promise.all([
    getVideosByUser(user.id),
    getProfile(user.username),
    getTranslations(),
    getFormatter(),
  ]);
  const followers = profile?.followers_count ?? 0;

  return (
    <div className="mx-auto max-w-6xl">
      <FadeIn className="flex flex-wrap items-center gap-4">
        <UserAvatar user={user} size="lg" className="size-16 text-xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("studio.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {user.display_name} ·{" "}
            <Link href={channelHref(user)} className="hover:text-primary">
              {handle(user)}
            </Link>{" "}
            · {t("follow.followers", { count: followers, formatted: format.number(followers, { notation: "compact" }) })}
          </p>
        </div>
      </FadeIn>

      <VideoManager initialVideos={videos} />
    </div>
  );
}
