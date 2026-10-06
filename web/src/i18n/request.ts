import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// Configuração por requisição: idioma (vem do segmento [locale]) e mensagens daquele idioma.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Fuso fixo para datas iguais no servidor e no navegador (evita diferença na hidratação).
    timeZone: "America/Sao_Paulo",
  };
});
