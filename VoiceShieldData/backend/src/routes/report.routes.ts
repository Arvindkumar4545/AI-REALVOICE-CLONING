import { Router } from 'express';
import { ReportController } from '../controllers/reportController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', optionalAuth, ReportController.createReport);
router.get('/', ReportController.getReports);

export default router;
