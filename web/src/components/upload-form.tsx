"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Upload as TusUpload } from "tus-js-client";
import { FileVideo, Loader2, Play, UploadCloud, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { errorMessage, postJson } from "@/lib/client-api";
import type { UploadCredentials, Video } from "@/lib/types";
import { cn } from "@/lib/utils";

type Phase =
  | { name: "idle" }
  | { name: "creating" }
  | { name: "uploading"; progress: number }
  | { name: "done"; videoId: string };

// O vídeo é sempre publicado pela conta logada (a página exige login).
export function UploadForm() {
  const t = useTranslations("upload");
  const tc = useTranslations("common");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const uploadRef = useRef<TusUpload | null>(null);

  const busy = phase.name === "creating" || phase.name === "uploading";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "");
    const description = String(form.get("description") ?? "") || undefined;

    try {
      setPhase({ name: "creating" });
      const { video, upload } = await postJson<{ video: Video; upload: UploadCredentials }>("/videos", {
        title,
        description,
      });

      setPhase({ name: "uploading", progress: 0 });
      await uploadFile(file, title, upload);
      setPhase({ name: "done", videoId: video.id });
    } catch (error) {
      setPhase({ name: "idle" });
      if (uploadRef.current === null) return; // cancelado pelo usuário
      toast.error(errorMessage(error, t("error")));
    }
  }

  function uploadFile(file: File, title: string, credentials: UploadCredentials) {
    return new Promise<void>((resolve, reject) => {
      const upload = new TusUpload(file, {
        endpoint: credentials.endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: credentials.headers,
        metadata: { filetype: file.type, title },
        onProgress: (sent, total) => setPhase({ name: "uploading", progress: Math.round((sent / total) * 100) }),
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
      uploadRef.current = upload;
      upload.start();
    });
  }

  function cancel() {
    uploadRef.current?.abort(true);
    uploadRef.current = null;
    setPhase({ name: "idle" });
    toast.info(t("cancelled"));
  }

  return (
    <AnimatePresence mode="wait">
      {phase.name === "done" ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          <SuccessCard videoId={phase.videoId} />
        </motion.div>
      ) : (
        <motion.div key="form" exit={{ opacity: 0, y: -12 }} className="mt-8 flex flex-col gap-6">
          <form onSubmit={onSubmit} className="flex flex-col gap-6">
            <FilePicker file={file} onChange={setFile} disabled={busy} />

            <Card>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="title">{t("videoTitle")}</Label>
                  <Input id="title" name="title" required maxLength={200} disabled={busy} className="h-11" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="description">{t("description")}</Label>
                  <Textarea id="description" name="description" rows={4} maxLength={5000} disabled={busy} />
                </div>
              </CardContent>
            </Card>

            <AnimatePresence>
              {phase.name === "uploading" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-2 overflow-hidden"
                >
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      {t("uploading")}
                    </span>
                    <span className="font-mono tabular-nums">{phase.progress}%</span>
                  </div>
                  <Progress value={phase.progress} className="h-2" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end gap-3">
              {phase.name === "uploading" && (
                <Button type="button" variant="ghost" className="rounded-full" onClick={cancel}>
                  {tc("cancel")}
                </Button>
              )}
              <Button type="submit" size="lg" className="rounded-full px-6" disabled={busy || !file}>
                {busy ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                {phase.name === "creating" ? t("preparing") : t("submit")}
              </Button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SuccessCard({ videoId }: { videoId: string }) {
  const t = useTranslations("upload");
  return (
    <Card className="mt-8 items-center py-12 text-center">
      <CardContent className="flex flex-col items-center gap-3">
        <motion.svg viewBox="0 0 52 52" className="size-16 text-primary" initial="hidden" animate="visible">
          <motion.circle
            cx="26"
            cy="26"
            r="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1 } }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          <motion.path
            d="M15 27 l7 7 l15 -15"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1 } }}
            transition={{ duration: 0.35, delay: 0.45, ease: "easeOut" }}
          />
        </motion.svg>
        <h2 className="text-xl font-semibold">{t("done")}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("doneHint")}
        </p>
        <Button asChild className="mt-2 rounded-full px-5">
          <Link href={`/watch/${videoId}`}>
            <Play />
            {t("watch")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function FilePicker({
  file,
  onChange,
  disabled,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled: boolean;
}) {
  const t = useTranslations("upload");
  const [dragging, setDragging] = useState(false);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {file ? (
        <motion.div
          key="file"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          className="flex items-center gap-4 rounded-2xl border bg-card p-4"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <FileVideo className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          {!disabled && (
            <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => onChange(null)} aria-label={t("removeFile")}>
              <X />
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.label
          key="drop"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: dragging ? 1.02 : 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const dropped = event.dataTransfer.files[0];
            if (dropped?.type.startsWith("video/")) onChange(dropped);
            else toast.error(t("notVideo"));
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition-colors",
            dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/60 hover:bg-muted/40",
          )}
        >
          <motion.span
            animate={dragging ? { y: -6 } : { y: [0, -4, 0] }}
            transition={dragging ? { type: "spring" } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"
          >
            <UploadCloud className="size-7" />
          </motion.span>
          <span className="font-medium">{t("dropzone")}</span>
          <span className="text-xs text-muted-foreground">{t("formats")}</span>
          <input
            type="file"
            accept="video/*"
            className="sr-only"
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          />
        </motion.label>
      )}
    </AnimatePresence>
  );
}
