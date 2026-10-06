import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { UploadForm } from "@/components/upload-form";
import { requireSession } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("upload");
  return { title: t("title") };
}

export default async function UploadPage() {
  await requireSession("/upload");
  const t = await getTranslations("upload");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      <UploadForm />
    </div>
  );
}
