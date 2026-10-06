// O layout de verdade (com <html lang>) fica em app/[locale]/layout.tsx, para cada idioma ter
// o seu. Este só existe porque o Next exige um layout na raiz de app/.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
