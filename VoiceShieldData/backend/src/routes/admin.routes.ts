import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/overview', AdminController.getOverview);
router.get('/users', AdminController.getUsers);
router.get('/audit-logs', AdminController.getAuditLogs);

export default router;
