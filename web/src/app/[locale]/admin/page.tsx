import { getTranslations } from "next-intl/server";
import { RequestQueue } from "@/components/admin/request-queue";
import { Link } from "@/i18n/navigation";
import { getUploadRequests } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import type { ReviewStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUSES: ReviewStatus[] = ["pending", "approved", "rejected"];

// Fila de pedidos de permissão para publicar.
export default async function AdminRequestsPage({ searchParams }: PageProps<"/[locale]/admin">) {
  const user = await requireSession("/admin");
  const { status: raw } = await searchParams;
  const status = STATUSES.find((value) => value === raw) ?? "pending";
  const [t, page] = await Promise.all([getTranslations("admin.requests"), getUploadRequests(status)]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((value) => (
          <Link
            key={value}
            href={value === "pending" ? "/admin" : `/admin?status=${value}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              value === status ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {t(`filter.${value}`)}
          </Link>
        ))}
      </div>
      <RequestQueue key={status} status={status} initialPage={page} currentUserId={user.id} />
    </div>
  );
}
