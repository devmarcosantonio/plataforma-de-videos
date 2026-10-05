import { Router } from 'express';
import { validateIdParam } from '../utils/validate-id.js';
import * as userController from '../controllers/user.controller.js';

const router = Router();
router.param('id', validateIdParam);

router.get('/', userController.index);
// Rotas fixas antes de "/:id" para não serem confundidas com um id.
router.get('/username-available', userController.usernameAvailable);
router.get('/by-username/:username', userController.showByUsername);
router.get('/:id', userController.show);
router.post('/', userController.store);
router.patch('/:id', userController.update);
router.delete('/:id', userController.destroy);

export default router;
