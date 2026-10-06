import { getTranslations } from "next-intl/server";
import { LogList } from "@/components/admin/log-list";
import { getModerationLogs } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";

// Admin vê todas as ações; moderador, só as próprias.
export default async function AdminLogsPage() {
  const user = await requireSession("/admin/logs");
  const [t, page] = await Promise.all([getTranslations("admin.logs"), getModerationLogs()]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{isAdmin(user) ? t("allHint") : t("mineHint")}</p>
      <LogList initialPage={page} />
    </div>
  );
}
