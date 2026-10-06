import { Router } from 'express';
import { validateIdParam } from '../utils/validate-id.js';
import * as commentController from '../controllers/comment.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();
router.param('id', validateIdParam);

router.get('/:id/replies', commentController.replies);
router.patch('/:id', requireAuth, commentController.update);
router.delete('/:id', requireAuth, commentController.destroy);

export default router;
