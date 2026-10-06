import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { RegisterForm } from "@/components/auth/register-form";
import { redirect } from "@/i18n/navigation";
import { getSession, safeNext } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: t("title") };
}

export default async function RegisterPage({ searchParams }: PageProps<"/[locale]/register">) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect({ href: next, locale: await getLocale() });
  return <RegisterForm next={next} />;
}
