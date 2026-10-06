import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../utils/permissions.js';
import { validateIdParam } from '../utils/validate-id.js';

// Painel de moderação: só moderador e admin. Cada ação ainda confere a permissão específica.
const router = Router();
router.use(requireAuth, requirePermission('admin:access'));
router.param('id', validateIdParam);

router.get('/summary', adminController.summary);

router.get('/upload-requests', requirePermission('upload_request:review'), adminController.listRequests);
router.post('/upload-requests/:id/approve', requirePermission('upload_request:review'), adminController.approve);
router.post('/upload-requests/:id/reject', requirePermission('upload_request:review'), adminController.reject);

router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.showUser);
router.post('/users/:id/upload-access/grant', requirePermission('upload_access:manage'), adminController.grantUpload);

// Restrições: prazos longos, permanentes e banimento são conferidos no service (dependem do pedido).
router.post('/users/:id/restrictions', requirePermission('restriction:apply'), adminController.restrict);
router.post('/restrictions/:id/revoke', requirePermission('restriction:apply'), adminController.revokeRestriction);
router.patch('/users/:id/role', requirePermission('user:change_role'), adminController.changeRole);

router.get('/logs', adminController.listLogs);

// Denúncias: a fila é por caso (todas as denúncias do mesmo conteúdo juntas).
router.get('/reports', requirePermission('report:review'), adminController.listReports);
router.post('/reports/:id/resolve', requirePermission('report:review'), adminController.resolveReport);
router.post('/reports/:id/review', requirePermission('report:review'), adminController.reviewReport);

// Conteúdo de outras pessoas: moderação remove (soft, reversível) e restaura; só admin exclui de vez.
router.post('/videos/:id/restore', requirePermission('content:restore'), adminController.restoreVideo);
router.post('/videos/:id/purge', requirePermission('content:purge'), adminController.purgeVideo);
router.post('/comments/:id/remove', requirePermission('content:remove'), adminController.removeComment);
router.post('/comments/:id/restore', requirePermission('content:restore'), adminController.restoreComment);
router.post('/comments/:id/purge', requirePermission('content:purge'), adminController.purgeComment);

export default router;
