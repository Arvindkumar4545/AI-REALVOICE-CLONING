import { Router } from 'express';
import { UserController } from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.put('/profile', UserController.updateProfile);
router.post('/api-key', UserController.generateApiKey);
router.get('/export-data', UserController.exportData);
router.delete('/account', UserController.deleteAccount);

export default router;
