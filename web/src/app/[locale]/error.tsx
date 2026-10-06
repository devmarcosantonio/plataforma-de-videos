"use client";

import { useTranslations } from "next-intl";
import { RotateCw, ServerCrash } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("errors");

  return (
    <EmptyState icon={<ServerCrash />} title={t("loadTitle")} description={t("loadHint")}>
      <Button variant="outline" className="rounded-full px-5" onClick={() => retry()}>
        <RotateCw />
        {t("retry")}
      </Button>
    </EmptyState>
  );
}
