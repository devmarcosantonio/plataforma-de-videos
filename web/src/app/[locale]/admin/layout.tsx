import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { OldestReport } from "@/components/admin/oldest-report";
import { getAdminSummary } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title") };
}

// Área de moderação: só moderador e admin. Para os demais, a página "não existe".
export default async function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  const user = await requireSession("/admin");
  if (!isStaff(user)) notFound();
  const [t, tr, summary] = await Promise.all([getTranslations("admin"), getTranslations("roles"), getAdminSummary()]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle", { role: tr(user.role) })}</p>
        </div>
      </div>
      <AdminTabs counts={{ requests: summary?.pending_requests ?? 0, reports: summary?.open_reports ?? 0 }} />
      {summary?.oldest_open_report_at && <OldestReport since={summary.oldest_open_report_at} />}
      <div className="mt-6">{children}</div>
    </div>
  );
}
