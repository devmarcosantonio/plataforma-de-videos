import express, { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller.js';

const router = Router();

// O corpo precisa chegar cru (Buffer) para validar a assinatura HMAC.
router.post('/bunny', express.raw({ type: '*/*', limit: '100kb' }), webhookController.bunny);

export default router;
