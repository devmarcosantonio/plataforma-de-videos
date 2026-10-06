import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { FeedList } from "@/components/feed-list";
import { Button } from "@/components/ui/button";
import { getFeed } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Seguindo" };

export default async function FollowingPage() {
  await requireSession("/following");
  const page = await getFeed();

  return (
    <section className="mx-auto max-w-[1600px]">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Seguindo</h1>
      {page.items.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="Nada por aqui ainda"
          description="Siga canais para ver os vídeos novos deles neste lugar."
        >
          <Button asChild className="rounded-full px-5">
            <Link href="/">
              <Compass />
              Descobrir vídeos
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <FeedList initialPage={page} />
      )}
    </section>
  );
}
