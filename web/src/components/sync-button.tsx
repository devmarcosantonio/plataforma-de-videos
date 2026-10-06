"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Consulta o status no Bunny na hora. Útil enquanto o webhook não está configurado.
export function SyncButton({ videoId }: { videoId: string }) {
  const t = useTranslations("video");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function sync() {
    startTransition(async () => {
      const response = await fetch(`/api/videos/${videoId}/sync`, { method: "POST" });
      if (!response.ok) {
        toast.error(t("syncError"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      onClick={sync}
      disabled={isPending}
      className="mt-2 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white"
    >
      <RefreshCw className={cn(isPending && "animate-spin")} />
      {t("sync")}
    </Button>
  );
}
