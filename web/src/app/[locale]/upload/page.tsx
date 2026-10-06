import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RestrictionNotice } from "@/components/restriction-notice";
import { UploadAccessPanel } from "@/components/upload-access/upload-access-panel";
import { UploadForm } from "@/components/upload-form";
import { getUploadAccess } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("upload");
  return { title: t("title") };
}

export default async function UploadPage() {
  const user = await requireSession("/upload");
  const t = await getTranslations("upload");
  // Pode publicar: formulário de envio. Punido: o aviso da restrição. Sem aprovação: o pedido à moderação.
  const access = user.access.can_upload ? null : await getUploadAccess();
  const restriction = access?.blocked_by === "restriction" ? access.restrictions[0] : null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {!access ? t("subtitle") : restriction ? t("restricted") : t("needsApproval")}
      </p>
      {!access ? (
        <UploadForm />
      ) : restriction ? (
        <RestrictionNotice restriction={restriction} className="mt-8" />
      ) : (
        <UploadAccessPanel initialAccess={access} />
      )}
    </div>
  );
}
