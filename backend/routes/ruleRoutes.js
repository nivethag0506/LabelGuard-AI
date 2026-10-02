import express from 'express';
import { getRules, createRule, updateRule, deleteRule } from '../controllers/ruleController.js';

const router = express.Router();

// GET /api/rules
router.get('/', getRules);

// POST /api/rules
router.post('/', createRule);

// PUT /api/rules/:id
router.put('/:id', updateRule);

// DELETE /api/rules/:id
router.delete('/:id', deleteRule);

export default router;
