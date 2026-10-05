import { z } from 'zod';

// Carrega o .env quando existir; em produção as variáveis vêm do ambiente.
try {
  process.loadEnvFile();
} catch {}

const required = (name: string) => z.string({ error: `${name} é obrigatória` }).min(1, `${name} é obrigatória`);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: 'DATABASE_URL deve ser uma URL postgresql://' }),

  BUNNY_API_KEY: required('BUNNY_API_KEY'),
  BUNNY_READ_ONLY_API_KEY: required('BUNNY_READ_ONLY_API_KEY'),
  BUNNY_LIBRARY_ID: required('BUNNY_LIBRARY_ID'),
  BUNNY_CDN_HOSTNAME: required('BUNNY_CDN_HOSTNAME'),
  // Opcional: só é necessária se a autenticação por token do player estiver ativa no painel.
  BUNNY_TOKEN_AUTH_KEY: z.string().optional().transform((value) => value || undefined),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
