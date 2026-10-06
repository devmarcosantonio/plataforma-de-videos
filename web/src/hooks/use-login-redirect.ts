"use client";

import { usePathname, useRouter } from "@/i18n/navigation";

// Leva o visitante para o login (no idioma atual) e, depois de entrar, de volta para a página atual.
export function useLoginRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  return () => router.push(`/login?next=${encodeURIComponent(pathname)}`);
}
