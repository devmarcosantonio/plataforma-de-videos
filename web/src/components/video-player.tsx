"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";

// API de controle do player do Bunny (Player.js): https://bunny.net/docs/stream/playback-api
const PLAYER_JS = "https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js";
const SAVE_EVERY_MS = 15_000;

type TimeUpdate = { seconds: number; duration: number };
type PlayerJs = {
  on(event: "ready" | "pause" | "ended", callback: () => void): void;
  on(event: "timeupdate", callback: (data: TimeUpdate) => void): void;
  off(event: string): void;
  getDuration(callback: (value: number) => void): void;
};

declare global {
  interface Window {
    playerjs?: { Player: new (element: HTMLIFrameElement) => PlayerJs };
  }
}

// Carrega o script uma vez só, mesmo com vários players ou navegações.
let loading: Promise<void> | null = null;
function loadPlayerJs(): Promise<void> {
  if (window.playerjs) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PLAYER_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("player.js indisponível"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

type Props = {
  videoId: string;
  embedUrl: string;
  title: string;
  // Onde retomar (segundos); 0 = do início.
  resumeAt: number;
  // Só salva progresso para quem está logado.
  trackProgress: boolean;
};

export function VideoPlayer({ videoId, embedUrl, title, resumeAt, trackProgress }: Props) {
  const t = useTranslations("history");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [startAt, setStartAt] = useState(resumeAt);

  // O parâmetro "t" faz o player do Bunny começar no tempo indicado.
  const src = (() => {
    const url = new URL(embedUrl);
    if (startAt > 0) url.searchParams.set("t", String(Math.floor(startAt)));
    return url.toString();
  })();

  useEffect(() => {
    if (!trackProgress) return;

    let player: PlayerJs | null = null;
    let current = 0;
    let lastSaved = 0;
    let cancelled = false;

    // keepalive/sendBeacon: o aviso chega mesmo se a página estiver fechando.
    const save = (closing = false) => {
      const position = Math.floor(current);
      if (position <= 0) return;
      const url = `/api/videos/${videoId}/progress`;
      const body = JSON.stringify({ position });
      if (closing && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
        return;
      }
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    };

    loadPlayerJs()
      .then(() => {
        if (cancelled || !iframeRef.current || !window.playerjs) return;
        player = new window.playerjs.Player(iframeRef.current);
        player.on("ready", () => {
          player?.on("timeupdate", ({ seconds }) => {
            current = seconds;
            if (Date.now() - lastSaved >= SAVE_EVERY_MS) {
              lastSaved = Date.now();
              save();
            }
          });
          player?.on("pause", () => save());
          player?.on("ended", () =>
            player?.getDuration((duration) => {
              current = duration;
              save();
            }),
          );
        });
      })
      // Sem player.js (bloqueador, rede): o vídeo toca normalmente, só não salva o progresso.
      .catch(() => {});

    const onHidden = () => document.visibilityState === "hidden" && save(true);
    const onPageHide = () => save(true);
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      cancelled = true;
      // Saindo da página pela navegação do próprio site.
      save(true);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [videoId, trackProgress, src]);

  return (
    <div className="relative size-full">
      <iframe
        // key: trocar o ponto de início recarrega o player.
        key={src}
        ref={iframeRef}
        src={src}
        title={title}
        className="size-full"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
      {startAt > 0 && (
        <ResumeNotice
          label={t("resumeFrom", { time: formatDuration(startAt) ?? "0:00" })}
          startOverLabel={t("startOver")}
          onStartOver={() => setStartAt(0)}
        />
      )}
    </div>
  );
}

const NOTICE_SECONDS = 5;

type NoticeProps = { label: string; startOverLabel: string; onStartOver: () => void };

// Aviso "Continuando de 2:10": fica 5 s na tela com contagem regressiva e fecha sozinho.
function ResumeNotice({ label, startOverLabel, onStartOver }: NoticeProps) {
  const [secondsLeft, setSecondsLeft] = useState(NOTICE_SECONDS);

  // Um segundo por vez; ao chegar a zero o aviso sai e o contador para.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return (
    <AnimatePresence>
      {secondsLeft > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
          className="absolute bottom-16 left-3 overflow-hidden rounded-full bg-black/70 text-xs text-white backdrop-blur"
          role="status"
        >
          <div className="flex items-center gap-2 py-1 pl-3 pr-1">
            {label}
            <Button
              size="xs"
              variant="ghost"
              className="rounded-full text-white hover:bg-white/15 hover:text-white"
              onClick={onStartOver}
            >
              <RotateCcw />
              {startOverLabel}
            </Button>
            <span
              className="grid size-5 place-items-center rounded-full bg-white/15 font-mono text-[10px] tabular-nums"
              aria-hidden
            >
              {secondsLeft}
            </span>
          </div>
          {/* Barrinha que esvazia ao longo dos 5 segundos. */}
          <motion.div
            className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: NOTICE_SECONDS, ease: "linear" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
