"use client";

import { useState } from "react";
import { ArrowLeft, Ban, Check, Loader2, ShieldCheck, Undo2, Upload, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import { errorMessage, postJson } from "@/lib/client-api";
import { channelHref, handle } from "@/lib/format";
import { blockingRestriction, isAdmin, outranks } from "@/lib/permissions";
import type { AdminUserDetails, AuthUser, RestrictionRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TimeAgo } from "../time-ago";
import { UserAvatar } from "../user-avatar";
import { LogList } from "./log-list";
import { NoteDialog } from "./note-dialog";
import { RestrictDialog } from "./restrict-dialog";

const ACTIONS = ["upload", "comment", "react", "follow"] as const;

type Props = { viewer: Pick<AuthUser, "id" | "role">; details: AdminUserDetails };

// Tudo sobre uma pessoa. Depois de cada ação a página é recarregada do servidor (router.refresh).
export function UserDetails({ viewer, details }: Props) {
  const t = useTranslations("admin.details");
  const tr = useTranslations("roles");
  const trs = useTranslations("restrictions");
  const tq = useTranslations("admin.reports");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const { user, access } = details;
  const [restricting, setRestricting] = useState(false);
  const [revoking, setRevoking] = useState<RestrictionRecord | null>(null);
  const [approving, setApproving] = useState(false);

  const manageable = user.id !== viewer.id && outranks(viewer, user);
  // Moderador não desfaz restrição permanente nem banimento (mesma regra da API).
  const canRevoke = (restriction: RestrictionRecord) =>
    manageable && (isAdmin(viewer) || (restriction.expires_at !== null && restriction.type !== "ban"));
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "short", timeStyle: "short" });

  async function approve() {
    setApproving(true);
    try {
      await postJson(`/admin/users/${user.id}/upload-access/grant`, {});
      toast.success(t("approved"));
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
    } finally {
      setApproving(false);
    }
  }

  async function revoke(reason: string) {
    if (!revoking) return;
    try {
      await postJson(`/admin/restrictions/${revoking.id}/revoke`, { reason: reason || undefined });
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
      throw error;
    }
    toast.success(t("revoked"));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/users" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t("back")}
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar user={user} size="lg" className="size-14 text-lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={channelHref(user)} className="text-xl font-semibold hover:text-primary">
              {user.display_name}
            </Link>
            {user.role !== "user" && (
              <Badge variant="secondary">
                <ShieldCheck />
                {tr(user.role)}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {handle(user)} · {user.email} · {t("videos", { count: user.videos_count })} · {t("joined")}{" "}
            <TimeAgo date={user.created_at} />
          </p>
        </div>
        {manageable && (
          <Button variant="destructive" className="rounded-full" onClick={() => setRestricting(true)}>
            <Ban />
            {t("restrict")}
          </Button>
        )}
      </div>

      {/* Acessos: o resultado de aprovação + papel + restrições ativas. */}
      <Card>
        <CardHeader>
          <CardTitle>{t("access")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {ACTIONS.map((action) => {
            const allowed = access[`can_${action}`];
            const restriction = blockingRestriction(access, action);
            const needsApproval = action === "upload" && access.upload_blocked_by === "approval";
            const record = restriction && details.restrictions.find((item) => item.id === restriction.id);
            return (
              <div key={action} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full",
                    allowed ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive",
                  )}
                >
                  {allowed ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                </span>
                <span className="w-40 font-medium">{t(`actions.${action}`)}</span>
                <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                  {restriction
                    ? `${trs(`types.${restriction.type}`)} · ${restriction.until ? trs("until", { date: date(restriction.until) }) : trs("permanent")} · “${restriction.reason}”`
                    : needsApproval
                      ? t("waitingApproval")
                      : allowed
                        ? t("allowed")
                        : ""}
                </span>
                {needsApproval && manageable && !restriction && (
                  <Button size="sm" variant="outline" className="rounded-full" onClick={approve} disabled={approving}>
                    {approving ? <Loader2 className="animate-spin" /> : <Upload />}
                    {t("approve")}
                  </Button>
                )}
                {record && canRevoke(record) && (
                  <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setRevoking(record)}>
                    <Undo2 />
                    {t("revoke")}
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("history")}</CardTitle>
        </CardHeader>
        <CardContent>
          {details.restrictions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRestrictions")}</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {details.restrictions.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start gap-3 py-3 text-sm first:pt-0 last:pb-0">
                  <Badge variant={item.status === "active" ? "destructive" : "outline"}>{t(`status.${item.status}`)}</Badge>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="font-medium">
                      {trs(`types.${item.type}`)} ·{" "}
                      {item.expires_at ? trs("until", { date: date(item.expires_at) }) : trs("permanent")}
                    </p>
                    <p className="whitespace-pre-line text-muted-foreground">“{item.reason}”</p>
                    <p className="text-xs text-muted-foreground">
                      {t("appliedBy", { handle: item.author ? handle(item.author) : t("system"), date: date(item.created_at) })}
                      {item.revoked_at &&
                        ` · ${t("revokedBy", { handle: item.revoker ? handle(item.revoker) : t("system"), date: date(item.revoked_at) })}`}
                      {item.revoke_reason && ` · “${item.revoke_reason}”`}
                    </p>
                  </div>
                  {item.status === "active" && canRevoke(item) && (
                    <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setRevoking(item)}>
                      <Undo2 />
                      {t("revoke")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("requests")}</CardTitle>
        </CardHeader>
        <CardContent>
          {details.requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRequests")}</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {details.requests.map((request) => (
                <li key={request.id} className="flex flex-col gap-1 py-3 text-sm first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={request.status === "approved" ? "secondary" : "outline"}>
                      {t(`requestStatus.${request.status}`)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {date(request.created_at)}
                      {request.reviewer && ` · ${handle(request.reviewer)}`}
                    </span>
                  </div>
                  <p className="whitespace-pre-line">{request.message}</p>
                  {request.review_note && <p className="text-muted-foreground">“{request.review_note}”</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("reports")}</CardTitle>
        </CardHeader>
        <CardContent>
          {details.reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noReports")}</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {details.reports.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-2 py-3 text-sm first:pt-0 last:pb-0">
                  <Badge variant={item.status === "actioned" ? "destructive" : item.status === "open" ? "secondary" : "outline"}>
                    {tq(`status.${item.status}`)}
                  </Badge>
                  <span className="font-medium">{tq(`types.${item.target_type}`)}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {item.target && "title" in item.target
                      ? item.target.title
                      : item.target && "content" in item.target
                        ? `“${item.target.content ?? tq("commentRemoved")}”`
                        : tq("gone")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tq("count", { count: item.reports_count })} · {item.reasons.map((r) => tq(`reasons.${r.reason}`)).join(", ")} ·{" "}
                    {date(item.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold">{t("log")}</h2>
        <LogList initialPage={{ items: details.logs, next_cursor: null }} />
      </div>

      <RestrictDialog
        target={restricting ? user : null}
        isAdmin={isAdmin(viewer)}
        onOpenChange={setRestricting}
        onApplied={() => router.refresh()}
      />
      <NoteDialog
        open={!!revoking}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={t("revokeDialog.title", { type: revoking ? trs(`types.${revoking.type}`) : "" })}
        description={t("revokeDialog.description")}
        label={t("revokeDialog.label")}
        confirmLabel={t("revoke")}
        onConfirm={revoke}
      />
    </div>
  );
}
