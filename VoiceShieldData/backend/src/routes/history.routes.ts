import { Router } from 'express';
import { HistoryController } from '../controllers/historyController.js';
import { optionalAuth, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, HistoryController.getHistory);
router.delete('/', authenticate, HistoryController.deleteHistory);

export default router;
