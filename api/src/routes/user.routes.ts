import { Router } from 'express';
import { validateIdParam } from '../utils/validate-id.js';
import * as userController from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();
router.param('id', validateIdParam);

// Leitura pública (sem e-mail). Cadastro fica em POST /auth/register.
router.get('/', userController.index);
// Rotas fixas antes de "/:id" para não serem confundidas com um id.
router.get('/username-available', userController.usernameAvailable);
router.get('/by-username/:username', userController.showByUsername);
router.get('/:id', userController.show);

// Só a própria pessoa altera ou apaga a conta.
router.patch('/:id', requireAuth, userController.update);
router.delete('/:id', requireAuth, userController.destroy);

export default router;
