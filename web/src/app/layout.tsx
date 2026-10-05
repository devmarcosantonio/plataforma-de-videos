import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { getUsers } from "@/lib/api";
import { getCurrentUserId } from "@/lib/current-user";
import { SITE_NAME } from "@/lib/format";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: "Plataforma de vídeos",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // O layout não pode quebrar se a API estiver fora: as páginas mostram o erro.
  const [users, currentUserId] = await Promise.all([getUsers().catch(() => []), getCurrentUserId()]);

  return (
    // suppressHydrationWarning: o next-themes define a classe do tema antes da hidratação.
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          <AppShell users={users} currentUserId={currentUserId}>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
