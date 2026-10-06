import { notFound } from "next/navigation";

// Qualquer caminho desconhecido dentro de um idioma cai aqui e mostra a 404 traduzida.
export default function CatchAll() {
  notFound();
}
