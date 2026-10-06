"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { hasAppLocale } from "@/i18n/routing";
import { errorMessage, postJson } from "@/lib/client-api";
import { handle } from "@/lib/format";
import type { AuthUser } from "@/lib/types";
import { AuthCard } from "./auth-card";
import { PasswordInput } from "./password-input";

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations("auth.signIn");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      // A API devolve o token num cookie httpOnly (via proxy /api/*).
      const { user } = await postJson<{ user: AuthUser }>("/auth/login", Object.fromEntries(new FormData(event.currentTarget)));
      toast.success(t("welcome", { handle: handle(user) }));
      // Se a conta tem um idioma salvo, entra nele (a preferência acompanha a pessoa em qualquer dispositivo).
      const preferred = user.locale && hasAppLocale(user.locale) ? user.locale : locale;
      router.replace(next, { locale: preferred });
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t("error")));
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title={t("title")}
      description={t("description")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-medium text-primary hover:underline">
            {t("createAccount")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="login">{t("login")}</Label>
          <Input id="login" name="login" required autoComplete="username" autoFocus className="h-10" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t("password")}</Label>
          <PasswordInput id="password" name="password" required autoComplete="current-password" />
        </div>
        <Button type="submit" size="lg" className="mt-2 h-10 rounded-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
          {loading ? t("submitting") : t("submit")}
        </Button>
      </form>
    </AuthCard>
  );
}
