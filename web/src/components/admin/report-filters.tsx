"use client";

import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useRouter } from "@/i18n/navigation";
import type { ReportCaseSort, ReportCaseStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUSES: ReportCaseStatus[] = ["open", "actioned", "dismissed"];
const SORTS: ReportCaseSort[] = ["priority", "oldest", "newest", "most_reported", "least_reported"];

const href = (status: ReportCaseStatus, sort: ReportCaseSort) => {
  const params = new URLSearchParams();
  if (status !== "open") params.set("status", status);
  if (sort !== "priority") params.set("sort", sort);
  const query = params.toString();
  return query ? `/admin/reports?${query}` : "/admin/reports";
};

// Situação (abertos, com medida, dispensados) e ordem da fila; tudo na URL, para dar para compartilhar.
export function ReportFilters({ status, sort }: { status: ReportCaseStatus; sort: ReportCaseSort }) {
  const t = useTranslations("admin.reports");
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUSES.map((value) => (
        <Link
          key={value}
          href={href(value, sort)}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            value === status ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          {t(`filter.${value}`)}
        </Link>
      ))}
      <Select value={sort} onValueChange={(value) => router.push(href(status, value as ReportCaseSort))}>
        <SelectTrigger size="sm" className="ml-auto w-52" aria-label={t("sortLabel")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORTS.map((value) => (
            <SelectItem key={value} value={value}>
              {t(`sort.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
