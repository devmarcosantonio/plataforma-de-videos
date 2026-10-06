"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Ban, Check, Clock, ExternalLink, EyeOff, Flag, Loader2, RotateCcw, ShieldAlert, ShieldCheck, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import { errorMessage, getJson, postJson } from "@/lib/client-api";
import { channelHref, handle } from "@/lib/format";
import { isAdmin, outranks } from "@/lib/permissions";
import type {
  AuthUser,
  ReportCase,
  ReportCasePage,
  ReportCaseSort,
  ReportCaseStatus,
  ReportReason,
  ReportVideoPreview,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "../empty-state";
import { TimeAgo } from "../time-ago";
import { UserAvatar } from "../user-avatar";
import { NoteDialog } from "./note-dialog";
import { PurgeVideoDialog } from "./purge-dialog";
import { ReasonDialog } from "./reason-dialog";
import { RestrictDialog } from "./restrict-dialog";

type Props = {
  status: ReportCaseStatus;
  sort: ReportCaseSort;
  initialPage: ReportCasePage;
  viewer: Pick<AuthUser, "id" | "role">;
};

// Decisões que só pedem uma observação opcional; remover e colocar em revisão usam motivo pronto.
type NoteDecision = "dismiss" | "actioned";

const isVideo = (target: ReportCase["target"]): target is ReportVideoPreview => !!target && "title" in target;

export function ReportQueue({ status, sort, initialPage, viewer }: Props) {
  const t = useTranslations("admin.reports");
  const tc = useTranslations("common");
  const router = useRouter();
  const [cases, setCases] = useState(initialPage.items);
  const [page, setPage] = useState(initialPage.page);
  const [hasMore, setHasMore] = useState(initialPage.has_more);
  const [loading, setLoading] = useState(false);
  const [noting, setNoting] = useState<{ item: ReportCase; decision: NoteDecision } | null>(null);
  const [reasoning, setReasoning] = useState<{ item: ReportCase; action: "remove" | "review" } | null>(null);
  const [restricting, setRestricting] = useState<ReportCase | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  // Exclusão permanente (só admin): vídeo pede o título digitado; comentário, uma confirmação.
  const [purgingVideo, setPurgingVideo] = useState<ReportCase | null>(null);
  const [purgingComment, setPurgingComment] = useState<ReportCase | null>(null);

  async function loadMore() {
    setLoading(true);
    try {
      const next = await getJson<ReportCasePage>(`/admin/reports?status=${status}&sort=${sort}&page=${page + 1}`);
      // A fila de abertos muda enquanto se trabalha: evita repetir casos já na tela.
      setCases((current) => [...current, ...next.items.filter((item) => !current.some((c) => c.id === item.id))]);
      setPage(next.page);
      setHasMore(next.has_more);
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
    } finally {
      setLoading(false);
    }
  }

  async function resolve(item: ReportCase, decision: "dismiss" | "remove" | "actioned", data: { reason?: ReportReason; note?: string }) {
    try {
      await postJson(`/admin/reports/${item.id}/resolve`, { decision, ...data });
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
      throw error;
    }
    setCases((current) => current.filter((c) => c.id !== item.id));
    toast.success(t(`resolved.${decision}`));
    router.refresh();
  }

  async function review(item: ReportCase, data: { reason?: ReportReason; note?: string }) {
    let updated: ReportCase;
    try {
      updated = await postJson<ReportCase>(`/admin/reports/${item.id}/review`, data);
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
      throw error;
    }
    // O caso continua aberto; a prévia passa a mostrar "em revisão".
    setCases((current) => current.map((c) => (c.id === item.id ? updated : c)));
    toast.success(t("underReviewDone"));
  }

  async function restore(item: ReportCase) {
    setRestoring(item.id);
    try {
      await postJson(`/admin/${item.target_type === "video" ? "videos" : "comments"}/${item.target_id}/restore`, {});
      setCases((current) =>
        current.map((c) =>
          c.id !== item.id || !c.target
            ? c
            : isVideo(c.target)
              ? { ...c, target: { ...c.target, moderation_status: "active", moderation_reason: null, moderation_note: null } }
              : { ...c, target: { ...c.target, moderated_at: null } },
        ),
      );
      toast.success(t("restored"));
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
    } finally {
      setRestoring(null);
    }
  }

  async function purge(item: ReportCase, data: { title?: string; reason?: ReportReason; note?: string }) {
    const { title, ...rest } = data;
    try {
      await postJson(
        `/admin/${item.target_type === "video" ? "videos" : "comments"}/${item.target_id}/purge`,
        title === undefined ? rest : { ...rest, confirm_title: title },
      );
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
      throw error;
    }
    toast.success(t("purged"));
    // Caso aberto: a exclusão já fecha o caso (sai da fila). Resolvido: fica no histórico como "conteúdo apagado".
    if (item.status === "open") {
      setCases((current) => current.filter((c) => c.id !== item.id));
      router.refresh();
    } else {
      setCases((current) => current.map((c) => (c.id === item.id ? { ...c, target: null } : c)));
    }
  }

  if (cases.length === 0) {
    return <EmptyState icon={<Flag />} title={t(`empty.${status}`)} description={t("emptyHint")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {cases.map((item) => {
          const author = item.target_user;
          const own = author?.id === viewer.id;
          // Causa própria: só admin decide (fica marcado no registro). Fora isso, medidas só abaixo na hierarquia.
          const canDecide = !own || isAdmin(viewer);
          const canAct = own ? isAdmin(viewer) : !author || outranks(viewer, author);
          const video = isVideo(item.target) ? item.target : null;
          const comment = item.target && !isVideo(item.target) ? item.target : null;
          const gone = item.target === null || !!comment?.deleted_at;
          // Situação do conteúdo na moderação: removido (soft, dá para restaurar ou excluir de vez) ou em revisão.
          const removed = video
            ? video.moderation_status === "active"
              ? null
              : video.moderation_status === "removed"
                ? "removed"
                : "under_review"
            : comment?.moderated_at && !comment.deleted_at
              ? "removed"
              : null;
          return (
            <motion.div key={item.id} layout exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}>
              <Card>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant={item.severity >= 4 ? "destructive" : "secondary"}>{t(`types.${item.target_type}`)}</Badge>
                    <span className="font-medium">{t("count", { count: item.reports_count })}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {t("openedAgo")} <TimeAgo date={item.created_at} />
                      {item.reports_count > 1 && (
                        <>
                          {" · "}
                          {t("last")} <TimeAgo date={item.last_reported_at} />
                        </>
                      )}
                    </span>
                  </div>

                  <Preview item={item} />

                  <div className="flex flex-wrap gap-1.5">
                    {item.reasons.map((row) => (
                      <Badge key={row.reason} variant="outline">
                        {row.count}× {t(`reasons.${row.reason}`)}
                      </Badge>
                    ))}
                  </div>

                  {item.details.length > 0 && (
                    <ul className="flex flex-col gap-2 border-l-2 pl-3 text-sm">
                      {item.details.map((row) => (
                        <li key={row.id}>
                          <span className="whitespace-pre-line">“{row.details}”</span>{" "}
                          <span className="text-xs text-muted-foreground">
                            — {row.reporter ? handle(row.reporter) : t("deletedAccount")}, {t(`reasons.${row.reason}`)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {author && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      <UserAvatar user={author} size="sm" />
                      <span className="text-muted-foreground">{t("author")}</span>
                      <Link href={channelHref(author)} className="font-medium hover:text-primary">
                        {handle(author)}
                      </Link>
                      {author.role !== "user" && (
                        <Badge variant="secondary">
                          <ShieldCheck />
                        </Badge>
                      )}
                      <Link href={`/admin/users/${author.id}`} className="ml-auto text-xs text-primary hover:underline">
                        {t("history")}
                      </Link>
                    </div>
                  )}

                  {status === "open" ? (
                    !canDecide ? (
                      <p className="text-xs text-muted-foreground">{t("ownCase")}</p>
                    ) : (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {own && <p className="mr-auto text-xs text-amber-600 dark:text-amber-400">{t("ownCaseAdmin")}</p>}
                        <Button variant="ghost" className="rounded-full" onClick={() => setNoting({ item, decision: "dismiss" })}>
                          <X />
                          {video?.moderation_status === "under_review" ? t("dismissReinstate") : t("dismiss")}
                        </Button>
                        {canAct && author && !own && (
                          <Button variant="outline" className="rounded-full" onClick={() => setRestricting(item)}>
                            <Ban />
                            {t("restrictAuthor")}
                          </Button>
                        )}
                        {canAct && video?.moderation_status === "active" && (
                          <Button variant="outline" className="rounded-full" onClick={() => setReasoning({ item, action: "review" })}>
                            <ShieldAlert />
                            {t("review")}
                          </Button>
                        )}
                        {canAct && gone && (
                          <Button className="rounded-full" onClick={() => setNoting({ item, decision: "actioned" })}>
                            <Check />
                            {t("markActioned")}
                          </Button>
                        )}
                        {canAct && !gone && (
                          <Button variant="destructive" className="rounded-full" onClick={() => setReasoning({ item, action: "remove" })}>
                            <EyeOff />
                            {t(`remove.${item.target_type}`)}
                          </Button>
                        )}
                        {/* Admin: além de remover (reversível), pode excluir de vez. */}
                        {canAct && !gone && isAdmin(viewer) && (
                          <Button
                            variant="destructive"
                            className="rounded-full"
                            onClick={() => (video ? setPurgingVideo(item) : setPurgingComment(item))}
                          >
                            <Trash2 />
                            {t("purge")}
                          </Button>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                      <Badge variant={item.status === "actioned" ? "destructive" : "outline"}>{t(`status.${item.status}`)}</Badge>
                      {item.resolution_reason && <Badge variant="outline">{t(`reasons.${item.resolution_reason}`)}</Badge>}
                      {item.resolver && t("resolvedBy", { handle: handle(item.resolver) })}
                      {item.resolved_at && <TimeAgo date={item.resolved_at} />}
                      {item.resolution_note && <p className="w-full whitespace-pre-line">“{item.resolution_note}”</p>}
                      {removed && canAct && (
                        <div className="ml-auto flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => restore(item)}
                            disabled={restoring === item.id}
                          >
                            {restoring === item.id ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                            {t(`restoreTarget.${item.target_type}`)}
                          </Button>
                          {isAdmin(viewer) && removed === "removed" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="rounded-full"
                              onClick={() => (video ? setPurgingVideo(item) : setPurgingComment(item))}
                            >
                              <Trash2 />
                              {t("purge")}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" className="rounded-full px-6" onClick={loadMore} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {loading ? tc("loading") : tc("loadMore")}
          </Button>
        </div>
      )}

      <NoteDialog
        open={!!noting}
        onOpenChange={(open) => !open && setNoting(null)}
        title={noting ? t(`dialog.${noting.decision}.title`) : ""}
        description={noting ? t(`dialog.${noting.decision}.description`) : ""}
        label={noting ? t(`dialog.${noting.decision}.label`) : ""}
        confirmLabel={noting?.decision === "actioned" ? t("markActioned") : t("dismiss")}
        onConfirm={(note) => resolve(noting!.item, noting!.decision, { note: note || undefined })}
      />
      <ReasonDialog
        open={!!reasoning}
        onOpenChange={(open) => !open && setReasoning(null)}
        title={reasoning ? t(`dialog.${reasoning.action}.title.${reasoning.item.target_type}`) : ""}
        description={reasoning ? t(`dialog.${reasoning.action}.description`) : ""}
        confirmLabel={reasoning ? (reasoning.action === "review" ? t("review") : t(`remove.${reasoning.item.target_type}`)) : ""}
        reasonRequired={reasoning?.action === "remove"}
        suggested={reasoning?.item.reasons[0]?.reason}
        destructive={reasoning?.action === "remove"}
        onConfirm={(data) =>
          reasoning!.action === "review" ? review(reasoning!.item, data) : resolve(reasoning!.item, "remove", data)
        }
      />
      <PurgeVideoDialog
        video={purgingVideo && isVideo(purgingVideo.target) ? purgingVideo.target : null}
        onOpenChange={(open) => !open && setPurgingVideo(null)}
        suggested={purgingVideo?.reasons[0]?.reason}
        onConfirm={(data) => purge(purgingVideo!, data)}
      />
      <ReasonDialog
        open={!!purgingComment}
        onOpenChange={(open) => !open && setPurgingComment(null)}
        title={t("purgeComment.title")}
        description={t("purgeComment.description")}
        confirmLabel={t("purge")}
        reasonRequired={false}
        suggested={purgingComment?.reasons[0]?.reason}
        destructive
        onConfirm={(data) => purge(purgingComment!, data)}
      />
      <RestrictDialog
        target={restricting?.target_user ?? null}
        isAdmin={isAdmin(viewer)}
        onOpenChange={(open) => !open && setRestricting(null)}
        // Depois de restringir, o caso continua aberto: falta remover o conteúdo ou dispensar.
        onApplied={() => toast.info(t("afterRestrict"))}
      />
    </div>
  );
}

// O que foi denunciado: vídeo (capa, título e situação) ou comentário (texto e vídeo).
function Preview({ item }: { item: ReportCase }) {
  const t = useTranslations("admin.reports");
  const tv = useTranslations("visibility");
  const target = item.target;

  if (!target) return <p className="text-sm italic text-muted-foreground">{t("gone")}</p>;

  if (isVideo(target)) {
    return (
      <div className="flex items-center gap-3">
        <div className="aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-muted">
          {target.thumbnail_url && (
            // eslint-disable-next-line @next/next/no-img-element -- capa do Bunny, só para conferência no painel
            <img src={target.thumbnail_url} alt="" className="size-full object-cover" />
          )}
        </div>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <p className="line-clamp-2 font-medium">{target.title}</p>
          {target.moderation_status !== "active" && (
            <Badge variant="destructive">{tv(target.moderation_status === "removed" ? "removed" : "underReview")}</Badge>
          )}
          {target.moderation_status !== "removed" && (
            <Link href={`/watch/${target.id}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLink className="size-3" />
              {t("open")}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {target.moderated_at && !target.deleted_at && (
        <Badge variant="destructive" className="w-fit">
          {t("commentModerated")}
        </Badge>
      )}
      <blockquote
        className={cn("whitespace-pre-line rounded-lg bg-muted/50 px-3 py-2 text-sm", target.deleted_at && "italic text-muted-foreground")}
      >
        {target.deleted_at ? t("commentRemoved") : target.content}
      </blockquote>
      <Link href={`/watch/${target.video_id}`} className="w-fit text-xs text-primary hover:underline">
        {t("onVideo", { title: target.video.title })}
      </Link>
    </div>
  );
}
