import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { routing } from "@/i18n/routing";
import { getSession } from "@/lib/auth";
import { SITE_NAME } from "@/lib/format";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale });
  return {
    title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
    description: t("metadata.description"),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Permite renderização estática/otimizada sabendo o idioma desta árvore.
  setRequestLocale(locale);

  // O layout não pode quebrar se a API estiver fora: as páginas mostram o erro.
  const user = await getSession().catch(() => null);

  return (
    // suppressHydrationWarning: o next-themes define a classe do tema antes da hidratação.
    <html
      // zh-CN: o navegador usa os glifos do chinês simplificado.
      lang={locale === "zh" ? "zh-CN" : locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* Repassa idioma e mensagens para os componentes de cliente. */}
        <NextIntlClientProvider>
          <Providers>
            <AppShell user={user}>{children}</AppShell>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
