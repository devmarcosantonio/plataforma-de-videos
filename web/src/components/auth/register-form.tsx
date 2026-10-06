"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { errorMessage, postJson } from "@/lib/client-api";
import { handle } from "@/lib/format";
import type { AuthUser } from "@/lib/types";
import { UsernameField } from "../username-field";
import { AuthCard } from "./auth-card";
import { PasswordInput } from "./password-input";

export function RegisterForm({ next }: { next: string }) {
  const t = useTranslations("auth.register");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      // Cadastro já faz login (cookie) e guarda o idioma em que a pessoa se cadastrou.
      const data = { ...Object.fromEntries(new FormData(event.currentTarget)), locale };
      const { user } = await postJson<{ user: AuthUser }>("/auth/register", data);
      toast.success(t("welcome", { handle: handle(user) }));
      router.replace(next);
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
          {t("hasAccount")}{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-primary hover:underline">
            {t("signIn")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="username">{t("username")}</Label>
          <UsernameField disabled={loading} />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="display_name">
            {t("displayName")} <span className="font-normal text-muted-foreground">{tc("optional")}</span>
          </Label>
          <Input
            id="display_name"
            name="display_name"
            maxLength={50}
            autoComplete="name"
            placeholder={t("displayNamePlaceholder")}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">{t("displayNameHint")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" className="h-10" />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="password">{t("password")}</Label>
          <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" />
          <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
        </div>
        <Button type="submit" size="lg" className="mt-2 h-10 rounded-full sm:col-span-2" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <UserPlus />}
          {loading ? t("submitting") : t("submit")}
        </Button>
      </form>
    </AuthCard>
  );
}
