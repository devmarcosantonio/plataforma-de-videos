"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ReportReason } from "@/lib/types";
import { cn } from "@/lib/utils";

const REASONS: ReportReason[] = ["spam", "harassment", "hate", "violence", "sexual", "misleading", "copyright", "other"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  // Motivo pronto obrigatório (remover) ou opcional (colocar em revisão).
  reasonRequired: boolean;
  // Sugestão inicial: o motivo mais denunciado no caso.
  suggested?: ReportReason;
  destructive?: boolean;
  // Rejeita (com o toast já mostrado) para manter o diálogo aberto.
  onConfirm: (data: { reason?: ReportReason; note?: string }) => Promise<void>;
};

// Decisão com motivo pronto: o dono do conteúdo vê o texto traduzido do motivo, mais a observação.
export function ReasonDialog({ open, onOpenChange, ...props }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* key: recomeça com a sugestão do caso escolhido. */}
        {open && <ReasonForm key={props.suggested ?? "none"} {...props} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ReasonForm({
  title,
  description,
  confirmLabel,
  reasonRequired,
  suggested,
  destructive,
  onConfirm,
  onClose,
}: Omit<Props, "open" | "onOpenChange"> & { onClose: () => void }) {
  const t = useTranslations("admin.reasonDialog");
  const tr = useTranslations("report.reasons");
  const tc = useTranslations("common");
  const [reason, setReason] = useState<ReportReason | undefined>(suggested);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await onConfirm({ reason, note: note.trim() || undefined });
      onClose();
    } catch {
      // O erro já aparece em um toast.
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <fieldset className="flex flex-col gap-2" disabled={busy}>
        <legend className="mb-2 text-sm font-medium">
          {t("reason")}{" "}
          {!reasonRequired && <span className="font-normal text-muted-foreground">{tc("optional")}</span>}
        </legend>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={reason === value}
              onClick={() => setReason(reason === value && !reasonRequired ? undefined : value)}
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
        <Label htmlFor="reason-note">
          {t("note")} <span className="font-normal text-muted-foreground">{tc("optional")}</span>
        </Label>
        <Textarea
          id="reason-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          rows={3}
          placeholder={t("noteHint")}
          disabled={busy}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          {tc("cancel")}
        </Button>
        <Button
          type="submit"
          variant={destructive ? "destructive" : "default"}
          disabled={busy || (reasonRequired && !reason)}
        >
          {busy && <Loader2 className="animate-spin" />}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
