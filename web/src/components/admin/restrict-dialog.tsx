"use client";

import { useState } from "react";
import { Ban, Loader2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, postJson } from "@/lib/client-api";
import { handle } from "@/lib/format";
import type { Access, RestrictionType, User } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPES: RestrictionType[] = ["comment", "upload", "react", "suspend", "ban"];
const DURATIONS = ["1h", "24h", "7d", "30d", "permanent"] as const;
type Duration = (typeof DURATIONS)[number];

type Props = {
  target: User | null;
  // Admin pode restrição permanente e banimento; moderador, até 30 dias.
  isAdmin: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: (access: Access) => void;
};

export function RestrictDialog({ target, isAdmin, onOpenChange, onApplied }: Props) {
  const t = useTranslations("admin.restrict");
  const tr = useTranslations("restrictions");
  const tc = useTranslations("common");
  const [types, setTypes] = useState<RestrictionType[]>([]);
  const [duration, setDuration] = useState<Duration>("24h");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const banning = types.includes("ban");
  const available = TYPES.filter((type) => isAdmin || type !== "ban");

  function reset() {
    setTypes([]);
    setDuration("24h");
    setReason("");
  }

  function toggle(type: RestrictionType) {
    // Banimento vale sozinho (já bloqueia tudo).
    if (type === "ban") return setTypes((current) => (current.includes("ban") ? [] : ["ban"]));
    setTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current.filter((item) => item !== "ban"), type],
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;
    setBusy(true);
    try {
      const { access } = await postJson<{ access: Access }>(`/admin/users/${target.id}/restrictions`, {
        types,
        duration: banning ? "permanent" : duration,
        reason: reason.trim(),
      });
      toast.success(t("applied", { handle: handle(target) }));
      onApplied(access);
      reset();
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
            <DialogTitle>{t("title", { handle: target ? handle(target) : "" })}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{t("types")}</legend>
            <div className="flex flex-wrap gap-2">
              {available.map((type) => {
                const selected = types.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(type)}
                    disabled={busy}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selected
                        ? type === "ban"
                          ? "border-destructive bg-destructive text-white"
                          : "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {tr(`types.${type}`)}
                  </button>
                );
              })}
            </div>
            {types.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {types.map((type) => tr(`effects.${type}`)).join(" ")}
              </p>
            )}
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label>{t("duration")}</Label>
            {banning ? (
              <p className="text-sm text-muted-foreground">{t("banPermanent")}</p>
            ) : (
              <Select value={duration} onValueChange={(value) => setDuration(value as Duration)} disabled={busy}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.filter((value) => isAdmin || value !== "permanent").map((value) => (
                    <SelectItem key={value} value={value}>
                      {tr(`durations.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="restriction-reason">{t("reason")}</Label>
            <Textarea
              id="restriction-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              maxLength={500}
              rows={3}
              placeholder={t("reasonHint")}
              disabled={busy}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              {tc("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={busy || types.length === 0 || !reason.trim()}>
              {busy ? <Loader2 className="animate-spin" /> : <Ban />}
              {banning ? t("submitBan") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
