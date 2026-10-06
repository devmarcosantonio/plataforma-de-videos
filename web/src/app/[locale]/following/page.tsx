import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Compass, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { FeedList } from "@/components/feed-list";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getFeed } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feed");
  return { title: t("title") };
}

export default async function FollowingPage() {
  await requireSession("/following");
  const [t, page] = await Promise.all([getTranslations("feed"), getFeed()]);

  return (
    <section className="mx-auto max-w-[1600px]">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("title")}</h1>
      {page.items.length === 0 ? (
        <EmptyState icon={<Users />} title={t("empty")} description={t("emptyHint")}>
          <Button asChild className="rounded-full px-5">
            <Link href="/">
              <Compass />
              {t("discover")}
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <FeedList initialPage={page} />
      )}
    </section>
  );
}
