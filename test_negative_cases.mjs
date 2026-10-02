/**
 * LegalScan — Comprehensive Negative Case Test Suite
 * 6 structured negative tests to verify system correctness
 */
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:5000/api/scans';
const UPLOADS_DIR = 'backend/uploads';

// Real product images for tests
const FIRST_CROP_FRONT  = path.join(UPLOADS_DIR, 'scan-1790830502079-888893218.png');  // First Crop Salted Biscuits - FRONT
const FIRST_CROP_BACK   = path.join(UPLOADS_DIR, 'scan-1790830526880-829643135.png');  // First Crop Salted Biscuits - BACK
const OREO_BACK         = path.join(UPLOADS_DIR, 'scan-1790796078369-675731103.png');  // Oreo Sandwich Biscuits - BACK (different brand)
const HAIR_SERUM_BACK   = path.join(UPLOADS_DIR, 'scan-1790796938506-284701603.jpg');  // Hair serum product - BACK
const LANDSCAPE_IMAGE   = path.join(UPLOADS_DIR, 'test_unrelated_landscape.jpg');       // Completely unrelated nature image

// Small 1x1 pixel PNG for unreadable text test
const BLANK_IMAGE = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

let passed = 0;
let failed = 0;

async function postFiles(files, extraFields = {}) {
  const form = new FormData();
  for (const [fieldname, filePath, buffer] of files) {
    if (buffer) {
      form.append(fieldname, buffer, { filename: fieldname + '.png', contentType: 'image/png' });
    } else {
      form.append(fieldname, fs.createReadStream(filePath), {
        filename: path.basename(filePath),
        contentType: filePath.endsWith('.jpg') ? 'image/jpeg' : 'image/png'
      });
    }
  }
  for (const [key, val] of Object.entries(extraFields)) {
    form.append(key, val);
  }
  const response = await fetch(API_URL, { method: 'POST', body: form, headers: form.getHeaders() });
  const data = await response.json();
  return { response, data, status: response.status };
}

function check(label, condition, failMsg) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label} — ${failMsg}`);
    failed++;
  }
}

// ============================================================
// TEST 1: Completely unrelated image (landscape photo)
// Expected: INVALID PRODUCT, Score = 0, no fake compliance
// ============================================================
async function test1() {
  console.log('\n================================================================');
  console.log('TEST 1: Unrelated Image (Landscape Photo)');
  console.log('Expected: INVALID PRODUCT / NEEDS_REVIEW, score = 0');
  console.log('================================================================');

  if (!fs.existsSync(LANDSCAPE_IMAGE)) {
    console.log('  ⚠️  SKIP: Landscape image not found, using blank image fallback');
  }
  
  const imgPath = fs.existsSync(LANDSCAPE_IMAGE) ? LANDSCAPE_IMAGE : null;
  let files;
  if (imgPath) {
    files = [['front', imgPath], ['back', imgPath]];
  } else {
    files = [
      ['front', null, BLANK_IMAGE],
      ['back', null, BLANK_IMAGE]
    ];
  }

  const { data, status } = await postFiles(files);
  const d = data.data;
  
  console.log(`  Status HTTP: ${status}`);
  console.log(`  Product Name: ${d.productName}`);
  console.log(`  Compliance Score: ${d.complianceScore}`);
  console.log(`  Status: ${d.status}`);
  console.log(`  Decision Gate: ${d.decisionGate?.code}`);
  console.log(`  Issue: ${d.issues?.[0]?.title}`);

  check('HTTP 201 returned', status === 201, `Got ${status}`);
  check('Product not misidentified', 
    d.productName?.includes('Unable') || d.productName?.includes('Unidentified') || d.complianceScore === 0,
    `Got product name: "${d.productName}", score: ${d.complianceScore}`);
  check('Score is 0 (no fake scoring)', d.complianceScore === 0, `Got score ${d.complianceScore}`);
  check('Status is NEEDS_REVIEW or INVALID', 
    ['NEEDS_REVIEW', 'INVALID_PRODUCT', 'NON_PRODUCT'].includes(d.status),
    `Got status: ${d.status}`);
  check('No rule evaluations run on non-product', 
    !d.ruleEvaluations || d.ruleEvaluations.length === 0,
    `Got ${d.ruleEvaluations?.length} rule evaluations`);
  check('No fake MRP extracted', !d.mrp || d.mrp === '',
    `Got MRP: ${d.mrp}`);
}

// ============================================================
// TEST 2: Front of Product A + Back of Product B (MISMATCH)
// Expected: PRODUCT_MISMATCH, Score = 0, no compliance scoring
// ============================================================
async function test2() {
  console.log('\n================================================================');
  console.log('TEST 2: Product Mismatch (First Crop Front + Oreo/HairSerum Back)');
  console.log('Expected: PRODUCT_MISMATCH, score = 0');
  console.log('================================================================');

  // Use First Crop front + Oreo back (different brand detected in both)
  const files = [
    ['front', FIRST_CROP_FRONT],
    ['back', OREO_BACK]
  ];

  const { data, status } = await postFiles(files);
  const d = data.data;

  console.log(`  Status HTTP: ${status}`);
  console.log(`  Product Identity Confirmed: ${d.productIdentity?.confirmed}`);
  console.log(`  Mismatch Detected: ${d.productIdentity?.mismatchDetected}`);
  console.log(`  Suspicious View: ${d.productIdentity?.suspiciousView}`);
  console.log(`  Compliance Score: ${d.complianceScore}`);
  console.log(`  Status: ${d.status}`);
  console.log(`  Decision Gate: ${d.decisionGate?.code}`);

  check('HTTP 201 returned', status === 201, `Got ${status}`);
  check('Mismatch detected', d.productIdentity?.mismatchDetected === true, 
    'mismatchDetected is false — same-product check failed');
  check('Score is 0 when mismatch', d.complianceScore === 0, 
    `Score is ${d.complianceScore} — should be 0 on mismatch`);
  check('Status is PRODUCT_MISMATCH', d.status === 'PRODUCT_MISMATCH', 
    `Got status: ${d.status}`);
  check('No compliance rules evaluated on mismatch', 
    !d.ruleEvaluations || d.ruleEvaluations.length === 0,
    `Got ${d.ruleEvaluations?.length} rule evaluations on a mismatch`);
}

// ============================================================
// TEST 3: Blurry / Low-resolution image
// Expected: IMAGE QUALITY WARNING, quality score low, NEEDS_REVIEW
// ============================================================
async function test3() {
  console.log('\n================================================================');
  console.log('TEST 3: Blurry/Low-Quality Image (1x1 pixel PNG)');
  console.log('Expected: Low quality score, quality warning, NEEDS_REVIEW');
  console.log('================================================================');

  const files = [
    ['front', null, BLANK_IMAGE],
    ['back', null, BLANK_IMAGE]
  ];

  const { data, status } = await postFiles(files);
  const d = data.data;

  console.log(`  Status HTTP: ${status}`);
  console.log(`  Front Quality: ${JSON.stringify(d.imageQuality?.FRONT?.qualityLevel)} (score: ${d.imageQuality?.FRONT?.score})`);
  console.log(`  Back Quality: ${JSON.stringify(d.imageQuality?.BACK?.qualityLevel)} (score: ${d.imageQuality?.BACK?.score})`);
  console.log(`  Front Acceptable: ${d.imageQuality?.FRONT?.isAcceptable}`);
  console.log(`  OCR Result: "${d.combinedText?.substring(0, 50) || '[empty]'}"`);
  console.log(`  Status: ${d.status}`);

  check('HTTP 201 returned', status === 201, `Got ${status}`);
  check('Quality score is LOW', 
    (d.imageQuality?.FRONT?.score || 100) < 75,
    `Front quality score: ${d.imageQuality?.FRONT?.score}`);
  check('Front marked as NOT acceptable', 
    d.imageQuality?.FRONT?.isAcceptable === false,
    'Front was marked acceptable when it should not be');
  check('Status is NEEDS_REVIEW (not fake COMPLIANT)', 
    d.status !== 'COMPLIANT',
    `Got status: ${d.status}`);
  check('No fake OCR extracted', 
    !d.combinedText || d.combinedText.trim().length < 10,
    `Got combined text: "${d.combinedText?.substring(0, 50)}"`);
}

// ============================================================
// TEST 4: Only Front + Back uploaded
// Expected: 2/2 required views, NO fake Top/Bottom images created
// ============================================================
async function test4() {
  console.log('\n================================================================');
  console.log('TEST 4: Only Front + Back (No Top/Bottom)');
  console.log('Expected: 2/2 views, no fake Top/Bottom URLs, requiredComplete=true');
  console.log('================================================================');

  const files = [
    ['front', FIRST_CROP_FRONT],
    ['back', FIRST_CROP_BACK]
  ];

  const { data, status } = await postFiles(files);
  const d = data.data;

  console.log(`  Status HTTP: ${status}`);
  console.log(`  Views Count: ${d.inspectionCompleteness?.viewsCount}`);
  console.log(`  Required Views Label: ${d.inspectionCompleteness?.requiredViewsLabel}`);
  console.log(`  Required Complete: ${d.inspectionCompleteness?.requiredComplete}`);
  console.log(`  Has Top: ${d.inspectionCompleteness?.hasTop}`);
  console.log(`  Has Bottom: ${d.inspectionCompleteness?.hasBottom}`);
  console.log(`  Additional Views Count: ${d.inspectionCompleteness?.additionalViewsCount}`);
  console.log(`  Top image URL: "${d.images?.top}"`);
  console.log(`  Bottom image URL: "${d.images?.bottom}"`);
  console.log(`  Actual views in DB: ${d.views?.length}`);

  check('HTTP 201 returned', status === 201, `Got ${status}`);
  check('Exactly 2 views stored (no fake Top/Bottom)', 
    d.views?.length === 2,
    `Got ${d.views?.length} views in DB`);
  check('Top image URL is empty (not fabricated)', 
    !d.images?.top || d.images.top === '',
    `Top URL is: "${d.images?.top}"`);
  check('Bottom image URL is empty (not fabricated)', 
    !d.images?.bottom || d.images.bottom === '',
    `Bottom URL is: "${d.images?.bottom}"`);
  check('hasTop is false', d.inspectionCompleteness?.hasTop === false, 
    'hasTop should be false');
  check('hasBottom is false', d.inspectionCompleteness?.hasBottom === false, 
    'hasBottom should be false');
  check('requiredComplete is true (Front+Back is enough)', 
    d.inspectionCompleteness?.requiredComplete === true,
    'requiredComplete should be true when Front+Back provided');
  check('Required views label shows 2/2', 
    d.inspectionCompleteness?.requiredViewsLabel?.includes('2/2'),
    `Got: "${d.inspectionCompleteness?.requiredViewsLabel}"`);
}

// ============================================================
// TEST 5: Unreadable/noise image — OCR should yield nothing
// Expected: NEEDS_REVIEW, no invented values
// ============================================================
async function test5() {
  console.log('\n================================================================');
  console.log('TEST 5: Unreadable Image (Solid Color / Noise)');
  console.log('Expected: NEEDS_REVIEW, no invented field values');
  console.log('================================================================');

  // Use a solid red pixel image (clearly unreadable)
  const solidRedBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADklEQVQI12P4z8BQDwAEgAF/QualIQAAAABJRU5ErkJggg==', 'base64');
  
  const files = [
    ['front', null, solidRedBuffer],
    ['back', null, solidRedBuffer]
  ];

  const { data, status } = await postFiles(files);
  const d = data.data;

  console.log(`  Status HTTP: ${status}`);
  console.log(`  Combined OCR Text: "${d.combinedText?.substring(0, 80) || '[empty]'}"`);
  console.log(`  OCR Confidence: ${d.ocrConfidence}%`);
  console.log(`  Manufacturer: "${d.manufacturer}"`);
  console.log(`  MRP: "${d.mrp}"`);
  console.log(`  Net Qty: "${d.netQuantity}"`);
  console.log(`  Status: ${d.status}`);
  console.log(`  Score: ${d.complianceScore}`);

  check('HTTP 201 returned', status === 201, `Got ${status}`);
  check('No fake manufacturer extracted', !d.manufacturer || d.manufacturer === '',
    `Got manufacturer: "${d.manufacturer}"`);
  check('No fake MRP extracted', !d.mrp || d.mrp === '',
    `Got MRP: "${d.mrp}"`);
  check('No fake Net Quantity extracted', !d.netQuantity || d.netQuantity === '',
    `Got netQty: "${d.netQuantity}"`);
  check('Score is 0 (no scoring without OCR)', d.complianceScore === 0,
    `Got score: ${d.complianceScore}`);
  check('Status is NEEDS_REVIEW or INVALID (not COMPLIANT)', 
    d.status !== 'COMPLIANT',
    `Got status: ${d.status}`);
}

// ============================================================
// TEST 6: Check MongoDB Empty State
// Expected: 0 inspections before any real inspection is saved
// ============================================================
async function test6() {
  console.log('\n================================================================');
  console.log('TEST 6: MongoDB Empty State Check (History API)');
  console.log('Expected: Only real scans exist — no mock/seed data');
  console.log('================================================================');

  const histRes = await fetch('http://localhost:5000/api/scans');
  const histData = await histRes.json();

  console.log(`  Total scans in DB: ${histData.count}`);
  console.log(`  HTTP Status: ${histRes.status}`);

  const mockProductNames = ['Premium Rice', 'demo rice', 'sample product', 'test product', 'Mock Product'];
  const hasMockData = histData.data?.some(scan =>
    mockProductNames.some(mock => scan.productName?.toLowerCase().includes(mock.toLowerCase()))
  );

  check('API returns 200', histRes.status === 200, `Got ${histRes.status}`);
  check('No mock/demo product names in DB', !hasMockData, 
    'Found mock product data in database — purge needed');
  check('All scans have an inspectionId', 
    histData.data?.every(s => s.inspectionId?.startsWith('INSP-')),
    'Some scans are missing proper inspectionId');
  check('All scans have a status field', 
    histData.data?.every(s => s.status),
    'Some scans are missing a status field');

  if (histData.count > 0) {
    console.log(`\n  Recent scans in DB (last 3):`);
    histData.data?.slice(0, 3).forEach((s, i) => {
      console.log(`    ${i+1}. [${s.inspectionId}] "${s.productName}" — Status: ${s.status} | Score: ${s.complianceScore}`);
    });
  } else {
    check('DB is empty as expected (no hidden seed data)', true, '');
  }
}

// ============================================================
// RUNNER
// ============================================================
async function runAll() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     LEGALSCAN — NEGATIVE CASE TEST SUITE (6 Tests)          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  try { await test1(); } catch (e) { console.error('  ❌ TEST 1 CRASHED:', e.message); failed++; }
  try { await test2(); } catch (e) { console.error('  ❌ TEST 2 CRASHED:', e.message); failed++; }
  try { await test3(); } catch (e) { console.error('  ❌ TEST 3 CRASHED:', e.message); failed++; }
  try { await test4(); } catch (e) { console.error('  ❌ TEST 4 CRASHED:', e.message); failed++; }
  try { await test5(); } catch (e) { console.error('  ❌ TEST 5 CRASHED:', e.message); failed++; }
  try { await test6(); } catch (e) { console.error('  ❌ TEST 6 CRASHED:', e.message); failed++; }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} checks`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  if (failed > 0) process.exit(1);
}

runAll();
