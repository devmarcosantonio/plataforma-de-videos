"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ExternalLink, Inbox, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import { errorMessage, getJson, postJson } from "@/lib/client-api";
import { channelHref, handle } from "@/lib/format";
import type { AdminUploadRequest, Page, ReviewStatus } from "@/lib/types";
import { EmptyState } from "../empty-state";
import { TimeAgo } from "../time-ago";
import { UserAvatar } from "../user-avatar";
import { NoteDialog } from "./note-dialog";

type Props = { status: ReviewStatus; initialPage: Page<AdminUploadRequest>; currentUserId: string };

export function RequestQueue({ status, initialPage, currentUserId }: Props) {
  const t = useTranslations("admin.requests");
  const tc = useTranslations("common");
  const router = useRouter();
  const [items, setItems] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.next_cursor);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<{ request: AdminUploadRequest; decision: "approve" | "reject" } | null>(null);

  async function loadMore() {
    if (!nextCursor) return;
    setLoading(true);
    try {
      const page = await getJson<Page<AdminUploadRequest>>(
        `/admin/upload-requests?status=${status}&cursor=${encodeURIComponent(nextCursor)}`,
      );
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
    } finally {
      setLoading(false);
    }
  }

  async function review(note: string) {
    if (!dialog) return;
    const { request, decision } = dialog;
    try {
      await postJson(`/admin/upload-requests/${request.id}/${decision}`, { note: note || undefined });
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
      throw error;
    }
    setItems((current) => current.filter((item) => item.id !== request.id));
    toast.success(decision === "approve" ? t("approved", { handle: handle(request.user) }) : t("rejected"));
    // Atualiza o contador de pendentes nas abas.
    router.refresh();
  }

  if (items.length === 0) {
    return <EmptyState icon={<Inbox />} title={t(`empty.${status}`)} description={t("emptyHint")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {items.map((request) => (
          <motion.div
            key={request.id}
            layout
            exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
          >
            <Card>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <UserAvatar user={request.user} />
                  <div className="min-w-0 flex-1">
                    <Link href={channelHref(request.user)} className="font-medium hover:text-primary">
                      {request.user.display_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {handle(request.user)} · {t("memberSince")} <TimeAgo date={request.user.created_at} />
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    <TimeAgo date={request.created_at} />
                  </span>
                </div>

                <p className="whitespace-pre-line text-sm">{request.message}</p>
                {request.portfolio_url && (
                  <a
                    href={request.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex w-fit max-w-full items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5 shrink-0" />
                    <span className="truncate">{request.portfolio_url}</span>
                  </a>
                )}

                {status === "pending" ? (
                  request.user.id === currentUserId ? (
                    <p className="text-xs text-muted-foreground">{t("ownRequest")}</p>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setDialog({ request, decision: "reject" })}
                      >
                        <X />
                        {t("reject")}
                      </Button>
                      <Button className="rounded-full" onClick={() => setDialog({ request, decision: "approve" })}>
                        <Check />
                        {t("approve")}
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                    <Badge variant={request.status === "approved" ? "secondary" : "outline"}>
                      {t(`status.${request.status}`)}
                    </Badge>
                    {request.reviewer && t("reviewedBy", { handle: handle(request.reviewer) })}
                    {request.reviewed_at && <TimeAgo date={request.reviewed_at} />}
                    {request.review_note && <p className="w-full whitespace-pre-line">“{request.review_note}”</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" className="rounded-full px-6" onClick={loadMore} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {loading ? tc("loading") : tc("loadMore")}
          </Button>
        </div>
      )}

      <NoteDialog
        open={!!dialog}
        onOpenChange={(open) => !open && setDialog(null)}
        title={
          dialog?.decision === "reject"
            ? t("rejectDialog.title", { handle: dialog ? handle(dialog.request.user) : "" })
            : t("approveDialog.title", { handle: dialog ? handle(dialog.request.user) : "" })
        }
        description={dialog?.decision === "reject" ? t("rejectDialog.description") : t("approveDialog.description")}
        label={dialog?.decision === "reject" ? t("rejectDialog.label") : t("approveDialog.label")}
        confirmLabel={dialog?.decision === "reject" ? t("reject") : t("approve")}
        required={dialog?.decision === "reject"}
        destructive={dialog?.decision === "reject"}
        onConfirm={review}
      />
    </div>
  );
}
