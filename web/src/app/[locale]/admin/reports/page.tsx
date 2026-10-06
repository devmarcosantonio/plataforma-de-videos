import { ReportFilters } from "@/components/admin/report-filters";
import { ReportQueue } from "@/components/admin/report-queue";
import { getReportCases } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import type { ReportCaseSort, ReportCaseStatus } from "@/lib/types";

const STATUSES: ReportCaseStatus[] = ["open", "actioned", "dismissed"];
const SORTS: ReportCaseSort[] = ["priority", "oldest", "newest", "most_reported", "least_reported"];

// Fila de denúncias: um item por conteúdo denunciado.
export default async function AdminReportsPage({ searchParams }: PageProps<"/[locale]/admin/reports">) {
  const viewer = await requireSession("/admin/reports");
  const params = await searchParams;
  const status = STATUSES.find((value) => value === params.status) ?? "open";
  const sort = SORTS.find((value) => value === params.sort) ?? "priority";
  const page = await getReportCases(status, sort);

  return (
    <div className="flex flex-col gap-5">
      <ReportFilters status={status} sort={sort} />
      <ReportQueue key={`${status}-${sort}`} status={status} sort={sort} initialPage={page} viewer={viewer} />
    </div>
  );
}
