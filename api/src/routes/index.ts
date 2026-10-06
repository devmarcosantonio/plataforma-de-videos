import { Router } from 'express';
import authRoutes from './auth.routes.js';
import commentRoutes from './comment.routes.js';
import feedRoutes from './feed.routes.js';
import userRoutes from './user.routes.js';
import videoRoutes from './video.routes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Plataforma de vídeo - api' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/videos', videoRoutes);
router.use('/comments', commentRoutes);
router.use('/feed', feedRoutes);

export default router;
