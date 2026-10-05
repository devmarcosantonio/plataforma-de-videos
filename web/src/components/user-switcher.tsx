"use client";

import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CURRENT_USER_COOKIE as COOKIE, fullName, handle } from "@/lib/format";
import type { User } from "@/lib/types";
import { UserAvatar } from "./user-avatar";

const GUEST = "__guest__";

// Provisório até existir login: escolhe "quem está usando" a plataforma.
export function UserSwitcher({ users, currentUserId }: { users: User[]; currentUserId: string | null }) {
  const router = useRouter();
  const current = users.find((user) => user.id === currentUserId);

  function select(id: string) {
    document.cookie =
      id === GUEST ? `${COOKIE}=; path=/; max-age=0` : `${COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Usuário atual">
          {current ? (
            <UserAvatar user={current} className="transition-transform hover:scale-105" />
          ) : (
            <UserRound className="size-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Usuário atual (provisório até existir login)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={current?.id ?? GUEST} onValueChange={select}>
          <DropdownMenuRadioItem value={GUEST}>Visitante</DropdownMenuRadioItem>
          {users.map((user) => (
            <DropdownMenuRadioItem key={user.id} value={user.id} className="gap-2">
              <UserAvatar user={user} size="sm" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{fullName(user)}</span>
                <span className="truncate text-xs text-muted-foreground">{handle(user)}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
