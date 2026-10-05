"use client";

import { RotateCw, ServerCrash } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <EmptyState
      icon={<ServerCrash />}
      title="Não foi possível carregar"
      description="Verifique se a API está rodando (npm run dev na pasta api) e tente de novo."
    >
      <Button variant="outline" className="rounded-full px-5" onClick={() => retry()}>
        <RotateCw />
        Tentar novamente
      </Button>
    </EmptyState>
  );
}
