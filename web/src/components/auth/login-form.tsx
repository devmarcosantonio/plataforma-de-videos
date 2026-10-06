"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage, postJson } from "@/lib/client-api";
import { handle } from "@/lib/format";
import type { AuthUser } from "@/lib/types";
import { AuthCard } from "./auth-card";
import { PasswordInput } from "./password-input";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      // A API devolve o token num cookie httpOnly (via proxy /api/*).
      const { user } = await postJson<{ user: AuthUser }>("/auth/login", Object.fromEntries(new FormData(event.currentTarget)));
      toast.success(`Bem-vindo de volta, ${handle(user)}!`);
      router.replace(next);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "Não foi possível entrar."));
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Entrar"
      description="Entre para curtir, comentar e publicar vídeos."
      footer={
        <>
          Não tem conta?{" "}
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="login">E-mail ou nome de usuário</Label>
          <Input id="login" name="login" required autoComplete="username" autoFocus className="h-10" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Senha</Label>
          <PasswordInput id="password" name="password" required autoComplete="current-password" />
        </div>
        <Button type="submit" size="lg" className="mt-2 h-10 rounded-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </AuthCard>
  );
}
