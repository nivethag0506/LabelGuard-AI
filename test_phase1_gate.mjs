/**
 * Phase 1 Product Validation Gate — Verification Test Suite
 * Tests all 6 required cases:
 *  1. Landscape image -> INVALID_PRODUCT, Score = N/A
 *  2. Random unrelated image -> INVALID_PRODUCT, Score = N/A
 *  3. Real packaged biscuit front + back -> Valid detection, compliance analyzed
 *  4. Real packaged rice front + back -> Valid detection, compliance analyzed
 *  5. Biscuit front + different product back -> PRODUCT_MISMATCH
 *  6. Real product but very blurry -> NEEDS_REVIEW / Low confidence, no invented fields
 */
import sharp from './backend/node_modules/sharp/dist/index.mjs';

const API_URL = 'http://localhost:5000/api/scans';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(label, condition, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passedTests++;
  } else {
    console.log(`  ❌ FAIL: ${label} ${details ? `(${details})` : ''}`);
    failedTests++;
  }
}

// Helper to create synthetic test images with text or pure graphics
async function createTextImage(textLines, bg = '#ffffff', fg = '#000000', width = 800, height = 600, blur = 0) {
  const svgLines = textLines.map((line, i) => 
    `<text x="40" y="${60 + (i * 45)}" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="bold" fill="${fg}">${line}</text>`
  ).join('\n');

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bg}"/>
    ${svgLines}
  </svg>`;

  let img = sharp(Buffer.from(svg));
  if (blur > 0) {
    img = img.blur(blur);
  }
  return await img.png().toBuffer();
}

// Helper to create pure non-text image (landscape gradient / geometric shape)
async function createLandscapeImage(width = 800, height = 600) {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="60%" stop-color="#e0f2fe"/>
      </linearGradient>
      <linearGradient id="mountain" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#475569"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="60%" fill="url(#sky)"/>
    <polygon points="50,360 250,150 450,360" fill="url(#mountain)"/>
    <polygon points="350,360 550,100 750,360" fill="url(#mountain)"/>
    <rect y="360" width="100%" height="40%" fill="#15803d"/>
  </svg>`;
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

// Helper to create pure noise image
async function createNoiseImage(width = 600, height = 600) {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#7c3aed"/>
    <circle cx="200" cy="200" r="100" fill="#fbbf24"/>
    <rect x="350" y="300" width="180" height="180" fill="#ec4899"/>
  </svg>`;
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

async function uploadScan(frontBuf, backBuf) {
  const form = new FormData();
  form.append('front', new Blob([frontBuf], { type: 'image/png' }), 'front.png');
  form.append('back', new Blob([backBuf], { type: 'image/png' }), 'back.png');

  const response = await fetch(API_URL, {
    method: 'POST',
    body: form
  });

  const json = await response.json();
  return { status: response.status, data: json.data || {}, json };
}

async function runAllTests() {
  console.log('================================================================');
  console.log(' LEGALSCAN — PHASE 1 VALIDATION GATE TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Landscape Image
  // Expected: INVALID_PRODUCT, scoreAvailable = false, Score = null/N/A
  // -------------------------------------------------------------------------
  console.log('[TEST 1] Landscape Image (Mountains / Sky, No Packaging)');
  try {
    const landscapeBuf = await createLandscapeImage();
    const { status, data } = await uploadScan(landscapeBuf, landscapeBuf);

    console.log(`  Response: status=${data.status}, scoreAvailable=${data.scoreAvailable}, score=${data.complianceScore}, detectionConf=${data.productDetectionConfidence}%, detectionLevel=${data.productDetectionLevel}`);
    assert('Status is INVALID_PRODUCT', data.status === 'INVALID_PRODUCT', `Got ${data.status}`);
    assert('scoreAvailable is false', data.scoreAvailable === false, `Got ${data.scoreAvailable}`);
    assert('productDetected is false', data.productDetected === false, `Got ${data.productDetected}`);
    assert('productName is null or not fabricated', data.productName === null || data.productName === undefined, `Got ${data.productName}`);
    assert('manufacturer is null (not fabricated)', data.manufacturer === null || data.manufacturer === undefined, `Got ${data.manufacturer}`);
    assert('No rule evaluations or issues fabricated', (!data.issues || data.issues.length === 0) && (!data.ruleEvaluations || data.ruleEvaluations.length === 0));
  } catch (err) {
    console.error('  Test 1 failed with error:', err);
    failedTests++;
  }

  // -------------------------------------------------------------------------
  // TEST 2: Random Unrelated Image (Geometric Abstract Art)
  // Expected: INVALID_PRODUCT, Score = N/A
  // -------------------------------------------------------------------------
  console.log('\n[TEST 2] Random Unrelated Image (Geometric Shapes / Abstract)');
  try {
    const noiseBuf = await createNoiseImage();
    const { status, data } = await uploadScan(noiseBuf, noiseBuf);

    console.log(`  Response: status=${data.status}, scoreAvailable=${data.scoreAvailable}, score=${data.complianceScore}, detectionConf=${data.productDetectionConfidence}%`);
    assert('Status is INVALID_PRODUCT', data.status === 'INVALID_PRODUCT', `Got ${data.status}`);
    assert('scoreAvailable is false', data.scoreAvailable === false, `Got ${data.scoreAvailable}`);
    assert('productDetected is false', data.productDetected === false, `Got ${data.productDetected}`);
  } catch (err) {
    console.error('  Test 2 failed with error:', err);
    failedTests++;
  }

  // -------------------------------------------------------------------------
  // TEST 3: Real Packaged Biscuit Front + Back
  // Expected: Valid product detection (HIGH_CONFIDENCE_PRODUCT), full compliance
  // -------------------------------------------------------------------------
  console.log('\n[TEST 3] Real Packaged Biscuit (Britannia Good Day Front + Back)');
  try {
    const biscuitFront = await createTextImage([
      'BRITANNIA',
      'GOOD DAY BUTTER COOKIES',
      'NET WEIGHT: 120 g',
      'MRP: Rs. 30.00'
    ], '#fef3c7', '#78350f');

    const biscuitBack = await createTextImage([
      'BRITANNIA GOOD DAY',
      'MANUFACTURED BY: BRITANNIA INDUSTRIES LTD',
      'PREMISES: 5/1A HUNGERFORD STREET, KOLKATA',
      'NET QUANTITY: 120 g',
      'MAX RETAIL PRICE: Rs. 30.00 (INCL. OF ALL TAXES)',
      'BATCH NO: BGD8849',
      'DATE OF MFG: 12/2024',
      'BEST BEFORE: 6 MONTHS FROM PACKAGING',
      'CONSUMER CARE: 1800 425 4449 feedback@britindia.com',
      'COUNTRY OF ORIGIN: INDIA',
      '8901063012345'
    ], '#ffffff', '#1e293b');

    const { status, data } = await uploadScan(biscuitFront, biscuitBack);

    console.log(`  Response: status=${data.status}, scoreAvailable=${data.scoreAvailable}, score=${data.complianceScore}%, detectionConf=${data.productDetectionConfidence}%, detectionLevel=${data.productDetectionLevel}`);
    console.log(`  Detected Product: ${data.productName}, Brand: ${data.brand || data.manufacturer}`);
    assert('Product detected successfully', data.productDetected === true);
    assert('Detection Level is HIGH_CONFIDENCE_PRODUCT', data.productDetectionLevel === 'HIGH_CONFIDENCE_PRODUCT', `Got ${data.productDetectionLevel}`);
    assert('scoreAvailable is true', data.scoreAvailable === true);
    assert('Compliance score is evaluated (>0)', typeof data.complianceScore === 'number' && data.complianceScore > 0, `Got ${data.complianceScore}`);
    assert('Manufacturer detected correctly', data.manufacturer && data.manufacturer.toLowerCase().includes('britannia'), `Got ${data.manufacturer}`);
  } catch (err) {
    console.error('  Test 3 failed with error:', err);
    failedTests++;
  }

  // -------------------------------------------------------------------------
  // TEST 4: Real Packaged Rice Front + Back
  // Expected: Valid product detection, full compliance
  // -------------------------------------------------------------------------
  console.log('\n[TEST 4] Real Packaged Rice (Tata Sampann Basmati Rice Front + Back)');
  try {
    const riceFront = await createTextImage([
      'TATA SAMPANN',
      'PURE BASMATI RICE',
      'NET WT: 5 kg',
      'MRP: Rs. 450.00'
    ], '#ecfdf5', '#065f46');

    const riceBack = await createTextImage([
      'TATA SAMPANN BASMATI RICE',
      'PACKED BY: TATA CONSUMER PRODUCTS LIMITED',
      'ADDRESS: 1 BISHOP LEFROY ROAD, KOLKATA 700020',
      'NET QUANTITY: 5 kg',
      'MAX RETAIL PRICE: Rs. 450.00 (INCL. OF ALL TAXES)',
      'BATCH NUMBER: TRC9021',
      'DATE OF MFG: 01/2025',
      'BEST BEFORE: 24 MONTHS FROM PACKAGING',
      'CONSUMER CARE: 1800-345-1720 care@tataconsumer.com',
      'COUNTRY OF ORIGIN: INDIA',
      '8901063098765'
    ], '#ffffff', '#0f172a');

    const { status, data } = await uploadScan(riceFront, riceBack);

    console.log(`  Response: status=${data.status}, scoreAvailable=${data.scoreAvailable}, score=${data.complianceScore}%, detectionConf=${data.productDetectionConfidence}%, detectionLevel=${data.productDetectionLevel}`);
    assert('Product detected successfully', data.productDetected === true);
    assert('Detection Level is HIGH_CONFIDENCE_PRODUCT', data.productDetectionLevel === 'HIGH_CONFIDENCE_PRODUCT', `Got ${data.productDetectionLevel}`);
    assert('scoreAvailable is true', data.scoreAvailable === true);
    assert('Compliance score is evaluated (>0)', typeof data.complianceScore === 'number' && data.complianceScore > 0, `Got ${data.complianceScore}`);
  } catch (err) {
    console.error('  Test 4 failed with error:', err);
    failedTests++;
  }

  // -------------------------------------------------------------------------
  // TEST 5: Biscuit Front + Different Product Back (Product Mismatch)
  // Expected: PRODUCT_MISMATCH, Score = N/A
  // -------------------------------------------------------------------------
  console.log('\n[TEST 5] Product Mismatch (Biscuit Front + Detergent Back)');
  try {
    const biscuitFront = await createTextImage([
      'BRITANNIA',
      'MARIE GOLD BISCUITS',
      'NET WT: 250 g'
    ], '#fef3c7', '#78350f');

    const detergentBack = await createTextImage([
      'SURF EXCEL DETERGENT POWDER',
      'MANUFACTURED BY: HINDUSTAN UNILEVER LIMITED',
      'NET QUANTITY: 1 kg',
      'MRP: Rs. 140.00',
      'BATCH NO: HUL8821'
    ], '#e0e7ff', '#312e81');

    const { status, data } = await uploadScan(biscuitFront, detergentBack);

    console.log(`  Response: status=${data.status}, scoreAvailable=${data.scoreAvailable}, suspiciousView=${data.productIdentity?.suspiciousView}`);
    assert('Status is PRODUCT_MISMATCH', data.status === 'PRODUCT_MISMATCH', `Got ${data.status}`);
    assert('Mismatch detected flag is true', data.status === 'PRODUCT_MISMATCH' || data.productIdentity?.mismatchDetected === true);
  } catch (err) {
    console.error('  Test 5 failed with error:', err);
    failedTests++;
  }

  // -------------------------------------------------------------------------
  // TEST 6: Real Product but Extremely Blurry
  // Expected: NEEDS_REVIEW / Low Confidence, Never invent unreadable fields
  // -------------------------------------------------------------------------
  console.log('\n[TEST 6] Real Product but Extremely Blurry (Unreadable)');
  try {
    // Blur = 12 renders text completely illegible to OCR
    const blurryFront = await createTextImage([
      'UNREADABLE PRODUCT',
      'BLURRY TEXT'
    ], '#ffffff', '#333333', 400, 300, 12);

    const blurryBack = await createTextImage([
      'UNREADABLE STATUTORY',
      'BLURRY DECLARATION'
    ], '#ffffff', '#333333', 400, 300, 12);

    const { status, data } = await uploadScan(blurryFront, blurryBack);

    console.log(`  Response: status=${data.status}, scoreAvailable=${data.scoreAvailable}, detectionConf=${data.productDetectionConfidence}%`);
    assert('Status is INVALID_PRODUCT or NEEDS_REVIEW', data.status === 'INVALID_PRODUCT' || data.status === 'NEEDS_REVIEW', `Got ${data.status}`);
    assert('scoreAvailable is false (not auto-passed)', data.scoreAvailable === false, `Got ${data.scoreAvailable}`);
    assert('Manufacturer is not fabricated', !data.manufacturer || data.manufacturer === 'Unidentified', `Got ${data.manufacturer}`);
  } catch (err) {
    console.error('  Test 6 failed with error:', err);
    failedTests++;
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(` PHASE 1 TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests();
