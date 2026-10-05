"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Clapperboard, Menu, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITE_NAME } from "@/lib/format";
import type { User } from "@/lib/types";
import { ThemeToggle } from "./theme-toggle";
import { UserSwitcher } from "./user-switcher";

type Props = { onMenuClick: () => void; users: User[]; currentUserId: string | null };

export function Header({ onMenuClick, users, currentUserId }: Props) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4">
      <Button variant="ghost" size="icon-lg" className="rounded-full" onClick={onMenuClick} aria-label="Abrir menu">
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

      <Button asChild className="h-9 shrink-0 rounded-full px-4">
        <Link href="/upload">
          <Upload />
          <span className="hidden sm:inline">Enviar</span>
        </Link>
      </Button>
      <ThemeToggle />
      <UserSwitcher users={users} currentUserId={currentUserId} />
    </header>
  );
}

function SearchBar() {
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
          defaultValue={searchParams.get("q") ?? ""}
          placeholder="Buscar vídeos"
          aria-label="Buscar vídeos"
          className="h-10 rounded-full bg-muted/60 pl-10 transition-[background-color,box-shadow] focus-visible:bg-background"
        />
      </div>
    </form>
  );
}
