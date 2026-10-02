import express from 'express';
import { getDemoProductsList } from '../services/ocrService.js';

const router = express.Router();

// GET /api/demo/products
router.get('/products', (req, res) => {
  res.json({
    success: true,
    data: getDemoProductsList()
  });
});

export default router;
