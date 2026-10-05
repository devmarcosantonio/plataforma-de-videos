import { Router } from 'express';
import commentRoutes from './comment.routes.js';
import userRoutes from './user.routes.js';
import videoRoutes from './video.routes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Plataforma de vídeo - api' });
});

router.use('/users', userRoutes);
router.use('/videos', videoRoutes);
router.use('/comments', commentRoutes);

export default router;
