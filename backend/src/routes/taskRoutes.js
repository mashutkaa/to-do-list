import { Router } from 'express';

import {
  create,
  list,
  remove,
  update,
  updateStatus,
} from '../controllers/taskController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', list);
router.post('/', create);
router.patch('/:id/status', updateStatus);
router.patch('/:id', update);
router.delete('/:id', remove);

export default router;
