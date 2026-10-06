import { Router } from 'express';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import commentRoutes from './comment.routes.js';
import feedRoutes from './feed.routes.js';
import meRoutes from './me.routes.js';
import reportRoutes from './report.routes.js';
import userRoutes from './user.routes.js';
import videoRoutes from './video.routes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Criato - api' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/videos', videoRoutes);
router.use('/comments', commentRoutes);
router.use('/feed', feedRoutes);
router.use('/me', meRoutes);
router.use('/reports', reportRoutes);
router.use('/admin', adminRoutes);

export default router;
