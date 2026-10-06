"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_LABELS, routing, type Locale } from "@/i18n/routing";
import { sendJson } from "@/lib/client-api";

type Props = { userId: string | null };

export function LocaleSwitcher({ userId }: Props) {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === locale) return;
    // Logado: guarda a preferência na conta (vale em qualquer dispositivo). Falhar aqui não impede a troca.
    if (userId) sendJson("PATCH", `/users/${userId}`, { locale: next }).catch(() => {});

    const query = searchParams.toString();
    startTransition(() => {
      // Mesma página no outro idioma; o next-intl grava a escolha no cookie NEXT_LOCALE.
      router.replace(query ? `${pathname}?${query}` : pathname, { locale: next });
    });
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label={t("change")} disabled={isPending}>
              <Languages className="size-5" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("label")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {routing.locales.map((option) => (
          // lang: leitores de tela pronunciam cada nome no próprio idioma.
          <DropdownMenuItem key={option} lang={option} onSelect={() => change(option)}>
            <span className="flex-1">{LOCALE_LABELS[option]}</span>
            {option === locale && <Check className="text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
