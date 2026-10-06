import { Router } from 'express';
import * as historyController from '../controllers/history.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateIdParam } from '../utils/validate-id.js';

// Dados privados do usuário logado: histórico e preferências.
const router = Router();
router.use(requireAuth);
router.param('videoId', validateIdParam);

router.get('/history', historyController.list);
router.delete('/history', historyController.clear);
router.delete('/history/:videoId', historyController.remove);
router.get('/continue-watching', historyController.continueWatching);

router.get('/settings', historyController.getSettings);
router.patch('/settings', historyController.updateSettings);

export default router;
