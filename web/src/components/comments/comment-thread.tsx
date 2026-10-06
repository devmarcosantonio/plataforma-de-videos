"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Loader2, MoreVertical, Pencil, Reply, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { errorMessage, getJson, sendJson } from "@/lib/client-api";
import { channelHref, displayName, handle } from "@/lib/format";
import type { Comment, CommentPage, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TimeAgo } from "../time-ago";
import { UserAvatar } from "../user-avatar";
import { CommentForm } from "./comment-form";

export type ThreadContext = {
  videoId: string;
  videoOwnerId: string;
  currentUser: User | null;
  canComment: boolean;
  onCountChange: (delta: number) => void;
};

// Entrada/saída usada por comentários e respostas.
export const itemMotion = {
  initial: { opacity: 0, y: -8, height: 0 },
  animate: { opacity: 1, y: 0, height: "auto" },
  exit: { opacity: 0, x: -16, height: 0 },
  transition: { type: "spring", stiffness: 320, damping: 30 },
} as const;

type Props = {
  initial: Comment;
  ctx: ThreadContext;
  onRemoved: (id: string) => void;
};

// Um comentário principal com suas respostas (só um nível).
export function CommentThread({ initial, ctx, onRemoved }: Props) {
  const t = useTranslations("comments");
  const tc = useTranslations("common");
  const [comment, setComment] = useState(initial);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [replyCount, setReplyCount] = useState(initial.replies_count);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  async function loadReplies(cursor?: string) {
    setLoadingReplies(true);
    try {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const page = await getJson<CommentPage>(`/comments/${comment.id}/replies${query}`);
      setReplies((current) => (cursor ? [...current, ...page.items] : page.items));
      setNextCursor(page.next_cursor);
      setExpanded(true);
    } catch (error) {
      toast.error(errorMessage(error, t("errors.loadReplies")));
    } finally {
      setLoadingReplies(false);
    }
  }

  function toggleReplies() {
    if (expanded) setExpanded(false);
    else if (replies.length > 0) setExpanded(true);
    else loadReplies();
  }

  async function reply(content: string) {
    if (!ctx.currentUser || !replyingTo) return;
    try {
      const created = await sendJson<Comment>("POST", `/videos/${ctx.videoId}/comments`, {
        content,
        parent_id: replyingTo.id,
      });
      setReplyCount((count) => count + 1);
      ctx.onCountChange(1);
      setReplyingTo(null);
      // Se as respostas ainda não foram abertas, carrega todas (já inclui a nova).
      if (expanded) setReplies((current) => [...current, created]);
      else await loadReplies();
    } catch (error) {
      toast.error(errorMessage(error, t("errors.reply")));
      throw error;
    }
  }

  async function edit(target: Comment, content: string) {
    if (!ctx.currentUser) return;
    try {
      const updated = await sendJson<Comment>("PATCH", `/comments/${target.id}`, { content });
      if (target.id === comment.id) setComment(updated);
      else setReplies((current) => current.map((r) => (r.id === updated.id ? updated : r)));
      toast.success(t("editedToast"));
    } catch (error) {
      toast.error(errorMessage(error, t("errors.edit")));
      throw error;
    }
  }

  async function remove(target: Comment) {
    if (!ctx.currentUser) return;
    try {
      await sendJson<void>("DELETE", `/comments/${target.id}`, {});
      ctx.onCountChange(-1);
      toast.success(t("removedToast"));

      if (target.id === comment.id) {
        // Mesmo comportamento da API: com respostas vira "removido", sem respostas some.
        if (replyCount > 0) setComment({ ...comment, deleted: true, content: null, author: null });
        else onRemoved(comment.id);
        return;
      }

      setReplies((current) => current.filter((r) => r.id !== target.id));
      const remaining = replyCount - 1;
      setReplyCount(remaining);
      if (comment.deleted && remaining === 0) onRemoved(comment.id);
    } catch (error) {
      toast.error(errorMessage(error, t("errors.remove")));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <CommentItem
        comment={comment}
        ctx={ctx}
        onReply={() => setReplyingTo(comment)}
        onEdit={(content) => edit(comment, content)}
        onRemove={() => remove(comment)}
      />

      <div className="ml-11 flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {replyingTo && ctx.currentUser && (
            <motion.div key={replyingTo.id} {...itemMotion} className="overflow-hidden">
              <CommentForm
                user={ctx.currentUser}
                compact
                autoFocus
                placeholder={t("replyPlaceholder")}
                submitLabel={t("reply")}
                initialValue={replyingTo.id !== comment.id && replyingTo.author ? `${handle(replyingTo.author)} ` : ""}
                onSubmit={reply}
                onCancel={() => setReplyingTo(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {replyCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleReplies}
            className="w-fit rounded-full font-medium text-primary hover:bg-primary/10 hover:text-primary"
          >
            {loadingReplies && !expanded ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ChevronDown className={cn("transition-transform duration-200", expanded && "rotate-180")} />
            )}
            {t("replies", { count: replyCount })}
          </Button>
        )}

        <AnimatePresence initial={false}>
          {expanded &&
            replies.map((r) => (
              <motion.div key={r.id} {...itemMotion} className="overflow-hidden">
                <CommentItem
                  comment={r}
                  ctx={ctx}
                  compact
                  onReply={() => setReplyingTo(r)}
                  onEdit={(content) => edit(r, content)}
                  onRemove={() => remove(r)}
                />
              </motion.div>
            ))}
        </AnimatePresence>

        {expanded && nextCursor && (
          <Button
            variant="link"
            size="sm"
            onClick={() => loadReplies(nextCursor)}
            disabled={loadingReplies}
            className="w-fit px-0"
          >
            {loadingReplies ? tc("loading") : t("moreReplies")}
          </Button>
        )}
      </div>
    </div>
  );
}

type ItemProps = {
  comment: Comment;
  ctx: ThreadContext;
  compact?: boolean;
  onReply: () => void;
  onEdit: (content: string) => Promise<void>;
  onRemove: () => void;
};

function CommentItem({ comment, ctx, compact, onReply, onEdit, onRemove }: ItemProps) {
  const t = useTranslations("comments");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const me = ctx.currentUser;

  if (comment.deleted) {
    return (
      <div className="flex items-center gap-3">
        <UserAvatar user={null} size={compact ? "sm" : "default"} />
        <p className="text-sm italic text-muted-foreground">{t("removed")}</p>
      </div>
    );
  }

  if (editing && me) {
    return (
      <CommentForm
        user={me}
        compact={compact}
        autoFocus
        initialValue={comment.content ?? ""}
        placeholder={t("editPlaceholder")}
        submitLabel={tc("save")}
        onSubmit={async (content) => {
          await onEdit(content);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const isAuthor = !!me && comment.author?.id === me.id;
  const canRemove = isAuthor || (!!me && ctx.videoOwnerId === me.id);

  return (
    <div className="group/comment flex gap-3">
      {comment.author ? (
        <Link href={channelHref(comment.author)} className="mt-0.5 h-fit shrink-0">
          <UserAvatar user={comment.author} size={compact ? "sm" : "default"} />
        </Link>
      ) : (
        <UserAvatar user={null} size={compact ? "sm" : "default"} className="mt-0.5" />
      )}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-sm">
          {comment.author ? (
            <Link href={channelHref(comment.author)} className="font-medium hover:text-primary">
              {displayName(comment.author, tc("unknownUser"))}
            </Link>
          ) : (
            <span className="font-medium">{displayName(comment.author, tc("unknownUser"))}</span>
          )}
          {comment.author && <span className="text-xs text-muted-foreground">{handle(comment.author)}</span>}
          {comment.author?.id === ctx.videoOwnerId && (
            <Badge variant="secondary" className="bg-primary/15 text-primary">
              {t("author")}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            <TimeAgo date={comment.created_at} />
            {comment.edited_at && ` ${t("edited")}`}
          </span>
        </p>
        <p className="mt-1 whitespace-pre-line wrap-break-word text-sm">{comment.content}</p>
        {me && ctx.canComment && (
          <Button variant="ghost" size="xs" className="-ml-2 mt-1 rounded-full text-muted-foreground" onClick={onReply}>
            <Reply />
            {t("reply")}
          </Button>
        )}
      </div>

      {(isAuthor || canRemove) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("actions")}
              className="rounded-full opacity-0 transition-opacity group-hover/comment:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isAuthor && (
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil />
                {tc("edit")}
              </DropdownMenuItem>
            )}
            {canRemove && (
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(true)}>
                <Trash2 />
                {tc("remove")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {comment.replies_count > 0
                ? t("removeWithReplies")
                : t("removeIrreversible")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onRemove}>
              {tc("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
