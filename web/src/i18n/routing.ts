import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // zh = chinês simplificado.
  locales: ["pt-BR", "en", "es", "ko", "ja", "zh"],
  defaultLocale: "pt-BR",
  // Português sem prefixo (URLs atuais continuam iguais); os outros com /en, /es, /ko, /ja e /zh.
  localePrefix: {
    mode: "as-needed",
    prefixes: { en: "/en", es: "/es", ko: "/ko", ja: "/ja", zh: "/zh" },
  },
  // Na primeira visita usa o idioma do navegador; depois, o cookie da escolha do usuário.
  localeDetection: true,
  localeCookie: { name: "NEXT_LOCALE", maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];

export function hasAppLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

export const LOCALE_LABELS: Record<Locale, string> = {
  "pt-BR": "Português",
  en: "English",
  es: "Español",
  ko: "한국어",
  ja: "日本語",
  zh: "简体中文",
};
