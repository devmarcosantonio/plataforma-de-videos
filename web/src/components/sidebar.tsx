"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Compass, History, Home, ListVideo, MonitorPlay, Upload, Users, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SITE_NAME } from "@/lib/format";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; requiresLogin?: boolean };

const MAIN: NavItem[] = [
  { href: "/", label: "Início", icon: Home },
  { href: "/following", label: "Seguindo", icon: Users, requiresLogin: true },
  { href: "/studio", label: "Meu canal", icon: MonitorPlay, requiresLogin: true },
  { href: "/upload", label: "Enviar vídeo", icon: Upload, requiresLogin: true },
];

const SOON: NavItem[] = [
  { href: "#", label: "Explorar", icon: Compass },
  { href: "#", label: "Histórico", icon: History },
  { href: "#", label: "Playlists", icon: ListVideo },
];

type Props = {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  loggedIn: boolean;
};

export function Sidebar({ collapsed, mobileOpen, onMobileOpenChange, loggedIn }: Props) {
  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 240 }}
        transition={{ type: "spring", stiffness: 400, damping: 36 }}
        className="sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 overflow-x-hidden overflow-y-auto border-r lg:block"
      >
        <Nav compact={collapsed} layoutId="nav-active-desktop" loggedIn={loggedIn} />
      </motion.aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b">
            <SheetTitle>{SITE_NAME}</SheetTitle>
          </SheetHeader>
          <Nav
            compact={false}
            layoutId="nav-active-mobile"
            loggedIn={loggedIn}
            onNavigate={() => onMobileOpenChange(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

type NavProps = { compact: boolean; layoutId: string; loggedIn: boolean; onNavigate?: () => void };

function Nav({ compact, layoutId, loggedIn, onNavigate }: NavProps) {
  const pathname = usePathname();
  // Itens que exigem login só aparecem para quem está logado.
  const items = MAIN.filter((item) => loggedIn || !item.requiresLogin);

  return (
    <nav className={cn("flex flex-col gap-1", compact ? "p-2" : "p-3")}>
      {items.map((item) => {
        const active = pathname === item.href;
        const link = (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center rounded-xl text-sm transition-colors",
              compact ? "flex-col gap-1 px-1 py-3 text-[11px]" : "gap-4 px-3 py-2.5",
              active ? "font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {/* Destaque do item ativo desliza entre os itens ao navegar. */}
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <item.icon className="relative size-5 shrink-0" />
            <span className="relative whitespace-nowrap">{item.label}</span>
          </Link>
        );
        return compact ? (
          <Tooltip key={item.label}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        ) : (
          link
        );
      })}

      {!compact && (
        <>
          <Separator className="my-3" />
          <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Em breve</p>
          {SOON.map((item) => (
            <span
              key={item.label}
              className="flex cursor-not-allowed items-center gap-4 rounded-xl px-3 py-2.5 text-sm text-muted-foreground/60"
            >
              <item.icon className="size-5 shrink-0" />
              <span className="flex-1 whitespace-nowrap">{item.label}</span>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                breve
              </Badge>
            </span>
          ))}
        </>
      )}
    </nav>
  );
}
