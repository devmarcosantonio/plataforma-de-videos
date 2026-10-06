import type { Request, Response } from 'express';
import * as contentService from '../services/content-moderation.service.js';
import * as moderationService from '../services/moderation.service.js';
import * as reportService from '../services/report.service.js';

type IdParams = { id: string };

export async function summary(req: Request, res: Response) {
  res.json(await moderationService.summary());
}

export async function listRequests(req: Request, res: Response) {
  res.json(await moderationService.listRequests(req.query));
}

export async function approve(req: Request<IdParams>, res: Response) {
  res.json(await moderationService.approveRequest(req.user!, req.params.id, req.body ?? {}));
}

export async function reject(req: Request<IdParams>, res: Response) {
  res.json(await moderationService.rejectRequest(req.user!, req.params.id, req.body ?? {}));
}

export async function listUsers(req: Request, res: Response) {
  res.json(await moderationService.listUsers(req.query));
}

export async function grantUpload(req: Request<IdParams>, res: Response) {
  res.json(await moderationService.grantUploadAccess(req.user!, req.params.id, req.body ?? {}));
}

export async function showUser(req: Request<IdParams>, res: Response) {
  res.json(await moderationService.getUserDetails(req.params.id));
}

export async function restrict(req: Request<IdParams>, res: Response) {
  res.status(201).json(await moderationService.applyRestriction(req.user!, req.params.id, req.body ?? {}));
}

export async function revokeRestriction(req: Request<IdParams>, res: Response) {
  res.json(await moderationService.revokeRestriction(req.user!, req.params.id, req.body ?? {}));
}

export async function changeRole(req: Request<IdParams>, res: Response) {
  res.json(await moderationService.changeRole(req.user!, req.params.id, req.body ?? {}));
}

export async function listLogs(req: Request, res: Response) {
  res.json(await moderationService.listLogs(req.user!, req.query));
}

export async function listReports(req: Request, res: Response) {
  res.json(await reportService.listCases(req.query));
}

export async function resolveReport(req: Request<IdParams>, res: Response) {
  res.json(await reportService.resolveCase(req.user!, req.params.id, req.body ?? {}));
}

export async function reviewReport(req: Request<IdParams>, res: Response) {
  res.json(await reportService.reviewCase(req.user!, req.params.id, req.body ?? {}));
}

export async function restoreVideo(req: Request<IdParams>, res: Response) {
  res.json(await contentService.restoreVideo(req.user!, req.params.id));
}

export async function purgeVideo(req: Request<IdParams>, res: Response) {
  await contentService.purgeVideo(req.user!, req.params.id, req.body ?? {});
  res.status(204).send();
}

export async function removeComment(req: Request<IdParams>, res: Response) {
  res.json(await contentService.moderateComment(req.user!, req.params.id, req.body ?? {}));
}

export async function restoreComment(req: Request<IdParams>, res: Response) {
  res.json(await contentService.restoreComment(req.user!, req.params.id));
}

export async function purgeComment(req: Request<IdParams>, res: Response) {
  await contentService.purgeComment(req.user!, req.params.id, req.body ?? {});
  res.status(204).send();
}
