"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ThumbsDown, ThumbsUp, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { errorMessage, sendJson } from "@/lib/client-api";
import type { ReactionStatus, ReactionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";

type Props = {
  videoId: string;
  initial: ReactionStatus;
  loggedIn: boolean;
  disabled?: boolean;
};

// Calcula na hora o resultado esperado de um clique (a API confirma em seguida).
function predict(state: ReactionStatus, next: ReactionType | null): ReactionStatus {
  const delta = (type: ReactionType) => (next === type ? 1 : 0) - (state.reaction === type ? 1 : 0);
  return {
    reaction: next,
    likes_count: state.likes_count + delta("like"),
    ...(state.dislikes_count !== undefined && { dislikes_count: state.dislikes_count + delta("dislike") }),
  };
}

export function ReactionButtons({ videoId, initial, loggedIn, disabled }: Props) {
  const t = useTranslations("reactions");
  const [state, setState] = useState(initial);
  const [pending, setPending] = useState(false);
  const goToLogin = useLoginRedirect();

  const blockedReason = disabled ? t("notReady") : null;

  async function react(type: ReactionType) {
    // Visitante: o clique leva para o login e volta para este vídeo.
    if (!loggedIn) {
      toast.info(t("signInToReact"));
      goToLogin();
      return;
    }
    if (pending) return;

    // Clicar na reação já marcada remove; clicar na outra troca.
    const next = state.reaction === type ? null : type;
    const previous = state;
    setState(predict(state, next));
    setPending(true);

    try {
      const result = await sendJson<ReactionStatus>(
        next ? "PUT" : "DELETE",
        `/videos/${videoId}/reaction`,
        next ? { type: next } : {},
      );
      setState(result);
    } catch (err) {
      setState(previous);
      toast.error(errorMessage(err, t("error")));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center overflow-hidden rounded-full bg-muted ring-1 ring-border">
      <ReactionButton
        icon={ThumbsUp}
        active={state.reaction === "like"}
        label={state.reaction === "like" ? t("removeLike") : t("like")}
        blockedReason={blockedReason}
        disabled={pending}
        onClick={() => react("like")}
      >
        <AnimatedNumber value={state.likes_count} className="font-mono" />
      </ReactionButton>
      <Separator orientation="vertical" className="h-5" />
      <ReactionButton
        icon={ThumbsDown}
        active={state.reaction === "dislike"}
        label={state.reaction === "dislike" ? t("removeDislike") : t("dislike")}
        blockedReason={blockedReason}
        disabled={pending}
        onClick={() => react("dislike")}
      >
        {state.dislikes_count !== undefined && (
          <AnimatedNumber value={state.dislikes_count} className="font-mono" />
        )}
      </ReactionButton>
    </div>
  );
}

type ButtonProps = {
  icon: LucideIcon;
  active: boolean;
  label: string;
  blockedReason: string | null;
  disabled: boolean;
  onClick: () => void;
  children?: React.ReactNode;
};

function ReactionButton({ icon: Icon, active, label, blockedReason, disabled, onClick, children }: ButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* span: o tooltip continua funcionando com o botão desabilitado. */}
        <span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClick}
            disabled={!!blockedReason || disabled}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              active ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {/* "Pula" ao ser marcado. */}
            <motion.span
              key={String(active)}
              initial={active ? { scale: 0.4, rotate: -25 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 14 }}
              className="grid place-items-center"
            >
              <Icon className={cn("size-4", active && "fill-current")} />
            </motion.span>
            {children}
          </motion.button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{blockedReason ?? label}</TooltipContent>
    </Tooltip>
  );
}
