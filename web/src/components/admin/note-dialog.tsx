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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label: string;
  confirmLabel: string;
  required?: boolean;
  destructive?: boolean;
  // Rejeita (com o toast já mostrado) para manter o diálogo aberto.
  onConfirm: (note: string) => Promise<void>;
};

// Confirmação com um texto (motivo da recusa, observação da aprovação...). Vai para o log e para a notificação.
export function NoteDialog({ open, onOpenChange, title, description, label, confirmLabel, required, destructive, onConfirm }: Props) {
  const tc = useTranslations("common");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await onConfirm(note.trim());
      setNote("");
      onOpenChange(false);
    } catch {
      // O erro já aparece em um toast.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="moderation-note">
              {label} {!required && <span className="font-normal text-muted-foreground">{tc("optional")}</span>}
            </Label>
            <Textarea
              id="moderation-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              required={required}
              maxLength={500}
              rows={4}
              disabled={busy}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              {tc("cancel")}
            </Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={busy || (required && !note.trim())}>
              {busy && <Loader2 className="animate-spin" />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
