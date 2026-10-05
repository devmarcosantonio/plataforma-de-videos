import type { Metadata } from "next";
import { UploadForm } from "@/components/upload-form";
import { getUsers } from "@/lib/api";
import { getCurrentUserId } from "@/lib/current-user";

export const metadata: Metadata = { title: "Enviar vídeo" };

export default async function UploadPage() {
  const [users, currentUserId] = await Promise.all([getUsers(), getCurrentUserId()]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Enviar vídeo</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        O arquivo vai direto para o servidor de vídeo e é processado automaticamente.
      </p>
      <UploadForm initialUsers={users} currentUserId={currentUserId} />
    </div>
  );
}
