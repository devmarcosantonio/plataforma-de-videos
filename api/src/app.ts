import express, { type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from './generated/prisma/client.js';
import { isMessageCode, translate, type MessageCode } from './i18n/messages.js';
import { env } from './config/env.js';
import { authenticate } from './middlewares/auth.middleware.js';
import { detectLocale } from './middlewares/locale.middleware.js';
import { AppError } from './utils/errors/app-error.js';
import routes from './routes/index.js';
import webhookRoutes from './routes/webhook.routes.js';

const PRISMA_ERRORS: Record<string, { status: number; code: MessageCode }> = {
  P2002: { status: 409, code: 'DUPLICATE_RECORD' },
  P2003: { status: 409, code: 'RELATION_CONFLICT' },
  P2025: { status: 404, code: 'RECORD_NOT_FOUND' },
};

const app = express();
// IP real de quem acessa vem do proxy confiável (usado nos limites de tentativas).
app.set('trust proxy', env.TRUST_PROXY);

// Antes do express.json(): os webhooks precisam do corpo cru para validar a assinatura.
app.use('/webhooks', webhookRoutes);

app.use(express.json());
// Idioma das mensagens (Accept-Language) e usuário do token (cookie ou Authorization).
// Quem bloqueia rotas é o requireAuth.
app.use(detectLocale);
app.use(authenticate);
app.use(routes);

// Formato padrão de erro: `code` estável para o cliente tratar + `error` traduzido para exibir.
function sendError(req: Request, res: Response, status: number, code: MessageCode, extra: object = {}) {
  res.status(status).json({ code, error: translate(req.locale, code), ...extra });
}

app.use((req: Request, res: Response) => {
  sendError(req, res, 404, 'ROUTE_NOT_FOUND');
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    sendError(req, res, 400, 'VALIDATION_ERROR', {
      details: err.issues.map((issue) => {
        // Os schemas usam códigos como mensagem; mensagens padrão do Zod viram INVALID_VALUE.
        const code = isMessageCode(issue.message) ? issue.message : 'INVALID_VALUE';
        return { field: issue.path.join('.'), code, message: translate(req.locale, code) };
      }),
    });
    return;
  }
  if (err instanceof AppError) {
    sendError(req, res, err.statusCode, err.code);
    return;
  }
  // Violações de restrição do banco que escaparam das validações (ex.: duas requisições simultâneas).
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const known = PRISMA_ERRORS[err.code];
    if (known) {
      sendError(req, res, known.status, known.code);
      return;
    }
  }
  console.error(err);
  sendError(req, res, 500, 'INTERNAL_ERROR');
});

export default app;
