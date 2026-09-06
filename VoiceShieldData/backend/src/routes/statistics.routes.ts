import { Router } from 'express';
import { StatisticsController } from '../controllers/statisticsController.js';

const router = Router();

router.get('/', StatisticsController.getStatistics);
router.get('/overview', StatisticsController.getStatistics);
router.get('/impact', StatisticsController.getImpactMetrics);

export default router;
