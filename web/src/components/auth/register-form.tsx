"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage, postJson } from "@/lib/client-api";
import { handle } from "@/lib/format";
import type { AuthUser } from "@/lib/types";
import { UsernameField } from "../username-field";
import { AuthCard } from "./auth-card";
import { PasswordInput } from "./password-input";

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      // Cadastro já faz login: a API devolve o token no cookie.
      const { user } = await postJson<{ user: AuthUser }>("/auth/register", Object.fromEntries(new FormData(event.currentTarget)));
      toast.success(`Conta criada! Bem-vindo, ${handle(user)}.`);
      router.replace(next);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "Não foi possível criar a conta."));
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Criar conta"
      description="Leva menos de um minuto."
      footer={
        <>
          Já tem conta?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="username">Nome de usuário</Label>
          <UsernameField disabled={loading} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required autoComplete="given-name" className="h-10" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="last_name">Sobrenome</Label>
          <Input id="last_name" name="last_name" required autoComplete="family-name" className="h-10" />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" className="h-10" />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="password">Senha</Label>
          <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" />
          <p className="text-xs text-muted-foreground">Pelo menos 8 caracteres.</p>
        </div>
        <Button type="submit" size="lg" className="mt-2 h-10 rounded-full sm:col-span-2" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <UserPlus />}
          {loading ? "Criando conta…" : "Criar conta"}
        </Button>
      </form>
    </AuthCard>
  );
}
