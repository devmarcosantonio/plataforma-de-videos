import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const AUTH_COOKIE = "token";
const PROTECTED = ["/upload", "/studio", "/following", "/history"];
const PREFIXED_LOCALES = ["en", "es"];

const intl = createIntlMiddleware(routing);

// Separa o prefixo de idioma (/en, /es) do resto do caminho.
function splitLocale(pathname: string): { prefix: string; path: string } {
  const [, first] = pathname.split("/");
  if (PREFIXED_LOCALES.includes(first)) {
    return { prefix: `/${first}`, path: pathname.slice(first.length + 1) || "/" };
  }
  return { prefix: "", path: pathname };
}

export function proxy(request: NextRequest) {
  const { prefix, path } = splitLocale(request.nextUrl.pathname);

  // Páginas que exigem login: sem cookie de sessão, vai para o login (no mesmo idioma).
  // A validação real do token continua na página (requireSession), que cobre token expirado.
  const isProtected = PROTECTED.some((route) => path === route || path.startsWith(`${route}/`));
  if (isProtected && !request.cookies.has(AUTH_COOKIE)) {
    const login = new URL(`${prefix}/login`, request.url);
    login.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  // /@usuario → página /channel/usuario, sem mudar a URL ("@" não pode ser nome de pasta no App Router).
  if (path.startsWith("/@")) {
    const channel = `/channel/${path.slice(2)}`;
    // Com prefixo (/en/@x) o idioma já está definido: reescreve direto para o segmento [locale].
    if (prefix) {
      const url = request.nextUrl.clone();
      url.pathname = `${prefix}${channel}`;
      return NextResponse.rewrite(url);
    }
    // Sem prefixo, o next-intl decide (português, ou redireciona conforme cookie/navegador).
    const url = request.nextUrl.clone();
    url.pathname = channel;
    const response = intl(new NextRequest(url, request));
    // Se ele redirecionar para outro idioma, mantém a URL pública no formato /en/@usuario.
    const location = response.headers.get("location");
    if (location) {
      const target = new URL(location);
      target.pathname = target.pathname.replace(/\/channel\/([^/]+)$/, "/@$1");
      response.headers.set("location", target.toString());
    }
    return response;
  }

  // Resto: o next-intl escolhe o idioma (URL, cookie ou navegador) e aplica o prefixo.
  return intl(request);
}

export const config = {
  matcher: [
    // Tudo, exceto API, arquivos internos do Next e arquivos estáticos (com extensão).
    "/((?!api|_next|_vercel|.*\\..*).*)",
    // Canais podem ter ponto no nome (/@mabp.dev), que a regra acima trataria como arquivo estático:
    // incluídos explicitamente, com e sem prefixo de idioma.
    "/(@[^/]+)",
    "/(en|es)/(@[^/]+)",
    "/channel/(.+)",
    "/(en|es)/channel/(.+)",
  ],
};
