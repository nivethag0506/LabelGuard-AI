import mongoose from 'mongoose';
import ComplianceRule from '../models/ComplianceRule.js';
import { isDatabaseConnected } from '../config/db.js';
import { DEFAULT_RULES } from '../services/complianceEngine.js';

let inMemoryRules = [...DEFAULT_RULES];

export const getRules = async (req, res) => {
  try {
    if (isDatabaseConnected()) {
      const rules = await ComplianceRule.find().sort({ weight: -1 }).lean();
      if (rules && rules.length > 0) {
        return res.json({
          success: true,
          count: rules.length,
          data: rules
        });
      }
    }

    return res.json({
      success: true,
      count: inMemoryRules.length,
      data: inMemoryRules
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve rules: ' + error.message
    });
  }
};

export const createRule = async (req, res) => {
  try {
    const { ruleId, label, field, description, category, required, severity, weight } = req.body;

    if (!ruleId || !label || !field) {
      return res.status(400).json({
        success: false,
        message: 'ruleId, label, and field are required.'
      });
    }

    const ruleData = {
      ruleId,
      label,
      field,
      description: description || '',
      category: category || 'IDENTITY',
      required: required !== undefined ? required : true,
      severity: severity || 'HIGH',
      weight: Number(weight) || 10,
      active: true
    };

    if (isDatabaseConnected()) {
      const created = await ComplianceRule.create(ruleData);
      return res.status(201).json({
        success: true,
        message: 'Rule created successfully in MongoDB',
        data: created
      });
    }

    inMemoryRules.push(ruleData);
    return res.status(201).json({
      success: true,
      message: 'Rule created successfully',
      data: ruleData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create rule: ' + error.message
    });
  }
};

export const updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (isDatabaseConnected()) {
      const query = mongoose.Types.ObjectId.isValid(id)
        ? { $or: [{ _id: id }, { ruleId: id }] }
        : { ruleId: id };

      const updated = await ComplianceRule.findOneAndUpdate(
        query,
        updates,
        { new: true }
      );
      if (updated) {
        return res.json({
          success: true,
          message: 'Rule updated successfully',
          data: updated
        });
      }
    }

    const idx = inMemoryRules.findIndex(r => r.ruleId === id || r._id === id);
    if (idx !== -1) {
      inMemoryRules[idx] = { ...inMemoryRules[idx], ...updates };
      return res.json({
        success: true,
        message: 'Rule updated successfully',
        data: inMemoryRules[idx]
      });
    }

    return res.status(404).json({
      success: false,
      message: `Rule ${id} not found.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update rule: ' + error.message
    });
  }
};

export const deleteRule = async (req, res) => {
  try {
    const { id } = req.params;

    if (isDatabaseConnected()) {
      const query = mongoose.Types.ObjectId.isValid(id)
        ? { $or: [{ _id: id }, { ruleId: id }] }
        : { ruleId: id };
      await ComplianceRule.findOneAndDelete(query);
    }

    inMemoryRules = inMemoryRules.filter(r => r.ruleId !== id && r._id !== id);

    return res.json({
      success: true,
      message: `Rule ${id} removed successfully.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete rule: ' + error.message
    });
  }
};
