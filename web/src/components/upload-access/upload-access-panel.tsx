"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Clock, Loader2, Lock, Send, XCircle } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { errorMessage, postJson, sendJson } from "@/lib/client-api";
import type { UploadAccess } from "@/lib/types";
import { TimeAgo } from "../time-ago";

// Para quem ainda não pode publicar: pedir permissão e acompanhar o pedido.
export function UploadAccessPanel({ initialAccess }: { initialAccess: UploadAccess }) {
  const t = useTranslations("uploadAccess");
  const tc = useTranslations("common");
  const router = useRouter();
  const [access, setAccess] = useState(initialAccess);
  const [busy, setBusy] = useState(false);
  const request = access.request;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      setAccess(
        await postJson<UploadAccess>("/me/upload-requests", {
          message: String(form.get("message") ?? ""),
          portfolio_url: String(form.get("portfolio_url") ?? "") || undefined,
        }),
      );
      toast.success(t("sent"));
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      setAccess(await sendJson<UploadAccess>("DELETE", "/me/upload-requests/current", undefined));
      toast.info(t("cancelled"));
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
    } finally {
      setBusy(false);
    }
  }

  // Aprovado depois que a página abriu (ex.: pela notificação): recarrega para mostrar o formulário de envio.
  if (access.can_upload) {
    return (
      <StatusCard icon={<CheckCircle2 />} tone="success" title={t("approvedTitle")} text={t("approvedHint")}>
        <Button className="rounded-full" onClick={() => router.refresh()}>
          {t("startUploading")}
        </Button>
      </StatusCard>
    );
  }

  if (request?.status === "pending") {
    return (
      <StatusCard
        icon={<Clock />}
        tone="pending"
        title={t("pendingTitle")}
        text={t.rich("pendingHint", { time: () => <TimeAgo date={request.created_at} /> })}
      >
        <blockquote className="whitespace-pre-line border-l-2 pl-3 text-left text-sm text-muted-foreground">
          {request.message}
        </blockquote>
        <Button variant="outline" className="rounded-full" onClick={cancel} disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {t("cancel")}
        </Button>
      </StatusCard>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      {request?.status === "rejected" && <Rejected note={request.review_note} retryAt={access.retry_at} />}

      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Lock className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">{t("title")}</h2>
              <p className="text-sm text-muted-foreground">{t("intro")}</p>
            </div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="message">{t("message")}</Label>
              <Textarea
                id="message"
                name="message"
                required
                rows={5}
                maxLength={1000}
                placeholder={t("messagePlaceholder")}
                disabled={busy}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="portfolio_url">
                {t("link")} <span className="font-normal text-muted-foreground">{tc("optional")}</span>
              </Label>
              <Input
                id="portfolio_url"
                name="portfolio_url"
                type="url"
                maxLength={500}
                placeholder="https://"
                disabled={busy}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">{t("linkHint")}</p>
            </div>
            <SubmitButton busy={busy} retryAt={access.retry_at} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function SubmitButton({ busy, retryAt }: { busy: boolean; retryAt: string | null }) {
  const t = useTranslations("uploadAccess");
  const format = useFormatter();
  // Atualiza a cada segundo enquanto houver espera, para liberar o botão na hora certa.
  const now = useNow({ updateInterval: retryAt ? 1000 : undefined });
  const waiting = retryAt !== null && new Date(retryAt) > now;

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {waiting && (
        <span className="text-sm text-muted-foreground">
          {t("retryIn", { time: format.relativeTime(new Date(retryAt), now) })}
        </span>
      )}
      <Button type="submit" size="lg" className="rounded-full px-6" disabled={busy || waiting}>
        {busy ? <Loader2 className="animate-spin" /> : <Send />}
        {t("submit")}
      </Button>
    </div>
  );
}

function Rejected({ note, retryAt }: { note: string | null; retryAt: string | null }) {
  const t = useTranslations("uploadAccess");
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
    >
      <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{t("rejectedTitle")}</p>
        {note && <p className="whitespace-pre-line text-muted-foreground">{note}</p>}
        <p className="text-muted-foreground">{retryAt ? t("rejectedWait") : t("rejectedRetry")}</p>
      </div>
    </motion.div>
  );
}

type StatusCardProps = {
  icon: React.ReactNode;
  tone: "success" | "pending";
  title: string;
  text: React.ReactNode;
  children?: React.ReactNode;
};

function StatusCard({ icon, tone, title, text, children }: StatusCardProps) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mt-8">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
          <span
            className={
              tone === "success"
                ? "grid size-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 [&_svg]:size-7 dark:text-emerald-400"
                : "grid size-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 [&_svg]:size-7 dark:text-amber-400"
            }
          >
            {icon}
          </span>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}
