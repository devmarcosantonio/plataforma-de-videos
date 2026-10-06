import express, { type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from './generated/prisma/client.js';
import { authenticate } from './middlewares/auth.middleware.js';
import { AppError } from './utils/errors/app-error.js';
import routes from './routes/index.js';
import webhookRoutes from './routes/webhook.routes.js';

const PRISMA_ERRORS: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: 'Registro duplicado' },
  P2003: { status: 409, message: 'Operação viola um relacionamento existente' },
  P2025: { status: 404, message: 'Registro não encontrado' },
};

const app = express();

// Antes do express.json(): os webhooks precisam do corpo cru para validar a assinatura.
app.use('/webhooks', webhookRoutes);

app.use(express.json());
// Identifica o usuário pelo token (cookie ou Authorization) em todas as rotas; quem bloqueia é o requireAuth.
app.use(authenticate);
app.use(routes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Dados inválidos',
      details: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  // Violações de restrição do banco que escaparam das validações (ex.: duas requisições simultâneas).
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const known = PRISMA_ERRORS[err.code];
    if (known) {
      res.status(known.status).json({ error: known.message });
      return;
    }
  }
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

export default app;
