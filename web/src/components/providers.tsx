"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// O script do tema roda a partir do HTML do servidor, antes da hidratação (evita piscar o tema errado).
// No navegador, o React 19 avisa ao encontrar <script> num componente: lá ele ganha um tipo que não executa.
// A diferença de atributo não quebra a hidratação (o next-themes usa suppressHydrationWarning no script).
const themeScriptProps = typeof window === "undefined" ? undefined : ({ type: "application/json" } as const);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={themeScriptProps}
    >
      {/* Respeita "reduzir movimento" do sistema operacional em todas as animações. */}
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
