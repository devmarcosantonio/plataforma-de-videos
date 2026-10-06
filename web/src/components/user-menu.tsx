"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, MonitorPlay, Upload } from "lucide-react";
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
import { postJson } from "@/lib/client-api";
import { fullName, handle } from "@/lib/format";
import type { AuthUser } from "@/lib/types";
import { UserAvatar } from "./user-avatar";

export function UserMenu({ user }: { user: AuthUser }) {
  const router = useRouter();

  async function logout() {
    try {
      await postJson<void>("/auth/logout", {});
    } finally {
      router.push("/");
      router.refresh();
      toast.success("Você saiu da conta.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Menu da conta">
          <UserAvatar user={user} className="transition-transform hover:scale-105" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
          <UserAvatar user={user} size="lg" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{fullName(user)}</span>
            <span className="truncate text-xs text-muted-foreground">{handle(user)}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/studio">
            <MonitorPlay />
            Meu canal
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/upload">
            <Upload />
            Enviar vídeo
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
