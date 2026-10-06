"use client";

import { createContext, useContext, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AnimatedNumber } from "@/components/animated-number";
import { Button } from "@/components/ui/button";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { errorMessage, sendJson } from "@/lib/client-api";
import type { FollowStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type FollowState = FollowStatus & {
  pending: boolean;
  isSelf: boolean;
  toggle: () => void;
};

const FollowContext = createContext<FollowState | null>(null);

function useFollow(): FollowState {
  const state = useContext(FollowContext);
  if (!state) throw new Error("Use dentro de <FollowProvider>");
  return state;
}

type ProviderProps = {
  userId: string;
  initial: FollowStatus;
  loggedIn: boolean;
  isSelf: boolean;
  children: React.ReactNode;
};

// Compartilha o estado entre o botão e a contagem, que ficam em lugares diferentes da página.
export function FollowProvider({ userId, initial, loggedIn, isSelf, children }: ProviderProps) {
  const t = useTranslations("follow");
  const [status, setStatus] = useState(initial);
  const [pending, setPending] = useState(false);
  const goToLogin = useLoginRedirect();

  async function toggle() {
    if (!loggedIn) {
      toast.info(t("signInToFollow"));
      goToLogin();
      return;
    }
    if (pending || isSelf) return;

    const previous = status;
    const following = !status.following;
    // Atualiza na hora e confirma com a resposta da API.
    setStatus({ following, followers_count: status.followers_count + (following ? 1 : -1) });
    setPending(true);
    try {
      setStatus(await sendJson<FollowStatus>(following ? "PUT" : "DELETE", `/users/${userId}/follow`, {}));
    } catch (error) {
      setStatus(previous);
      toast.error(errorMessage(error, t("error")));
    } finally {
      setPending(false);
    }
  }

  return (
    <FollowContext.Provider value={{ ...status, pending, isSelf, toggle }}>{children}</FollowContext.Provider>
  );
}

export function FollowersCount({ className }: { className?: string }) {
  const t = useTranslations("follow");
  const { followers_count } = useFollow();
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <AnimatedNumber value={followers_count} />
      {t("followersLabel", { count: followers_count })}
    </span>
  );
}

export function FollowButton({ className }: { className?: string }) {
  const t = useTranslations("follow");
  const { following, pending, isSelf, toggle } = useFollow();
  const [hovering, setHovering] = useState(false);

  // Ninguém segue a si mesmo: o botão some no próprio canal/vídeo.
  if (isSelf) return null;

  // "Seguindo" vira "Deixar de seguir" ao passar o mouse, para deixar claro o que o clique faz.
  const label = following ? (hovering ? t("unfollow") : t("following")) : t("follow");

  return (
    <motion.div whileTap={{ scale: 0.95 }} className="shrink-0">
      <Button
        onClick={toggle}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        disabled={pending}
        variant={following ? "secondary" : "default"}
        aria-pressed={following}
        className={cn(
          "h-9 min-w-28 rounded-full px-4 transition-colors",
          following && hovering && "bg-destructive/10 text-destructive hover:bg-destructive/15",
          className,
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={following ? "on" : "off"}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="grid place-items-center"
          >
            {pending ? <Loader2 className="animate-spin" /> : following ? <Check /> : <UserPlus />}
          </motion.span>
        </AnimatePresence>
        {label}
      </Button>
    </motion.div>
  );
}
