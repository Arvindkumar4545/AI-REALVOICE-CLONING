import { Router } from 'express';
import { LocationController } from '../controllers/locationController.js';

const router = Router();

router.get('/threats', LocationController.getThreatCoordinates);

export default router;
