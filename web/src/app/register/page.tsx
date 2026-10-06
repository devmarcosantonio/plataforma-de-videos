import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getSession, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Criar conta" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next);
  return <RegisterForm next={next} />;
}
