import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

// Denunciar vídeo, comentário ou canal (só quem está logado).
const router = Router();
router.post('/', requireAuth, reportController.store);

export default router;
