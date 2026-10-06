"use client";

import { useTranslations } from "next-intl";
import { LogOut, MonitorPlay, Upload, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useRouter } from "@/i18n/navigation";
import { postJson } from "@/lib/client-api";
import { channelHref, handle } from "@/lib/format";
import type { AuthUser } from "@/lib/types";
import { UserAvatar } from "./user-avatar";

export function UserMenu({ user }: { user: AuthUser }) {
  const t = useTranslations("account");
  const router = useRouter();

  async function logout() {
    try {
      await postJson<void>("/auth/logout", {});
    } finally {
      router.push("/");
      router.refresh();
      toast.success(t("signedOut"));
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label={t("menu")}>
          <UserAvatar user={user} className="transition-transform hover:scale-105" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
          <UserAvatar user={user} size="lg" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{user.display_name}</span>
            <span className="truncate text-xs text-muted-foreground">{handle(user)}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={channelHref(user)}>
            <UserRound />
            {t("viewChannel")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/studio">
            <MonitorPlay />
            {t("manageChannel")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/upload">
            <Upload />
            {t("upload")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>
          <LogOut />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
