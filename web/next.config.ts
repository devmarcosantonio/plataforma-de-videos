import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  // O navegador chama /api/* e o Next repassa para a API (evita CORS).
  // As URLs /@usuario são tratadas no proxy.ts, junto com o idioma.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
  images: {
    // Miniaturas servidas pela CDN do Bunny Stream.
    remotePatterns: [{ protocol: "https", hostname: "*.b-cdn.net" }],
  },
};

// Plugin do next-intl: liga a configuração de src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
