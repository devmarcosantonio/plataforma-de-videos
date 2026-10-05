"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AtSign, Check, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getJson } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type Availability = { username: string; available: boolean; message: string | null };
type CheckState = { value: string; result: Availability | "error" };

const DEBOUNCE_MS = 400;

// Campo de @username que consulta a disponibilidade enquanto a pessoa digita.
export function UsernameField({ disabled }: { disabled?: boolean }) {
  const [value, setValue] = useState("");
  const [check, setCheck] = useState<CheckState | null>(null);

  const normalized = value.trim().toLowerCase();

  useEffect(() => {
    if (!normalized) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await getJson<Availability>(
          `/users/username-available?username=${encodeURIComponent(normalized)}`,
        );
        if (!cancelled) setCheck({ value: normalized, result });
      } catch {
        if (!cancelled) setCheck({ value: normalized, result: "error" });
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalized]);

  // Resultado só vale para o texto atual; enquanto não chega, está "verificando".
  const current = normalized && check?.value === normalized ? check.result : null;
  const checking = !!normalized && current === null;
  const available = current !== null && current !== "error" && current.available;
  const invalid = current !== null && !available;
  const status = checking ? "checking" : available ? "ok" : invalid ? "bad" : "idle";

  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <div className="relative">
        <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="username"
          value={value}
          onChange={(event) => setValue(event.target.value.toLowerCase())}
          placeholder="nome.de.usuario"
          required
          minLength={3}
          maxLength={30}
          autoComplete="username"
          spellCheck={false}
          disabled={disabled}
          aria-invalid={invalid}
          className="h-10 pr-9 pl-9"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={status}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="grid place-items-center"
            >
              {status === "checking" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              {status === "ok" && <Check className="size-4 text-primary" />}
              {status === "bad" && <X className="size-4 text-destructive" />}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>
      <p className={cn("text-xs", invalid ? "text-destructive" : "text-muted-foreground")}>
        {current === "error"
          ? "Não foi possível verificar agora."
          : current && !current.available
            ? current.message
            : available
              ? `@${normalized} está disponível`
              : "3 a 30 caracteres: letras minúsculas, números, ponto e underline."}
      </p>
    </div>
  );
}
