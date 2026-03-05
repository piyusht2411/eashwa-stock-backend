import { Router } from 'express';
import {
  submitRequest,
  updateRequestStatus,
  getAllRequests,
  getRequestById,
  getRequestsByMonthForExport,
} from '../controller/request';

const router = Router();

// ────────────────────────────────────────────────
//  Specific (non-parameter) routes FIRST
// ────────────────────────────────────────────────
router.post('/submit-request', submitRequest);
router.get('/export-by-month', getRequestsByMonthForExport);   // ← moved UP
router.get('/', getAllRequests);

// ────────────────────────────────────────────────
//  Parameterized routes AFTER all static routes
// ────────────────────────────────────────────────
router.put('/:id/status', updateRequestStatus);
router.get('/:id', getRequestById);

export default router;