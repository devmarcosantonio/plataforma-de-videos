"use client";

import { Globe, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import type { VideoVisibility } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: VideoVisibility; icon: typeof Globe }[] = [
  { value: "private", icon: Lock },
  { value: "public", icon: Globe },
];

type Props = { value: VideoVisibility; onChange: (value: VideoVisibility) => void; disabled?: boolean };

// Público (todos veem) ou privado (só o dono). Usado no envio e na edição do vídeo.
export function VisibilityPicker({ value, onChange, disabled }: Props) {
  const t = useTranslations("visibility");
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-2 text-sm font-medium">{t("label")}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors",
              value === option.value ? "border-primary bg-primary/5" : "hover:bg-muted",
            )}
          >
            <input
              type="radio"
              name="visibility"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <option.icon className={cn("mt-0.5 size-4 shrink-0", value === option.value ? "text-primary" : "text-muted-foreground")} />
            <span className="flex flex-col">
              <span className="font-medium">{t(`${option.value}.label`)}</span>
              <span className="text-xs text-muted-foreground">{t(`${option.value}.hint`)}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
