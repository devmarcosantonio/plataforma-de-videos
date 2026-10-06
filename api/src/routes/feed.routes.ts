import { Router } from 'express';
import * as followController from '../controllers/follow.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Vídeos de quem o usuário logado segue.
router.get('/', requireAuth, followController.feed);

export default router;
