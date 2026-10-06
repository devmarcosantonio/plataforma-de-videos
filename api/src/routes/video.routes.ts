import { Router } from 'express';
import { validateIdParam } from '../utils/validate-id.js';
import * as commentController from '../controllers/comment.controller.js';
import * as historyController from '../controllers/history.controller.js';
import * as reactionController from '../controllers/reaction.controller.js';
import * as videoController from '../controllers/video.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { commentsPerDay, commentsPerMinute } from '../middlewares/rate-limit.middleware.js';

const router = Router();
router.param('id', validateIdParam);

// Público: assistir e ler.
router.get('/', videoController.index);
router.get('/:id', videoController.show);
router.get('/:id/playback', videoController.playback);
router.get('/:id/reaction', reactionController.show);
router.get('/:id/comments', commentController.index);

// Exige login.
router.post('/', requireAuth, videoController.store);
router.post('/import', requireAuth, videoController.importFromBunny);
router.post('/:id/upload', requireAuth, videoController.upload);
router.post('/:id/sync', requireAuth, videoController.sync);
router.patch('/:id', requireAuth, videoController.update);
router.delete('/:id', requireAuth, videoController.destroy);

router.put('/:id/reaction', requireAuth, reactionController.update);
router.delete('/:id/reaction', requireAuth, reactionController.destroy);

// Comentários e respostas: limite por usuário (por minuto e por dia).
router.post('/:id/comments', requireAuth, commentsPerMinute, commentsPerDay, commentController.store);

// Progresso para o histórico. POST porque o navigator.sendBeacon (ao fechar a aba) só envia POST.
router.get('/:id/progress', requireAuth, historyController.getProgress);
router.post('/:id/progress', requireAuth, historyController.saveProgress);

export default router;
