"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@/lib/types";
import { UserAvatar } from "../user-avatar";

const MAX_LENGTH = 2000;

type Props = {
  user: Pick<User, "display_name">;
  placeholder: string;
  submitLabel: string;
  initialValue?: string;
  autoFocus?: boolean;
  compact?: boolean;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
};

export function CommentForm({
  user,
  placeholder,
  submitLabel,
  initialValue = "",
  autoFocus,
  compact,
  onSubmit,
  onCancel,
}: Props) {
  const t = useTranslations();
  const [value, setValue] = useState(initialValue);
  const [focused, setFocused] = useState(!!autoFocus || !!onCancel);
  const [saving, setSaving] = useState(false);

  const trimmed = value.trim();

  async function submit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onSubmit(trimmed);
      setValue("");
      setFocused(!!onCancel);
    } catch {
      // O componente pai já mostra o erro; mantém o texto para tentar de novo.
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setValue("");
    setFocused(false);
    onCancel?.();
  }

  return (
    <form onSubmit={submit} className="flex gap-3">
      <UserAvatar user={user} size={compact ? "sm" : "default"} className="mt-1" />
      <div className="flex flex-1 flex-col gap-2">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) submit(event);
          }}
          placeholder={placeholder}
          maxLength={MAX_LENGTH}
          autoFocus={autoFocus}
          rows={1}
          className={`resize-none transition-[min-height] duration-200 ${focused ? "min-h-20" : "min-h-10"}`}
        />
        <AnimatePresence initial={false}>
          {focused && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center justify-end gap-2 overflow-hidden"
            >
              <span className="mr-auto hidden text-xs text-muted-foreground sm:inline">
                {value.length > MAX_LENGTH * 0.9 ? `${value.length}/${MAX_LENGTH}` : t("comments.shortcut")}
              </span>
              <Button type="button" variant="ghost" className="rounded-full" onClick={cancel}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="rounded-full px-4" disabled={!trimmed || saving}>
                {saving ? t("common.sending") : submitLabel}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
