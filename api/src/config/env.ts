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

  // Segredo que assina os tokens de login. Gere com:
  // node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  JWT_SECRET: z.string({ error: 'JWT_SECRET é obrigatória' }).min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  // Duração da sessão, em dias.
  JWT_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(7),

  // Espera, em minutos, para pedir de novo a permissão de publicar depois de uma recusa.
  UPLOAD_REQUEST_COOLDOWN_MINUTES: z.coerce.number().int().min(0).default(5),
  // Denúncias: quantas cada pessoa pode enviar a cada 24 horas.
  REPORTS_PER_DAY: z.coerce.number().int().min(1).default(20),

  // Proxy confiável para descobrir o IP de quem acessa (X-Forwarded-For). "loopback" = só proxy na
  // mesma máquina; número = quantos proxies na frente; "false" = nenhum (usa o IP da conexão).
  TRUST_PROXY: z
    .string()
    .default('loopback')
    .transform((value) => (/^\d+$/.test(value) ? Number(value) : value === 'true' ? true : value === 'false' ? false : value)),

  // Limites de tentativas (desligar só em testes).
  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  RATE_LIMIT_LOGIN_WINDOW_MINUTES: z.coerce.number().int().min(1).default(15),
  RATE_LIMIT_LOGIN_PER_ACCOUNT: z.coerce.number().int().min(1).default(5),
  RATE_LIMIT_LOGIN_PER_IP: z.coerce.number().int().min(1).default(20),
  RATE_LIMIT_REGISTER_PER_HOUR: z.coerce.number().int().min(1).default(5),
  RATE_LIMIT_COMMENTS_PER_MINUTE: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_COMMENTS_PER_DAY: z.coerce.number().int().min(1).default(200),
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
