"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReportReason } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  // Vídeo a excluir de vez (nulo = fechado). Pede o título digitado para confirmar.
  video: { id: string; title: string } | null;
  onOpenChange: (open: boolean) => void;
  // Rejeita (com o toast já mostrado) para manter o diálogo aberto.
  onConfirm: (data: { title: string; reason?: ReportReason; note?: string }) => Promise<void>;
  // Sugestão de motivo (o mais denunciado no caso).
  suggested?: ReportReason;
};

const REASONS: ReportReason[] = ["spam", "harassment", "hate", "violence", "sexual", "misleading", "copyright", "other"];

// Exclusão permanente (só admin): apaga do banco e do servidor de vídeo. Não tem volta.
export function PurgeVideoDialog({ video, onOpenChange, onConfirm, suggested }: Props) {
  const t = useTranslations("admin.purge");
  const tr = useTranslations("report.reasons");
  const tc = useTranslations("common");
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState<ReportReason | undefined>(suggested);
  const [busy, setBusy] = useState(false);
  const matches = !!video && typed.trim() === video.title.trim();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matches) return;
    setBusy(true);
    try {
      await onConfirm({ title: typed.trim(), reason });
      setTyped("");
      setReason(undefined);
      onOpenChange(false);
    } catch {
      // O erro já aparece em um toast.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={!!video}
      onOpenChange={(open) => {
        if (busy) return;
        if (!open) setTyped("");
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <fieldset className="flex flex-col gap-2" disabled={busy}>
            <legend className="mb-2 text-sm font-medium">
              {t("reason")} <span className="font-normal text-muted-foreground">{tc("optional")}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={reason === value}
                  onClick={() => setReason(reason === value ? undefined : value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    reason === value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {tr(`${value}.label`)}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-2">
            <Label htmlFor="purge-title">{t("typeTitle", { title: video?.title ?? "" })}</Label>
            <Input
              id="purge-title"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              disabled={busy}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              {tc("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={busy || !matches}>
              {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {t("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
