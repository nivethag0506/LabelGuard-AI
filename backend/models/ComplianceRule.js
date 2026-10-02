import mongoose from 'mongoose';

const complianceRuleSchema = new mongoose.Schema({
  ruleId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  label: {
    type: String,
    required: true,
    trim: true,
  },
  field: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    enum: ['IDENTITY', 'MANUFACTURER', 'PRICING', 'QUANTITY', 'TRACEABILITY', 'EXPIRY', 'ORIGIN', 'CONSUMER_RIGHTS'],
    default: 'IDENTITY',
  },
  required: {
    type: Boolean,
    default: true,
  },
  severity: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    default: 'HIGH',
  },
  weight: {
    type: Number,
    default: 10,
    min: 1,
    max: 100,
  },
  active: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const ComplianceRule = mongoose.model('ComplianceRule', complianceRuleSchema);

export default ComplianceRule;
