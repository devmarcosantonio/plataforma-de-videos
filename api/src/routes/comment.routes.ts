import { Router } from 'express';
import { validateIdParam } from '../utils/validate-id.js';
import * as commentController from '../controllers/comment.controller.js';

const router = Router();
router.param('id', validateIdParam);

router.get('/:id/replies', commentController.replies);
router.patch('/:id', commentController.update);
router.delete('/:id', commentController.destroy);

export default router;
