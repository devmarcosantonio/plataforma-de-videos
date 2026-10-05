import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from './errors/app-error.js';

const uuid = z.uuid();

// Usado com router.param('id', ...): um id que não é UUID não existe no banco, então é 404
// (sem isso o Postgres rejeita o valor e a API responderia 500).
export function validateIdParam(req: Request, res: Response, next: NextFunction, value: string) {
  if (!uuid.safeParse(value).success) {
    next(new AppError('Recurso não encontrado', 404));
    return;
  }
  next();
}
