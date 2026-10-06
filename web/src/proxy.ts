import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE = "token";

// Barreira rápida antes de renderizar: sem cookie de sessão, nem tenta abrir a página.
// A validação real do token continua na página (requireSession), que também cobre token expirado.
export function proxy(request: NextRequest) {
  if (request.cookies.has(AUTH_COOKIE)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  // Páginas que exigem login.
  matcher: ["/upload/:path*", "/studio/:path*", "/following/:path*"],
};
