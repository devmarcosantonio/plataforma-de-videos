import type { Request, Response } from 'express';
import * as reportService from '../services/report.service.js';

export async function store(req: Request, res: Response) {
  res.status(201).json(await reportService.createReport(req.user!, req.body ?? {}));
}
