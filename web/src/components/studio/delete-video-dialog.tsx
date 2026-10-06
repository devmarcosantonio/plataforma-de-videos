"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Video } from "@/lib/types";

type Props = {
  video: Video | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
};

export function DeleteVideoDialog({ video, onOpenChange, onConfirm }: Props) {
  const t = useTranslations();
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    setDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // O erro já aparece em um toast.
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={!!video} onOpenChange={(open) => !deleting && onOpenChange(open)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("studio.deleteDialog.title", { title: video?.title ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("studio.deleteDialog.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
          {/* Botão comum (não AlertDialogAction) para o diálogo só fechar depois que a API confirmar. */}
          <Button variant="destructive" onClick={confirm} disabled={deleting}>
            {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {deleting ? t("studio.deleteDialog.deleting") : t("studio.deleteDialog.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
