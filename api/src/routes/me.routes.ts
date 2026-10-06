import { Router } from 'express';
import * as historyController from '../controllers/history.controller.js';
import * as notificationController from '../controllers/notification.controller.js';
import * as uploadAccessController from '../controllers/upload-access.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateIdParam } from '../utils/validate-id.js';

// Dados privados do usuário logado: histórico, preferências, permissão de publicar e notificações.
const router = Router();
router.use(requireAuth);
router.param('videoId', validateIdParam);
router.param('id', validateIdParam);

router.get('/history', historyController.list);
router.delete('/history', historyController.clear);
router.delete('/history/:videoId', historyController.remove);
router.get('/continue-watching', historyController.continueWatching);

router.get('/settings', historyController.getSettings);
router.patch('/settings', historyController.updateSettings);

// Permissão para publicar vídeos (pedido analisado pela moderação).
router.get('/upload-access', uploadAccessController.show);
router.post('/upload-requests', uploadAccessController.request);
router.delete('/upload-requests/current', uploadAccessController.cancel);

// Notificações.
router.get('/notifications', notificationController.index);
router.get('/notifications/unread-count', notificationController.unreadCount);
router.post('/notifications/read-all', notificationController.markAllRead);
router.post('/notifications/:id/read', notificationController.markRead);

export default router;
