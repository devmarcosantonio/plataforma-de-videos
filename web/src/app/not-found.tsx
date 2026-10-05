import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState icon={<FileQuestion />} title="Página não encontrada" description="O conteúdo pode ter sido removido.">
      <Button asChild variant="outline" className="rounded-full px-5">
        <Link href="/">
          <Home />
          Voltar ao início
        </Link>
      </Button>
    </EmptyState>
  );
}
