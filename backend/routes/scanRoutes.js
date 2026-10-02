import express from 'express';
import { 
  createScan, 
  getScans, 
  getScanById, 
  deleteScan, 
  downloadScanReport,
  checkSingleImageQuality
} from '../controllers/scanController.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// POST /api/scans/quality-check (Pre-flight quality validation for mobile wizard)
router.post('/quality-check', upload.single('image'), checkSingleImageQuality);

// POST /api/scans (accepts multipart/form-data with flexible multi-view media or application/json)
router.post('/', (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    upload.any()(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error'
        });
      }
      createScan(req, res);
    });
  } else {
    createScan(req, res);
  }
});

// GET /api/scans
router.get('/', getScans);

// GET /api/scans/:id/report (Direct report download attachment)
router.get('/:id/report', downloadScanReport);

// GET /api/scans/:id
router.get('/:id', getScanById);

// DELETE /api/scans/:id
router.delete('/:id', deleteScan);

export default router;

