import type { Request, Response } from 'express';
import * as uploadAccessService from '../services/upload-access.service.js';

export async function show(req: Request, res: Response) {
  res.json(await uploadAccessService.getUploadAccess(req.user!));
}

export async function request(req: Request, res: Response) {
  res.status(201).json(await uploadAccessService.createRequest(req.user!, req.body ?? {}));
}

export async function cancel(req: Request, res: Response) {
  res.json(await uploadAccessService.cancelRequest(req.user!));
}
