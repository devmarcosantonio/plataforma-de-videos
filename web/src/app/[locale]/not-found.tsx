import { getTranslations } from "next-intl/server";
import { FileQuestion, Home } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <EmptyState icon={<FileQuestion />} title={t("notFound")} description={t("notFoundHint")}>
      <Button asChild variant="outline" className="rounded-full px-5">
        <Link href="/">
          <Home />
          {t("backHome")}
        </Link>
      </Button>
    </EmptyState>
  );
}
