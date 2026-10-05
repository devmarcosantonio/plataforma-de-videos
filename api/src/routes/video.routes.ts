import { Router } from 'express';
import { validateIdParam } from '../utils/validate-id.js';
import * as commentController from '../controllers/comment.controller.js';
import * as reactionController from '../controllers/reaction.controller.js';
import * as videoController from '../controllers/video.controller.js';

const router = Router();
router.param('id', validateIdParam);

router.get('/', videoController.index);
router.get('/:id', videoController.show);
router.post('/', videoController.store);
router.post('/import', videoController.importFromBunny);
router.post('/:id/upload', videoController.upload);
router.get('/:id/playback', videoController.playback);
router.post('/:id/sync', videoController.sync);
router.delete('/:id', videoController.destroy);

router.get('/:id/reaction', reactionController.show);
router.put('/:id/reaction', reactionController.update);
router.delete('/:id/reaction', reactionController.destroy);

router.get('/:id/comments', commentController.index);
router.post('/:id/comments', commentController.store);

export default router;
