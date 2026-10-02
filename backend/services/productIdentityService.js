/**
 * Product Identity Verification & Mismatch Detection Engine
 * Ensures all submitted package views (Front, Back, Top, Bottom, Live, Video) belong to ONE physical product.
 *
 * IMPORTANT: This module does NOT perform visual product detection.
 * It evaluates packaging evidence extracted from OCR text.
 * Tesseract.js extracts text; this module scores that text for packaging signals.
 *
 * productDetectionConfidence is SEPARATE from Legal Metrology compliance score.
 * Never mix the two.
 */

// Known brand / commodity signatures for cross-view validation
const KNOWN_BRANDS = [
  'britannia', 'parle', 'oreo', 'mondelez', 'cadbury', 'itc', 'sunfeast',
  'aashirvaad', 'bingo', 'yippee', 'nestle', 'maggi', 'kitkat', 'haldiram',
  'amul', 'tata', 'marico', 'saffola', 'parachute', 'fortune', 'dabur',
  'hindustan unilever', 'hul', 'colgate', 'dettol', 'pepsico', 'lays', 'kurkure',
  'anmol', 'first crop', 'hygienic research', 'wow', 'mcvities', 'priyagold',
  'nourish vitals', 'lotte', 'kwality', 'cremica', 'sunbell', 'mrs bectors',
  'mtr', 'everest', 'catch', 'mdh', 'lijjat', 'bikaji', 'balaji', 'act ii',
  'pringle', 'lotte', 'topps', 'orion', 'kellogs', 'kelloggs', 'quaker',
  'heinz', 'kissan', 'maggi', 'knorr', 'lipton', 'brooke bond', 'red label',
  'patanjali', 'himalaya', 'vicco', 'khadi', 'vicks', 'panadol', 'cipla',
  'dr morepen', 'johnson', 'dove', 'pears', 'lux', 'lifebuoy', 'nirma',
  'ariel', 'surf excel', 'vim', 'scotch brite', 'exo', 'henko'
];

const COMMODITY_TYPES = [
  'biscuit', 'cookies', 'sandwich biscuit', 'rice', 'atta', 'flour', 'maida',
  'tea', 'coffee', 'chips', 'noodles', 'soap', 'shampoo', 'oil', 'salt', 'sugar',
  'namkeen', 'snack', 'chocolate', 'butter', 'ghee', 'paneer', 'milk', 'detergent',
  'wafer', 'rusk', 'bread', 'jam', 'pickle', 'chutney', 'sauce', 'ketchup',
  'juice', 'drink', 'beverage', 'water', 'soda', 'powder', 'mix', 'paste',
  'cream', 'lotion', 'gel', 'serum', 'toner', 'facewash', 'toothpaste',
  'toothbrush', 'deodorant', 'perfume', 'talc', 'hair oil', 'conditioner',
  'cereal', 'oats', 'cornflakes', 'muesli', 'protein', 'supplement', 'capsule',
  'tablet', 'syrup', 'drop', 'spray', 'masala', 'spice', 'seasoning', 'turmeric',
  'chilli', 'coriander', 'cumin', 'garam masala', 'dal', 'lentil', 'pulse',
  'soya', 'tofu', 'cheese', 'curd', 'yoghurt', 'ice cream', 'candy', 'toffee',
  'gum', 'chewing gum', 'lozenge', 'cracker', 'khakhra', 'mathri', 'sev'
];

/**
 * HIGH-SIGNAL packaging hallmarks — statutory declarations that appear specifically on packaged goods.
 * These must appear on REAL product labels under Legal Metrology rules.
 * They are UNLIKELY to appear in random photographs of landscapes/people/buildings.
 */
const STRONG_HALLMARKS = [
  // Mandatory statutory declarations
  'net wt', 'net weight', 'net qty', 'net quantity', 'net content',
  'max retail price', 'maximum retail price', 'inclusive of all taxes', 'incl. of all taxes',
  'manufactured by', 'packed by', 'marketed by', 'imported by',
  'mfg. by', 'mfd. by', 'pkd. by', 'mkt. by',
  'consumer care', 'grievance', 'toll free', 'helpline',
  'best before', 'use before', 'use by', 'expiry date', 'exp. date',
  'date of mfg', 'date of manufacture', 'mfg date', 'mfd date', 'manufacturing date',
  'country of origin', 'product of india', 'made in india', 'origin: india',
  'fssai lic', 'fssai license', 'license no', 'lic. no',
  'batch no', 'batch number', 'lot no', 'lot number',
  'legal metrology', 'packaged commodities'
];

/**
 * MEDIUM-SIGNAL hallmarks — packaging-associated but could appear in other contexts.
 */
const MEDIUM_HALLMARKS = [
  'mrp', 'rs.', 'rs ', '₹',
  'pkd', 'mfd', 'mfg', 'mfg.', 'mfd.', 'pkd.',
  'batch', 'lot', 'exp', 'expiry', 'ingredients',
  'nutrition', 'nutritional', 'energy', 'protein', 'fat', 'carbohydrate',
  '1800', 'www.', '@', '.com', '.in',  // consumer contact patterns
  'unit sale price', 'usp', 'selling price'
];

/**
 * Garbage detection patterns — strings that indicate pure OCR noise
 * from images with no meaningful text (landscapes, random photos).
 */
const GARBAGE_PATTERNS = [
  /^[\W\d\s]+$/, // all non-word chars and digits
];

/**
 * Check if a text string is OCR garbage/noise (not meaningful packaging text).
 * Returns true if the text is garbage.
 */
const isGarbageText = (text = '') => {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;

  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return true;

  // Count words that are meaningful (≥3 chars, mostly alphabetic)
  const meaningfulWords = words.filter(w => {
    const alphaCount = (w.match(/[a-zA-Z]/g) || []).length;
    return w.length >= 3 && alphaCount >= 2;
  });

  // If fewer than 30% of words are meaningful, likely garbage
  const meaningfulRatio = meaningfulWords.length / (words.length || 1);
  if (words.length >= 5 && meaningfulRatio < 0.20) {
    return true;
  }

  // If total text is very short with no packaging signals at all
  if (trimmed.length < 10 && words.length < 3) {
    return true;
  }

  return false;
};

/**
 * Extracts identity cues (brands, category, barcode, net qty, mrp) from a view's OCR text.
 * Returns a structured set of signals found in the text.
 */
export const extractViewIdentityCues = (viewName = '', rawText = '') => {
  const text = (rawText || '').toLowerCase();

  if (isGarbageText(text)) {
    return {
      viewName,
      isGarbage: true,
      detectedBrand: null,
      detectedCommodity: null,
      barcode: null,
      qty: null,
      title: null,
      strongHallmarksCount: 0,
      mediumHallmarksCount: 0,
      totalHallmarksScore: 0,
      textLength: text.length,
      wordCount: 0
    };
  }

  // 1. Detect Brand (use word boundaries to avoid false positives)
  let detectedBrand = null;
  for (const b of KNOWN_BRANDS) {
    const brandRegex = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (brandRegex.test(text)) {
      detectedBrand = b.charAt(0).toUpperCase() + b.slice(1);
      break;
    }
  }

  // 2. Detect Commodity Category (sort by length descending to prioritize multi-word names like "butter cookies" over "butter")
  let detectedCommodity = null;
  const sortedCommodities = [...COMMODITY_TYPES].sort((a, b) => b.length - a.length);
  for (const c of sortedCommodities) {
    const commRegex = new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`, 'i');
    if (commRegex.test(text)) {
      if (/cookie|biscuit|rusk|cracker|wafer/i.test(c)) {
        detectedCommodity = 'Biscuit';
      } else {
        detectedCommodity = c.charAt(0).toUpperCase() + c.slice(1);
      }
      break;
    }
  }

  // 3. Detect Barcode (EAN-13 / UPC starting with 890 for India, or any 12-13 digit sequence)
  const barcodeMatch = text.match(/\b(890[0-9]{10}|[0-9]{12,13})\b/);
  const barcode = barcodeMatch ? barcodeMatch[1] : null;

  // 4. Net quantity (specific pattern: number + unit)
  const qtyMatch = text.match(/([0-9]+\.?[0-9]*\s*(?:kg|k\.g\.|g|gm|gms|ml|m\.l\.|l|ltr|litre|litres|n|units|pieces|pcs|pc))\b/i);
  const qty = qtyMatch ? qtyMatch[1].toLowerCase().replace(/\s+/g, '') : null;

  // 5. Detect MRP pattern (Rs/₹ followed by a number)
  const mrpMatch = text.match(/(?:rs\.?|₹|mrp)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
  const hasMrp = Boolean(mrpMatch);

  // 6. Count STRONG hallmarks (high-signal statutory declarations)
  let strongHallmarksCount = 0;
  for (const hallmark of STRONG_HALLMARKS) {
    if (text.includes(hallmark)) {
      strongHallmarksCount++;
    }
  }

  // 7. Count MEDIUM hallmarks
  let mediumHallmarksCount = 0;
  for (const hallmark of MEDIUM_HALLMARKS) {
    if (text.includes(hallmark)) {
      mediumHallmarksCount++;
    }
  }

  // Composite hallmarks score: strong = 2pts each, medium = 1pt each
  const totalHallmarksScore = (strongHallmarksCount * 2) + mediumHallmarksCount;

  // 8. Explicit Product Titles
  const titleMatch = text.match(/(?:sandwich\s*biscuit|atta\s*biscuits?|marie\s*gold|good\s*day|basmati\s*rice|refined\s*oil)/i);
  const title = titleMatch ? titleMatch[0].toUpperCase() : null;

  const wordCount = text.split(/\s+/).filter(w => w.length > 1).length;

  return {
    viewName,
    isGarbage: false,
    detectedBrand,
    detectedCommodity,
    barcode,
    qty,
    hasMrp,
    title,
    strongHallmarksCount,
    mediumHallmarksCount,
    totalHallmarksScore,
    textLength: text.length,
    wordCount
  };
};

/**
 * Calculates a product detection confidence score (0-100) based on evidence.
 * This is SEPARATE from the Legal Metrology compliance score.
 *
 * Scoring model:
 *   Known brand detected:              +30 points
 *   Known commodity type detected:     +20 points
 *   Indian barcode (EAN-13/890):       +25 points
 *   Any barcode (12-13 digits):        +15 points
 *   ≥1 STRONG statutory hallmark:      +15 points
 *   ≥3 STRONG statutory hallmarks:     +10 points (bonus)
 *   ≥6 STRONG statutory hallmarks:     +5  points (bonus)
 *   MRP pattern detected:              +10 points
 *   Net quantity with unit detected:   +10 points
 *   Multiple views with consistency:   +5  points
 *   ─────────────────────────────────────────────
 *   Maximum before capping:            ~130 (capped at 98)
 *
 * Thresholds:
 *   ≥ 60 → HIGH_CONFIDENCE_PRODUCT
 *   ≥ 30 → LOW_CONFIDENCE_PRODUCT
 *   <  30 → INVALID_PRODUCT
 */
const calculateProductDetectionConfidence = (cuesMap, avgOcrConfidence = 50) => {
  let score = 0;
  const signals = [];

  const allBrands = new Map();
  const allCommodities = new Map();
  const allBarcodes = new Set();
  let totalStrongHallmarks = 0;
  let hasMrpInAnyView = false;
  let hasQtyInAnyView = false;
  let nonGarbageViews = 0;

  for (const [viewName, cues] of Object.entries(cuesMap)) {
    if (cues.isGarbage) continue;
    nonGarbageViews++;

    if (cues.detectedBrand) {
      allBrands.set(cues.detectedBrand, (allBrands.get(cues.detectedBrand) || 0) + 1);
    }
    if (cues.detectedCommodity) {
      allCommodities.set(cues.detectedCommodity, (allCommodities.get(cues.detectedCommodity) || 0) + 1);
    }
    if (cues.barcode) allBarcodes.add(cues.barcode);
    totalStrongHallmarks += cues.strongHallmarksCount || 0;
    if (cues.hasMrp) hasMrpInAnyView = true;
    if (cues.qty) hasQtyInAnyView = true;
  }

  // If ALL views produced garbage OCR, it's not a product
  if (nonGarbageViews === 0) {
    return {
      score: 0,
      level: 'INVALID_PRODUCT',
      signals: ['All submitted views produced unreadable or empty OCR text.'],
      isPackagedProduct: false
    };
  }

  const uniqueBrands = Array.from(allBrands.keys());
  const uniqueCommodities = Array.from(allCommodities.keys());

  // Score: Known brand
  if (uniqueBrands.length > 0) {
    score += 30;
    signals.push(`Known brand detected: "${uniqueBrands[0]}"`);
  }

  // Score: Known commodity
  if (uniqueCommodities.length > 0) {
    score += 20;
    signals.push(`Known commodity type detected: "${uniqueCommodities[0]}"`);
  }

  // Score: Barcode
  if (allBarcodes.size > 0) {
    const barcodeVal = Array.from(allBarcodes)[0];
    const isIndianBarcode = barcodeVal.startsWith('890');
    score += isIndianBarcode ? 25 : 15;
    signals.push(`Barcode detected: ${barcodeVal}${isIndianBarcode ? ' (Indian EAN-13)' : ''}`);
  }

  // Score: Strong statutory hallmarks (the most reliable packaging signal)
  if (totalStrongHallmarks >= 1) {
    score += 15;
    signals.push(`${totalStrongHallmarks} strong statutory declaration hallmark(s) detected`);
  }
  if (totalStrongHallmarks >= 3) {
    score += 10;
    signals.push('Multiple mandatory statutory declarations detected');
  }
  if (totalStrongHallmarks >= 6) {
    score += 5;
    signals.push('Comprehensive statutory declaration coverage detected');
  }

  // Score: MRP pattern
  if (hasMrpInAnyView) {
    score += 10;
    signals.push('MRP declaration pattern detected');
  }

  // Score: Net quantity with unit
  if (hasQtyInAnyView) {
    score += 10;
    signals.push('Net quantity declaration with unit detected');
  }

  // Slight bonus for multiple non-garbage views (more evidence)
  if (nonGarbageViews >= 2) {
    score += 5;
    signals.push(`${nonGarbageViews} views with readable packaging text`);
  }

  // Cap at 98 (never claim 100% certainty without visual AI)
  score = Math.min(98, score);

  // Determine level
  let level;
  let isPackagedProduct;
  if (score >= 60) {
    level = 'HIGH_CONFIDENCE_PRODUCT';
    isPackagedProduct = true;
  } else if (score >= 30) {
    level = 'LOW_CONFIDENCE_PRODUCT';
    isPackagedProduct = true; // proceed but flag as low confidence
  } else {
    level = 'INVALID_PRODUCT';
    isPackagedProduct = false;
  }

  return { score, level, signals, isPackagedProduct, uniqueBrands, uniqueCommodities, allBarcodes };
};

/**
 * Verifies that all submitted views correspond to the SAME physical product.
 * Detects mismatched products across views and verifies media is an actual packaged product.
 *
 * Returns a result including:
 *   - isPackagedProduct: boolean
 *   - productDetectionConfidence: 0-100 (separate from compliance score)
 *   - productDetectionLevel: HIGH_CONFIDENCE_PRODUCT | LOW_CONFIDENCE_PRODUCT | INVALID_PRODUCT
 *   - confirmed: boolean (all views = same product)
 *   - mismatchDetected: boolean
 *   - suspiciousView: string | null
 *   - identityConfidence: 0-100 (same-product confidence)
 */
export const verifyProductIdentity = (viewsData = {}, avgOcrConfidence = 50) => {
  const viewEntries = Object.entries(viewsData).filter(
    ([_, data]) => data && (data.rawText || data.cleanedText || data.filePath || data.url)
  );

  if (viewEntries.length === 0) {
    return {
      isPackagedProduct: false,
      productDetectionConfidence: 0,
      productDetectionLevel: 'INVALID_PRODUCT',
      productDetectionSignals: ['No package views provided.'],
      confirmed: false,
      mismatchDetected: false,
      suspiciousView: null,
      identityConfidence: 0,
      level: 'LOW CONFIDENCE',
      explanation: 'No package views available for product identity verification.',
      reasons: ['No views provided']
    };
  }

  // Build cues map for all views
  const cuesMap = {};
  for (const [viewName, data] of viewEntries) {
    const text = typeof data === 'string' ? data : (data.rawText || data.cleanedText || '');
    cuesMap[viewName] = extractViewIdentityCues(viewName, text);
  }

  // Step 1: Calculate product detection confidence (separate from compliance score)
  const detectionResult = calculateProductDetectionConfidence(cuesMap, avgOcrConfidence);

  // Step 2: If not a packaged product, stop here
  if (!detectionResult.isPackagedProduct) {
    return {
      isPackagedProduct: false,
      productDetectionConfidence: detectionResult.score,
      productDetectionLevel: detectionResult.level,
      productDetectionSignals: detectionResult.signals,
      confirmed: false,
      mismatchDetected: false,
      suspiciousView: null,
      identityConfidence: detectionResult.score,
      level: 'LOW CONFIDENCE',
      productSummary: 'Unidentified Media',
      explanation: 'Unable to identify a packaged product from the submitted media. The submitted images do not contain sufficient packaging evidence (brand, commodity type, statutory declarations, or barcode).',
      reasons: [
        'No recognized brand trademark, commodity type, statutory packaging declarations, or barcode found.',
        `Product detection score: ${detectionResult.score}/100 (minimum required: 30).`,
        'Signals detected: ' + (detectionResult.signals.length > 0 ? detectionResult.signals.join('; ') : 'None')
      ],
      viewAssessments: {}
    };
  }

  const uniqueBrands = detectionResult.uniqueBrands || [];
  const uniqueCommodities = detectionResult.uniqueCommodities || [];

  // Step 3: Cross-View Product Mismatch Detection
  // Only check mismatch when we have multiple views with meaningful evidence
  let mismatchDetected = false;
  let suspiciousView = null;
  const mismatchReasons = [];

  // Build brand/commodity maps per view (only non-garbage views)
  const brandsFound = new Map();
  const commoditiesFound = new Map();
  for (const [viewName, cues] of Object.entries(cuesMap)) {
    if (cues.isGarbage) continue;
    if (cues.detectedBrand) {
      brandsFound.set(cues.detectedBrand, (brandsFound.get(cues.detectedBrand) || 0) + 1);
    }
    if (cues.detectedCommodity) {
      commoditiesFound.set(cues.detectedCommodity, (commoditiesFound.get(cues.detectedCommodity) || 0) + 1);
    }
  }

  // Check Brand Conflict across views
  if (uniqueBrands.length > 1) {
    const brandSet = new Set(uniqueBrands.map(b => b.toLowerCase()));
    const isBrandPartnership =
      (brandSet.has('oreo') && brandSet.has('mondelez') && brandSet.size === 2) ||
      (brandSet.has('cadbury') && brandSet.has('mondelez') && brandSet.size === 2) ||
      (brandSet.has('kitkat') && brandSet.has('nestle') && brandSet.size === 2);

    if (!isBrandPartnership) {
      mismatchDetected = true;
      const brandCounts = Array.from(brandsFound.entries()).sort((a, b) => b[1] - a[1]);
      const dominantBrand = brandCounts[0][0];
      const conflictingBrand = brandCounts[brandCounts.length - 1][0];

      for (const [vName, cues] of Object.entries(cuesMap)) {
        if (!cues.isGarbage && cues.detectedBrand === conflictingBrand) {
          suspiciousView = vName.startsWith('VIDEO') ? 'VIDEO' : vName;
          break;
        }
      }
      mismatchReasons.push(
        `Conflicting brand detected: "${conflictingBrand}" in ${suspiciousView} does not match "${dominantBrand}".`
      );
    }
  }

  // Check Commodity Conflict across views
  if (!mismatchDetected && uniqueCommodities.length > 1) {
    const COMPATIBLE_GROUPS = [
      ['Biscuit', 'Cookies', 'Sandwich biscuit', 'Cookie', 'Cracker', 'Wafer', 'Rusk'],
      ['Milk', 'Butter', 'Ghee', 'Paneer', 'Curd', 'Yoghurt', 'Cheese', 'Ice cream'],
      ['Tea', 'Coffee'],
      ['Oil', 'Ghee'],
      ['Salt', 'Sugar'],
      ['Masala', 'Spice', 'Seasoning', 'Turmeric', 'Chilli', 'Coriander', 'Cumin', 'Garam masala'],
      ['Dal', 'Lentil', 'Pulse', 'Soya'],
    ];
    const isCompatible = COMPATIBLE_GROUPS.some(group =>
      uniqueCommodities.every(c => group.some(g => g.toLowerCase() === c.toLowerCase()))
    );
    if (!isCompatible) {
      const commCounts = Array.from(commoditiesFound.entries()).sort((a, b) => b[1] - a[1]);
      const dominantComm = commCounts[0][0];
      const conflictingComm = commCounts[commCounts.length - 1][0];

      for (const [vName, cues] of Object.entries(cuesMap)) {
        if (!cues.isGarbage && cues.detectedCommodity === conflictingComm) {
          suspiciousView = vName.startsWith('VIDEO') ? 'VIDEO' : vName;
          break;
        }
      }
      mismatchDetected = true;
      mismatchReasons.push(
        `Conflicting commodity type detected: "${conflictingComm}" in ${suspiciousView} does not match "${dominantComm}".`
      );
    }
  }

  // Step 4: Calculate same-product identity confidence (separate from detection confidence)
  let identityConfidence = 75; // Base — product detected but views not yet cross-verified
  if (mismatchDetected) {
    identityConfidence = 20;
  } else {
    if (uniqueBrands.length >= 1) identityConfidence += 8;
    if (uniqueCommodities.length >= 1) identityConfidence += 6;
    if (detectionResult.allBarcodes?.size === 1) identityConfidence += 7;
    if (viewEntries.length >= 2) identityConfidence += 4;
    identityConfidence = Math.min(98, identityConfidence);
  }

  const level = identityConfidence >= 80 ? 'HIGH CONFIDENCE'
    : (identityConfidence >= 60 ? 'MEDIUM CONFIDENCE' : 'LOW CONFIDENCE');
  const confirmed = !mismatchDetected && identityConfidence >= 60;

  const viewAssessments = {};
  for (const [vName, cues] of Object.entries(cuesMap)) {
    const displayName = vName.startsWith('VIDEO') ? 'VIDEO' : vName;
    viewAssessments[vName] = {
      view: displayName,
      isGarbage: cues.isGarbage || false,
      brand: cues.detectedBrand || (cues.isGarbage ? 'Unreadable' : 'No known brand detected'),
      commodity: cues.detectedCommodity || (cues.isGarbage ? 'Unreadable' : 'Package declaration'),
      matchesConsensus: displayName !== suspiciousView
    };
  }

  return {
    isPackagedProduct: true,
    productDetectionConfidence: detectionResult.score,
    productDetectionLevel: detectionResult.level,
    productDetectionSignals: detectionResult.signals,
    confirmed,
    mismatchDetected,
    suspiciousView,
    identityConfidence,
    level,
    productSummary: uniqueBrands[0]
      ? `${uniqueBrands[0]} ${uniqueCommodities[0] || 'Commodity'}`
      : (uniqueCommodities[0] || 'Packaged Commodity'),
    viewAssessments,
    explanation: mismatchDetected
      ? `PRODUCT MISMATCH DETECTED: The uploaded views do not appear to belong to the same product. ${mismatchReasons.join(' ')}`
      : 'All submitted package views have been verified to belong to the same physical packaged product.',
    reasons: mismatchReasons
  };
};
