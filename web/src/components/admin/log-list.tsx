"use client";

import { useState } from "react";
import { ScrollText, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { errorMessage, getJson } from "@/lib/client-api";
import { channelHref, handle } from "@/lib/format";
import type { ModerationLog, Page } from "@/lib/types";
import { EmptyState } from "../empty-state";
import { TimeAgo } from "../time-ago";

// Ação gravada na API → chave da mensagem (o next-intl não aceita ponto no nome da chave).
// Ações desconhecidas aparecem pelo nome técnico.
const ACTION_KEYS = {
  "upload_request.approve": "uploadRequestApprove",
  "upload_request.reject": "uploadRequestReject",
  "upload_access.grant": "uploadAccessGrant",
  "upload_access.revoke": "uploadAccessRevoke",
  "role.change": "roleChange",
  "comment.remove": "commentRemove",
  "restriction.apply": "restrictionApply",
  "restriction.revoke": "restrictionRevoke",
  "report.dismiss": "reportDismiss",
  "report.action": "reportAction",
  "video.review": "videoReview",
  "video.remove": "videoRemove",
  "video.restore": "videoRestore",
  "video.purge": "videoPurge",
  "comment.restore": "commentRestore",
  "comment.purge": "commentPurge",
} as const;
const actionKey = (action: string) =>
  Object.hasOwn(ACTION_KEYS, action) ? ACTION_KEYS[action as keyof typeof ACTION_KEYS] : null;

export function LogList({ initialPage }: { initialPage: Page<ModerationLog> }) {
  const t = useTranslations("admin.logs");
  const tc = useTranslations("common");
  const tr = useTranslations("roles");
  const trs = useTranslations("restrictions");
  const [items, setItems] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.next_cursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!nextCursor) return;
    setLoading(true);
    try {
      const page = await getJson<Page<ModerationLog>>(`/admin/logs?cursor=${encodeURIComponent(nextCursor)}`);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (error) {
      toast.error(errorMessage(error, tc("genericError")));
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) return <EmptyState icon={<ScrollText />} title={t("empty")} />;

  const person = (user: ModerationLog["actor"]) =>
    user ? (
      <Link href={channelHref(user)} className="font-medium hover:text-primary">
        {handle(user)}
      </Link>
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-0 overflow-hidden py-0">
        <ul className="divide-y">
          {items.map((log) => {
            const key = actionKey(log.action);
            const to = typeof log.metadata?.to === "string" ? tr(log.metadata.to as "user") : "";
            // Tipos da restrição aplicada (lista) ou revogada (um só).
            const meta = log.metadata ?? {};
            const restrictionTypes = (Array.isArray(meta.types) ? meta.types : typeof meta.type === "string" ? [meta.type] : [])
              .map((type) => trs(`types.${type as "comment"}`))
              .join(", ");
            return (
              <li key={log.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
                <p>
                  {person(log.actor) ?? <span className="font-medium">{t("system")}</span>}{" "}
                  {key ? t(`actions.${key}`, { role: to, types: restrictionTypes, title: typeof meta.title === "string" ? meta.title : "" }) : log.action}{" "}
                  {person(log.target_user)}
                </p>
                {meta.self_decision === true && (
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{t("selfDecision")}</p>
                )}
                {log.reason && <p className="whitespace-pre-line text-muted-foreground">“{log.reason}”</p>}
                <p className="text-xs text-muted-foreground">
                  <TimeAgo date={log.created_at} />
                </p>
              </li>
            );
          })}
        </ul>
      </Card>
      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" className="rounded-full px-6" onClick={loadMore} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {loading ? tc("loading") : tc("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
