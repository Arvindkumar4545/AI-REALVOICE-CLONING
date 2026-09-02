import { Router } from 'express';
import { DetectionController } from '../controllers/detectionController.js';
import { optionalAuth, authenticate } from '../middleware/auth.js';
import { audioUpload } from '../middleware/upload.js';
import { detectionLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/', detectionLimiter, optionalAuth, audioUpload.single('audio'), DetectionController.createDetection);
router.post('/analyze', detectionLimiter, optionalAuth, audioUpload.single('audio'), DetectionController.createDetection);
router.get('/:id', DetectionController.getDetectionStatus);
router.post('/validate', detectionLimiter, audioUpload.single('audio'), DetectionController.validateAudio);
router.get('/model/info', DetectionController.getModelInfo);

export default router;
