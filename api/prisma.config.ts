import { defineConfig } from 'prisma/config';

// Carrega o .env quando existir (mesmo comportamento de src/config/env.ts).
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
