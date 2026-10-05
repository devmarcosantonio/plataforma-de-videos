import { env } from './config/env.js';
import { prisma } from './config/database.js';
import app from './app.js';

try {
  await prisma.$queryRaw`SELECT 1`;
} catch (error) {
  console.error('Não foi possível conectar ao banco. O Postgres está rodando? (npm run db:up)');
  console.error(error);
  process.exit(1);
}

const server = app.listen(env.PORT, () => {
  console.log(`Servidor rodando em http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: string) {
  console.log(`${signal} recebido, encerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
