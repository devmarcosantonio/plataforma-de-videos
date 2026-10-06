import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  // O navegador chama /api/* e o Next repassa para a API (evita CORS).
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_URL}/:path*` },
      // "@" não pode ser nome de pasta no App Router (é reservado para parallel routes),
      // então /@usuario é servido pela página /channel/usuario sem mudar a URL.
      { source: "/@:username", destination: "/channel/:username" },
    ];
  },
  images: {
    // Miniaturas servidas pela CDN do Bunny Stream.
    remotePatterns: [{ protocol: "https", hostname: "*.b-cdn.net" }],
  },
};

export default nextConfig;
