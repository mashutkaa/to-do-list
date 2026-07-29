import { Router } from 'express';

import {
  createBulkTaskShare,
  createTaskShare,
  getSharedTasks,
} from '../controllers/shareController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/shared-with-me', getSharedTasks);
router.post('/share', createBulkTaskShare);
router.post('/:id/share', createTaskShare);

export default router;
