"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Video } from "@/lib/types";

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;

type Props = {
  video: Video | null;
  onOpenChange: (open: boolean) => void;
  onSave: (changes: { title: string; description: string }) => Promise<void>;
};

export function EditVideoDialog({ video, onOpenChange, onSave }: Props) {
  return (
    <Dialog open={!!video} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* key: o formulário recomeça com os dados do vídeo escolhido. */}
        {video && <EditForm key={video.id} video={video} onSave={onSave} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({ video, onSave, onCancel }: { video: Video; onSave: Props["onSave"]; onCancel: () => void }) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? "");
  const [saving, setSaving] = useState(false);

  const unchanged = title.trim() === video.title && description.trim() === (video.description ?? "");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || unchanged) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), description: description.trim() });
      onCancel();
    } catch {
      // O erro já aparece em um toast; mantém o diálogo aberto para tentar de novo.
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>Editar vídeo</DialogTitle>
        <DialogDescription>As alterações aparecem na hora para todo mundo.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="edit-title">Título</Label>
          <span className="font-mono text-xs text-muted-foreground">
            {title.length}/{TITLE_MAX}
          </span>
        </div>
        <Input
          id="edit-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TITLE_MAX}
          required
          autoFocus
          className="h-10"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="edit-description">Descrição</Label>
          <span className="font-mono text-xs text-muted-foreground">
            {description.length}/{DESCRIPTION_MAX}
          </span>
        </div>
        <Textarea
          id="edit-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={DESCRIPTION_MAX}
          rows={6}
          placeholder="Conte do que se trata o vídeo"
          className="max-h-72"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || unchanged || !title.trim()}>
          {saving && <Loader2 className="animate-spin" />}
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
