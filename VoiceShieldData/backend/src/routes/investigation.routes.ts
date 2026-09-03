import { Router } from 'express';
import { authenticate, requireInvestigator } from '../middleware/auth.js';
import { 
  getCases, 
  getCaseDetails,
  getAuthorizedLocation,
  getAuthorizedEvidence,
  generatePoliceReport,
  escalateToBank,
  escalateToCybercrime,
  verifyEvidenceIntegrity,
  getCampaignIntelligence,
} from '../controllers/investigation.controller.js';

const router = Router();

// All routes require authentication and investigator role
router.use(authenticate, requireInvestigator);

router.get('/', getCases);
router.get('/campaigns', getCampaignIntelligence);
router.get('/:id', getCaseDetails);
router.post('/location', getAuthorizedLocation);
router.post('/evidence', getAuthorizedEvidence);
router.post('/:id/report', generatePoliceReport);
router.post('/:id/escalate/bank', escalateToBank);
router.post('/:id/escalate/le', escalateToCybercrime);
router.post('/:id/verify-evidence', verifyEvidenceIntegrity);

export default router;
