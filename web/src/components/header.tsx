"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Clapperboard, LogIn, Menu, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { SITE_NAME } from "@/lib/format";
import type { AuthUser } from "@/lib/types";
import { LocaleSwitcher } from "./locale-switcher";
import { NotificationBell } from "./notifications/notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

type Props = { onMenuClick: () => void; user: AuthUser | null };

export function Header({ onMenuClick, user }: Props) {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4">
      <Button variant="ghost" size="icon-lg" className="rounded-full" onClick={onMenuClick} aria-label={t("nav.openMenu")}>
        <Menu className="size-5" />
      </Button>

      <Link href="/" className="group flex shrink-0 items-center gap-2 font-semibold tracking-tight">
        <motion.span
          whileHover={{ rotate: -8, scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/30"
        >
          <Clapperboard className="size-4.5" />
        </motion.span>
        <span className="hidden sm:inline">{SITE_NAME}</span>
      </Link>

      <Suspense fallback={<div className="mx-auto w-full max-w-xl" />}>
        <SearchBar />
      </Suspense>

      {user && (
        <Button asChild className="h-9 shrink-0 rounded-full px-4">
          <Link href="/upload">
            <Plus />
            <span className="hidden sm:inline">{t("header.upload")}</span>
          </Link>
        </Button>
      )}
      {/* O seletor usa useSearchParams: Suspense evita que a página inteira dependa da URL. */}
      <Suspense fallback={null}>
        <LocaleSwitcher userId={user?.id ?? null} />
      </Suspense>
      <ThemeToggle />
      {user && <NotificationBell />}
      {user ? (
        <UserMenu user={user} />
      ) : (
        <Button asChild variant="outline" className="h-9 shrink-0 rounded-full px-4">
          <Link href="/login">
            <LogIn />
            {t("common.signIn")}
          </Link>
        </Button>
      )}
    </header>
  );
}

function SearchBar() {
  const t = useTranslations("header");
  const router = useRouter();
  const searchParams = useSearchParams();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q")?.toString().trim();
    router.push(query ? `/?q=${encodeURIComponent(query)}` : "/");
  }

  return (
    <form onSubmit={onSubmit} role="search" className="group/search mx-auto w-full max-w-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/search:text-primary" />
        <Input
          key={searchParams.get("q") ?? ""}
          name="q"
          type="search"
          defaultValue={searchParams.get("q") ?? ""}
          placeholder={t("search")}
          aria-label={t("search")}
          className="h-10 rounded-full bg-muted/60 pl-10 transition-[background-color,box-shadow] focus-visible:bg-background"
        />
      </div>
    </form>
  );
}
