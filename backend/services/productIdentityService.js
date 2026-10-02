/**
 * Product Identity Verification & Mismatch Detection Engine
 * Ensures all submitted package views (Front, Back, Top, Bottom, Live, Video) belong to ONE physical product.
 */

// Known brand / commodity signatures for cross-view validation
const KNOWN_BRANDS = [
  'britannia', 'parle', 'oreo', 'mondelez', 'cadbury', 'itc', 'sunfeast',
  'aashirvaad', 'bingo', 'yippee', 'nestle', 'maggi', 'kitkat', 'haldiram',
  'amul', 'tata', 'marico', 'saffola', 'parachute', 'fortune', 'dabur',
  'hindustan unilever', 'hul', 'colgate', 'dettol', 'pepsico', 'lays', 'kurkure',
  'anmol', 'first crop', 'hygienic research', 'wow', 'mcvities', 'priyagold',
  'nourish vitals', 'lotte', 'kwality', 'cremica', 'sunbell', 'mrs bectors'
];

const COMMODITY_TYPES = [
  'biscuit', 'cookies', 'sandwich biscuit', 'rice', 'atta', 'flour', 'maida',
  'tea', 'coffee', 'chips', 'noodles', 'soap', 'shampoo', 'oil', 'salt', 'sugar',
  'namkeen', 'snack', 'chocolate', 'butter', 'ghee', 'paneer', 'milk', 'detergent'
];

const PACKAGING_HALLMARKS = [
  'net wt', 'net weight', 'net qty', 'net quantity', 'mrp', 'rs.', 'rs ', '₹',
  'pkd', 'mfd', 'mfg', 'mfg.', 'mfd.', 'pkd.', 'manufactured by', 'packed by',
  'marketed by', 'batch no', 'lot no', 'batch', 'lot', 'best before', 'use by',
  'exp date', 'expiry', 'consumer care', 'feedback', 'toll free', 'fssai',
  'lic no', 'license', 'ingredients', 'nutrition', 'inclusive of all taxes',
  'country of origin', 'max retail price', 'unit sale price', 'usp', '1800'
];

/**
 * Extracts identity cues (brands, category, barcode, net qty, mrp) from a view's OCR text
 */
export const extractViewIdentityCues = (viewName = '', rawText = '') => {
  const text = (rawText || '').toLowerCase();
  
  // 1. Detect Brand
  let detectedBrand = null;
  for (const b of KNOWN_BRANDS) {
    if (text.includes(b)) {
      detectedBrand = b.charAt(0).toUpperCase() + b.slice(1);
      break;
    }
  }

  // 2. Detect Commodity Category
  let detectedCommodity = null;
  for (const c of COMMODITY_TYPES) {
    if (text.includes(c)) {
      detectedCommodity = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  // 3. Detect Barcode (EAN-13 / UPC starting with 890 for India)
  const barcodeMatch = text.match(/\b(890[0-9]{10})\b/);
  const barcode = barcodeMatch ? barcodeMatch[1] : null;

  // 4. Net quantity
  const qtyMatch = text.match(/([0-9]+\s*(?:kg|g|gm|ml|l))\b/i);
  const qty = qtyMatch ? qtyMatch[1].toLowerCase().replace(/\s+/g, '') : null;

  // 5. Explicit Product Titles
  const titleMatch = text.match(/(?:sandwich\s*biscuit|atta\s*biscuits?|marie\s*gold|good\s*day|basmati\s*rice|refined\s*oil)/i);
  const title = titleMatch ? titleMatch[0].toUpperCase() : null;

  // 6. Count packaging hallmarks
  let packagingHallmarksCount = 0;
  for (const hallmark of PACKAGING_HALLMARKS) {
    if (text.includes(hallmark)) {
      packagingHallmarksCount++;
    }
  }

  return {
    viewName,
    detectedBrand,
    detectedCommodity,
    barcode,
    qty,
    title,
    packagingHallmarksCount,
    textLength: text.length,
    wordCount: text.split(/\s+/).filter(w => w.length > 1).length
  };
};

/**
 * Verifies that all submitted views correspond to the SAME physical product
 * Detects mismatched products across views and verifies media is an actual packaged product
 */
export const verifyProductIdentity = (viewsData = {}) => {
  const viewEntries = Object.entries(viewsData).filter(([_, data]) => data && (data.rawText || data.cleanedText || data.filePath || data.url));

  if (viewEntries.length === 0) {
    return {
      isPackagedProduct: false,
      confirmed: false,
      mismatchDetected: false,
      suspiciousView: null,
      identityConfidence: 0,
      level: 'LOW CONFIDENCE',
      explanation: 'No package views available for product identity verification.',
      reasons: ['No views provided']
    };
  }

  const cuesMap = {};
  const brandsFound = new Map();
  const commoditiesFound = new Map();
  const barcodesFound = new Set();
  let totalHallmarksAcrossViews = 0;
  let totalWordsAcrossViews = 0;

  for (const [viewName, data] of viewEntries) {
    const text = typeof data === 'string' ? data : (data.rawText || data.cleanedText || '');
    const cues = extractViewIdentityCues(viewName, text);
    cuesMap[viewName] = cues;

    totalHallmarksAcrossViews += cues.packagingHallmarksCount;
    totalWordsAcrossViews += cues.wordCount;

    if (cues.detectedBrand) {
      brandsFound.set(cues.detectedBrand, (brandsFound.get(cues.detectedBrand) || 0) + 1);
    }
    if (cues.detectedCommodity) {
      commoditiesFound.set(cues.detectedCommodity, (commoditiesFound.get(cues.detectedCommodity) || 0) + 1);
    }
    if (cues.barcode) {
      barcodesFound.add(cues.barcode);
    }
  }

  // =========================================================================
  // GATE 1: Is this actually a packaged commodity / product?
  // Requires meaningful packaging evidence — not just garbled OCR noise.
  // A non-product image (landscape, selfie, random objects) will produce
  // garbled text with zero packaging hallmarks and no brand/commodity.
  // =========================================================================
  const uniqueBrands = Array.from(brandsFound.keys());
  const uniqueCommodities = Array.from(commoditiesFound.keys());

  const hasBrandOrCommodity = uniqueBrands.length > 0 || uniqueCommodities.length > 0;
  const hasBarcode = barcodesFound.size > 0;
  const hasStrongHallmarks = totalHallmarksAcrossViews >= 2; // Require at least 2 packaging keywords
  
  // An image is a valid packaged product ONLY when it shows:
  //   - A known brand OR commodity type, OR
  //   - At least 2 recognized statutory/packaging hallmarks (MRP, Net Wt, Batch, etc.), OR
  //   - A barcode (EAN-13 starting with 890 for India)
  // Garbled OCR noise with many random words but zero packaging signals = NOT a product.
  const hasAnyPackagingEvidence = hasBrandOrCommodity || hasBarcode || hasStrongHallmarks;

  if (!hasAnyPackagingEvidence) {
    return {
      isPackagedProduct: false,
      confirmed: false,
      mismatchDetected: false,
      suspiciousView: null,
      identityConfidence: 10,
      level: 'LOW CONFIDENCE',
      productSummary: 'Unidentified Media',
      explanation: 'Unable to identify a packaged product from the submitted media.',
      reasons: ['No recognized statutory package declarations, brand trademarks, or commodity packaging hallmarks found in submitted media.'],
      viewAssessments: {}
    };
  }

  // =========================================================================
  // GATE 2: Cross-View Product Mismatch Detection
  // Triggered when multiple DIFFERENT brands or INCOMPATIBLE commodities are
  // found across views — indicating different physical products were mixed.
  // =========================================================================
  let mismatchDetected = false;
  let suspiciousView = null;
  const mismatchReasons = [];

  // Check Brand Conflict across views
  if (uniqueBrands.length > 1) {
    // Known brand partnerships that appear together legitimately
    // ONLY these specific combinations are exempt from mismatch detection
    const brandSet = new Set(uniqueBrands.map(b => b.toLowerCase()));
    const isBrandPartnership = 
      (brandSet.has('oreo') && brandSet.has('mondelez') && brandSet.size === 2) ||
      (brandSet.has('cadbury') && brandSet.has('mondelez') && brandSet.size === 2) ||
      (brandSet.has('kitkat') && brandSet.has('nestle') && brandSet.size === 2);
    // Verify the partnership only covers those 2 brands — any third brand = mismatch
    if (!isBrandPartnership) {
      mismatchDetected = true;
      const brandCounts = Array.from(brandsFound.entries()).sort((a, b) => b[1] - a[1]);
      const dominantBrand = brandCounts[0][0];
      const conflictingBrand = brandCounts[brandCounts.length - 1][0];

      for (const [vName, cues] of Object.entries(cuesMap)) {
        if (cues.detectedBrand === conflictingBrand) {
          suspiciousView = vName.startsWith('VIDEO') ? 'VIDEO' : vName;
          break;
        }
      }
      mismatchReasons.push(`Conflicting brand detected: "${conflictingBrand}" in ${suspiciousView} does not match "${dominantBrand}".`);
    }
  }

  // Check Commodity Conflict across views (e.g. View A = Rice, View B = Shampoo)
  // NOTE: Biscuit + Cookie + Sandwich Biscuit are all compatible (same product type)
  if (!mismatchDetected && uniqueCommodities.length > 1) {
    const COMPATIBLE_GROUPS = [
      ['Biscuit', 'Cookies', 'Sandwich biscuit', 'Cookie'],
      ['Milk', 'Butter', 'Ghee', 'Paneer'],
      ['Tea', 'Coffee'],
    ];
    const isCompatible = COMPATIBLE_GROUPS.some(group =>
      uniqueCommodities.every(c => group.some(g => g.toLowerCase() === c.toLowerCase()))
    );
    if (!isCompatible) {
      const commCounts = Array.from(commoditiesFound.entries()).sort((a, b) => b[1] - a[1]);
      const dominantComm = commCounts[0][0];
      const conflictingComm = commCounts[commCounts.length - 1][0];

      for (const [vName, cues] of Object.entries(cuesMap)) {
        if (cues.detectedCommodity === conflictingComm) {
          suspiciousView = vName.startsWith('VIDEO') ? 'VIDEO' : vName;
          break;
        }
      }
      mismatchDetected = true;
      mismatchReasons.push(`Conflicting commodity type detected: "${conflictingComm}" in ${suspiciousView} does not match "${dominantComm}".`);
    }
  }

  // Calculate Identity Confidence
  let identityConfidence = 85;
  if (mismatchDetected) {
    identityConfidence = 20;
  } else {
    // Boost confidence if views reinforce each other
    if (uniqueBrands.length >= 1) identityConfidence += 5;
    if (uniqueCommodities.length >= 1) identityConfidence += 4;
    if (barcodesFound.size === 1) identityConfidence += 5;
    if (viewEntries.length >= 4) identityConfidence += 4;
    identityConfidence = Math.min(98, identityConfidence);
  }

  const level = identityConfidence >= 85 ? 'HIGH CONFIDENCE' : (identityConfidence >= 65 ? 'MEDIUM CONFIDENCE' : 'LOW CONFIDENCE');
  const confirmed = !mismatchDetected && identityConfidence >= 65;

  const viewAssessments = {};
  for (const [vName, cues] of Object.entries(cuesMap)) {
    const displayName = vName.startsWith('VIDEO') ? 'VIDEO' : vName;
    viewAssessments[vName] = {
      view: displayName,
      brand: cues.detectedBrand || 'Consistent Surface',
      commodity: cues.detectedCommodity || 'Package Declaration',
      matchesConsensus: displayName !== suspiciousView
    };
  }

  return {
    isPackagedProduct: true,
    confirmed,
    mismatchDetected,
    suspiciousView,
    identityConfidence,
    level,
    productSummary: uniqueBrands[0] ? `${uniqueBrands[0]} ${uniqueCommodities[0] || 'Commodity'}` : (uniqueCommodities[0] || 'Packaged Commodity'),
    viewAssessments,
    explanation: mismatchDetected
      ? `PRODUCT MISMATCH DETECTED: The uploaded views do not appear to belong to the same product. ${mismatchReasons.join(' ')}`
      : 'All submitted package views have been verified to belong to the same physical packaged product.',
    reasons: mismatchReasons
  };
};
