import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  ruleId: { type: String, required: true },
  field: { type: String, required: true },
  title: { type: String, required: true },
  severity: { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
  status: { type: String, enum: ['FAIL', 'WARNING', 'NEEDS_REVIEW', 'NOT_APPLICABLE'], default: 'NEEDS_REVIEW' },
  confidence: { type: Number, default: 0 },
  detectedValue: { type: String, default: 'Not Detected' },
  sourceView: { type: String, default: '' },
  sourceText: { type: String, default: '' },
  evidence: { type: String, default: '' },
  explanation: { type: String, default: '' },
  recommendation: { type: String, default: '' },
  whyItMatters: { type: String, default: '' },
  recommendedAction: { type: String, default: '' }
}, { _id: false });

const scanSchema = new mongoose.Schema({
  inspectionId: { type: String, sparse: true },
  productName: { type: String, default: null },
  brand: { type: String, default: null },
  productCategory: { type: String, default: null },
  categoryConfidence: { type: Number, default: 0 },
  
  manufacturer: { type: String, default: null },
  manufacturerAddress: { type: String, default: null },
  packer: { type: String, default: null },
  importer: { type: String, default: null },
  netQuantity: { type: String, default: null },
  mrp: { type: String, default: null },
  batchNumber: { type: String, default: null },
  manufacturingDate: { type: String, default: null },
  bestBefore: { type: String, default: null },
  expiryDate: { type: String, default: null },
  countryOfOrigin: { type: String, default: null },
  consumerCare: { type: String, default: null },
  
  // Multi-View Images & Evidence (Flexible Multi-View Workflow)
  images: {
    front: { type: String, default: '' },
    back: { type: String, default: '' },
    top: { type: String, default: '' },
    bottom: { type: String, default: '' },
    left: { type: String, default: '' },
    right: { type: String, default: '' },
    additionalViews: [{
      viewType: { type: String, default: 'additional' },
      url: { type: String, default: '' },
      label: { type: String, default: '' }
    }],
    livePhotos: [{ type: String }]
  },
  // Detailed metadata for each actual uploaded view (Requirement 21)
  views: [{
    viewId: { type: String },
    viewType: { type: String },
    file: { type: String },
    url: { type: String },
    source: { type: String },
    timestamp: { type: Date, default: Date.now },
    quality: { type: mongoose.Schema.Types.Mixed, default: {} },
    ocr: { type: String, default: '' },
    confidence: { type: Number, default: 0 }
  }],
  imageQuality: { type: mongoose.Schema.Types.Mixed, default: {} },
  
  // Video Evidence
  video: {
    url: { type: String, default: '' },
    analyzed: { type: Boolean, default: false },
    sampledFrames: [{ type: String }],
    frameCount: { type: Number, default: 0 }
  },

  // One Physical Product Identity Verification
  productIdentity: { type: mongoose.Schema.Types.Mixed, default: {} },
  identityConfidence: { type: Number, default: 95 },

  // Per-View OCR and Combined OCR Text
  ocr: {
    front: { type: String, default: '' },
    back: { type: String, default: '' },
    top: { type: String, default: '' },
    bottom: { type: String, default: '' },
    live: { type: String, default: '' },
    video: { type: String, default: '' }
  },
  combinedText: { type: String, default: '' },

  rawExtractedText: { type: String, default: '' },
  cleanedExtractedText: { type: String, default: '' },
  ocrConfidence: { type: Number, default: 0 },
  isPackageLabelCandidate: { type: Boolean, default: true },
  qualityNotice: { type: String, default: '' },

  productImageUrl: { type: String, default: '' },
  detectedFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  extractedFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  scoreBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
  
  // productDetected = false for invalid/unrelated images (landscapes, selfies, etc.)
  productDetected: { type: Boolean, default: true },
  
  // scoreAvailable = false means compliance scoring was NOT performed (INVALID_PRODUCT, MISMATCH etc.)
  // Do NOT show a numeric score in the UI when scoreAvailable === false.
  scoreAvailable: { type: Boolean, default: true },
  // Numeric compliance score — only meaningful when scoreAvailable === true
  complianceScore: { type: Number, min: 0, max: 100, default: null },

  // Product Detection Confidence: 0-100, SEPARATE from compliance score.
  // Represents confidence that submitted images show an actual packaged commodity.
  // HIGH_CONFIDENCE_PRODUCT (>=60) | LOW_CONFIDENCE_PRODUCT (30-59) | INVALID_PRODUCT (<30)
  productDetectionConfidence: { type: Number, min: 0, max: 100, default: 0 },
  productDetectionLevel: {
    type: String,
    enum: ['HIGH_CONFIDENCE_PRODUCT', 'LOW_CONFIDENCE_PRODUCT', 'INVALID_PRODUCT', 'NOT_ASSESSED'],
    default: 'NOT_ASSESSED'
  },
  productDetectionSignals: [{ type: String }],

  status: {
    type: String,
    enum: ['COMPLIANT', 'NEEDS_REVIEW', 'HIGH_RISK', 'PRODUCT_MISMATCH', 'INSUFFICIENT_EVIDENCE', 'INVALID_PRODUCT'],
    required: true
  },
  
  passedRules: { type: Number, default: 0 },
  warningRules: { type: Number, default: 0 },
  reviewRules: { type: Number, default: 0 },
  failedRules: { type: Number, default: 0 },
  notApplicableRules: { type: Number, default: 0 },
  totalRules: { type: Number, default: 0 },
  
  ruleEvaluations: { type: mongoose.Schema.Types.Mixed, default: [] },
  issues: [issueSchema],
  recommendations: [{ type: String }],
  smartRetakes: [{ view: String, reason: String }],

  inspectionCompleteness: {
    viewsCount: { type: Number, default: 2 },
    totalViewsCount: { type: Number, default: 2 },
    requiredViewsLabel: { type: String, default: '2/2 complete' },
    requiredComplete: { type: Boolean, default: true },
    hasFront: { type: Boolean, default: true },
    hasBack: { type: Boolean, default: true },
    hasTop: { type: Boolean, default: false },
    hasBottom: { type: Boolean, default: false },
    hasLeft: { type: Boolean, default: false },
    hasRight: { type: Boolean, default: false },
    additionalViewsCount: { type: Number, default: 0 },
    hasLive: { type: Boolean, default: false },
    hasVideo: { type: Boolean, default: false },
    imageQuality: { type: String, default: 'Good' },
    productIdentity: { type: String, default: 'Confirmed' },
    ocrCoverage: { type: String, default: 'High' },
    ruleCoverage: { type: String, default: 'Complete' },
    overallCompleteness: { type: String, default: 'COMPLETE' },
    percentage: { type: Number, default: 100 }
  },

  ruleVersion: { type: String, default: 'LMR-2011 (Amended 2022)' },
  sourceMetadata: {
    sourceName: { type: String, default: 'Department of Consumer Affairs, Government of India' },
    sourceURL: { type: String, default: 'https://consumeraffairs.nic.in/acts-and-rules/legal-metrology' },
    versionDate: { type: String, default: '2022-12-01' }
  },
  decisionGate: {
    passed: { type: Boolean, default: true },
    code: { type: String, default: 'READY' },
    reason: { type: String, default: '' }
  }
}, {
  timestamps: true
});

const Scan = mongoose.model('Scan', scanSchema);

export default Scan;

