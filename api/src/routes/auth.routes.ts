import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { loginByAccount, loginByIp, registerByIp } from '../middlewares/rate-limit.middleware.js';

const router = Router();

// Limites de tentativas: cadastro por IP; login por conta tentada e por IP (só erros contam).
router.post('/register', registerByIp, authController.register);
router.post('/login', loginByAccount, loginByIp, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
