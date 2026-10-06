"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Flag, Inbox, ScrollText, Users } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", key: "requests", icon: Inbox },
  { href: "/admin/reports", key: "reports", icon: Flag },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/logs", key: "logs", icon: ScrollText },
] as const;

// Contadores nas abas: pedidos pendentes e denúncias abertas.
export function AdminTabs({ counts }: { counts: { requests: number; reports: number } }) {
  const t = useTranslations("admin.tabs");
  const pathname = usePathname();

  return (
    // overflow-y-hidden: sem isso o navegador mostra setas de rolagem vertical no fim da barra.
    <nav className="mt-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b">
      {TABS.map((tab) => {
        // "Usuários" continua ativa na página de detalhes (/admin/users/:id).
        const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "relative flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm transition-colors",
              active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.icon className="size-4" />
            {t(tab.key)}
            {(tab.key === "requests" || tab.key === "reports") && counts[tab.key] > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                {counts[tab.key]}
              </span>
            )}
            {active && (
              <motion.span layoutId="admin-tab" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
