"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { errorMessage, postJson } from "@/lib/client-api";
import type { ReportReason, ReportTargetType } from "@/lib/types";
import { cn } from "@/lib/utils";

const REASONS: ReportReason[] = ["spam", "harassment", "hate", "violence", "sexual", "misleading", "copyright", "other"];

type Target = { type: ReportTargetType; id: string };

type DialogProps = { target: Target | null; onOpenChange: (open: boolean) => void };

// Escolher o motivo e, se quiser, explicar. A denúncia vai para a fila da moderação.
export function ReportDialog({ target, onOpenChange }: DialogProps) {
  const t = useTranslations("report");
  const tc = useTranslations("common");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target || !reason) return;
    setBusy(true);
    try {
      await postJson("/reports", {
        target_type: target.type,
        target_id: target.id,
        reason,
        details: details.trim() || undefined,
      });
      toast.success(t("sent"));
      setReason(null);
      setDetails("");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => !busy && onOpenChange(open)}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{target ? t(`title.${target.type}`) : ""}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <fieldset className="flex flex-col gap-1.5" role="radiogroup" aria-label={t("reason")}>
            {REASONS.map((value) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                  reason === value ? "border-primary bg-primary/5" : "hover:bg-muted",
                )}
              >
                <input
                  type="radio"
                  name="reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  disabled={busy}
                  className="mt-0.5 accent-(--primary)"
                />
                <span className="flex flex-col">
                  <span className="font-medium">{t(`reasons.${value}.label`)}</span>
                  <span className="text-xs text-muted-foreground">{t(`reasons.${value}.hint`)}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor="report-details">
              {t("details")} <span className="font-normal text-muted-foreground">{tc("optional")}</span>
            </Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t("detailsHint")}
              disabled={busy}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              {tc("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={busy || !reason}>
              {busy ? <Loader2 className="animate-spin" /> : <Flag />}
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ButtonProps = { type: ReportTargetType; id: string; loggedIn: boolean; className?: string };

// Botão "Denunciar" (vídeo e canal). Visitante vai para o login antes.
export function ReportButton({ type, id, loggedIn, className }: ButtonProps) {
  const t = useTranslations("report");
  const goToLogin = useLoginRedirect();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-lg"
        className={cn("rounded-full text-muted-foreground", className)}
        aria-label={t("action")}
        title={t("action")}
        onClick={() => (loggedIn ? setOpen(true) : goToLogin())}
      >
        <Flag />
      </Button>
      <ReportDialog target={open ? { type, id } : null} onOpenChange={setOpen} />
    </>
  );
}
