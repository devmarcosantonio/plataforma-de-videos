import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { redirect } from "@/i18n/navigation";
import { getSession, safeNext } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signIn");
  return { title: t("title") };
}

export default async function LoginPage({ searchParams }: PageProps<"/[locale]/login">) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect({ href: next, locale: await getLocale() });
  return <LoginForm next={next} />;
}
