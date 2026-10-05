import type { Request, Response } from 'express';
import { isValidWebhookSignature } from '../integrations/bunny/bunny.signing.js';
import type { BunnyWebhookPayload } from '../integrations/bunny/bunny.types.js';
import * as videoService from '../services/video.service.js';

export async function bunny(req: Request, res: Response) {
  const rawBody = req.body;

  if (!Buffer.isBuffer(rawBody) || !isValidWebhookSignature(rawBody, req.headers)) {
    res.status(401).json({ error: 'Assinatura inválida' });
    return;
  }

  let payload: BunnyWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    res.status(400).json({ error: 'Payload inválido' });
    return;
  }

  if (typeof payload.VideoGuid !== 'string') {
    res.status(400).json({ error: 'Payload inválido' });
    return;
  }

  await videoService.handleBunnyWebhook(payload.VideoLibraryId, payload.VideoGuid);
  res.status(200).json({ received: true });
}
