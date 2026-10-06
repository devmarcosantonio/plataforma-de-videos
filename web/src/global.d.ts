// Tipagem do next-intl: chaves de tradução e idiomas verificados pelo TypeScript.
// Uma chave inexistente em t("...") vira erro de compilação.
import type messages from "../messages/pt-BR.json";
import type { routing } from "./i18n/routing";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
