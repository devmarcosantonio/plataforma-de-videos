// 404 para requisições que nem chegam ao segmento [locale] (ex.: caminho inválido fora do proxy).
// As páginas normais usam a 404 traduzida de app/[locale]/not-found.tsx.
export default function GlobalNotFound() {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <p>404 · Página não encontrada / Page not found / Página no encontrada</p>
      </body>
    </html>
  );
}
