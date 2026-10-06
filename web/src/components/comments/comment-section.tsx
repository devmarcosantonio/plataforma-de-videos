"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LogIn, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AnimatedNumber } from "@/components/animated-number";
import { Button } from "@/components/ui/button";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { errorMessage, getJson, sendJson } from "@/lib/client-api";
import type { ActiveRestriction, AuthUser, Comment, CommentPage } from "@/lib/types";
import { RestrictionNotice } from "../restriction-notice";
import { CommentForm } from "./comment-form";
import { CommentThread, itemMotion, type ThreadContext } from "./comment-thread";

type Props = {
  videoId: string;
  videoOwnerId: string;
  currentUser: AuthUser | null;
  canComment: boolean;
  // Restrição que impede quem está logado de comentar (mostra prazo e motivo no lugar da caixa).
  restriction?: ActiveRestriction | null;
  initialPage: CommentPage;
  initialCount: number;
};

export function CommentSection({
  videoId,
  videoOwnerId,
  currentUser,
  canComment,
  restriction,
  initialPage,
  initialCount,
}: Props) {
  const t = useTranslations("comments");
  const tc = useTranslations("common");
  const [comments, setComments] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.next_cursor);
  const [count, setCount] = useState(initialCount);
  const [loadingMore, setLoadingMore] = useState(false);
  const goToLogin = useLoginRedirect();

  const ctx: ThreadContext = {
    videoId,
    videoOwnerId,
    currentUser,
    // Restrito: sem responder também (as respostas são comentários).
    canComment: canComment && !restriction,
    onCountChange: (delta) => setCount((value) => value + delta),
  };

  async function create(content: string) {
    if (!currentUser) return;
    try {
      const created = await sendJson<Comment>("POST", `/videos/${videoId}/comments`, { content });
      setComments((current) => [created, ...current]);
      setCount((value) => value + 1);
    } catch (err) {
      toast.error(errorMessage(err, t("errors.send")));
      throw err;
    }
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await getJson<CommentPage>(
        `/videos/${videoId}/comments?cursor=${encodeURIComponent(nextCursor)}`,
      );
      // Evita duplicar comentários criados nesta sessão que também vieram na página.
      setComments((current) => {
        const seen = new Set(current.map((c) => c.id));
        return [...current, ...page.items.filter((c) => !seen.has(c.id))];
      });
      setNextCursor(page.next_cursor);
    } catch (err) {
      toast.error(errorMessage(err, t("errors.loadMore")));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <MessageSquare className="size-5 text-primary" />
        <AnimatedNumber value={count} />
        {t("label", { count })}
      </h2>

      <div className="mt-5">
        {!canComment ? (
          <p className="text-sm text-muted-foreground">{t("notReady")}</p>
        ) : restriction ? (
          <RestrictionNotice restriction={restriction} />
        ) : currentUser ? (
          <CommentForm user={currentUser} placeholder={t("placeholder")} submitLabel={t("submit")} onSubmit={create} />
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-4">
            <p className="flex-1 text-sm text-muted-foreground">{t("signInPrompt")}</p>
            <Button variant="outline" className="rounded-full" onClick={goToLogin}>
              <LogIn />
              {tc("signIn")}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <AnimatePresence initial={false}>
          {comments.map((comment) => (
            <motion.div key={comment.id} {...itemMotion} className="overflow-hidden">
              <CommentThread
                initial={comment}
                ctx={ctx}
                onRemoved={(id) => setComments((current) => current.filter((c) => c.id !== id))}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {nextCursor && (
        <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="mt-6 rounded-full px-5">
          {loadingMore ? tc("loading") : t("moreComments")}
        </Button>
      )}
    </section>
  );
}
