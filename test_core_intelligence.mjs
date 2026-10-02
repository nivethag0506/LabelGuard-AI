import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { verifyProductIdentity } from './backend/services/productIdentityService.js';
import { 
  extractStructuredFields, 
  extractMultiViewStructuredFields, 
  detectProductCategory, 
  normalizeMrp, 
  normalizeQuantity, 
  normalizeDate 
} from './backend/services/extractionService.js';
import { evaluateCompliance } from './backend/services/complianceEngine.js';

const BASE_URL = 'http://localhost:5000/api';

async function runCoreIntelligenceTestSuite() {
  console.log('===============================================================');
  console.log('  LEGALSCAN — CORE INTELLIGENCE & COMPLIANCE QA TEST SUITE    ');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 12;

  // -------------------------------------------------------------------------
  // TEST 1: Four views of the SAME product
  // -------------------------------------------------------------------------
  console.log('[TEST 1] Upload four images of the SAME product...');
  const sameProductViews = {
    FRONT: { rawText: 'BRITANNIA MARIE GOLD BISCUITS Net Qty: 250 g' },
    BACK: { rawText: 'BRITANNIA INDUSTRIES LTD Whitefield Bangalore MRP: Rs. 40 (incl. all taxes) Consumer Care: feedback@britindia.com' },
    TOP: { rawText: 'BRITANNIA FRESHNESS SEALED PACK' },
    BOTTOM: { rawText: 'BATCH: B1048 PKD: 10/2024' }
  };
  const identityT1 = verifyProductIdentity(sameProductViews);
  assert.strictEqual(identityT1.mismatchDetected, false, 'Should not detect mismatch for same product');
  assert.strictEqual(identityT1.confirmed, true, 'Should confirm same product');
  assert.ok(identityT1.identityConfidence >= 85, 'Identity confidence should be HIGH');
  
  const extractedT1 = extractMultiViewStructuredFields(sameProductViews, Object.values(sameProductViews).map(v => v.rawText).join('\n'), 90);
  assert.strictEqual(extractedT1.inconsistencies.length, 0, 'No inconsistencies should be found');
  
  const complianceT1 = await evaluateCompliance({
    extractedFields: extractedT1.fields,
    productCategory: extractedT1.productCategory,
    ocrConfidence: 90
  });
  console.log(`  ✓ Identity: ${identityT1.level} (${identityT1.identityConfidence}%) | Status: ${complianceT1.status} | Score: ${complianceT1.score}%`);
  assert.ok(complianceT1.score > 80, 'Score should be high for complete compliant product');
  passed++;

  // -------------------------------------------------------------------------
  // TEST 2: Upload DIFFERENT products (Front = Product A, Bottom = Product B)
  // -------------------------------------------------------------------------
  console.log('\n[TEST 2] Upload different products (Front=Britannia, Bottom=Parle)...');
  const mismatchViews = {
    FRONT: { rawText: 'BRITANNIA MARIE GOLD BISCUITS Net Qty: 250 g' },
    BACK: { rawText: 'BRITANNIA INDUSTRIES LTD Whitefield Bangalore MRP: Rs. 40' },
    TOP: { rawText: 'BRITANNIA CRUNCHY PACK' },
    BOTTOM: { rawText: 'PARLE-G GLUCOSE BISCUITS PARLE PRODUCTS MUMBAI' }
  };
  const identityT2 = verifyProductIdentity(mismatchViews);
  assert.strictEqual(identityT2.mismatchDetected, true, 'Must detect product mismatch');
  assert.strictEqual(identityT2.suspiciousView, 'BOTTOM', 'Must flag BOTTOM as suspicious view');
  console.log(`  ✓ Flagged Mismatch: ${identityT2.explanation}`);
  console.log(`  ✓ Suspicious View: ${identityT2.suspiciousView}`);
  passed++;

  // -------------------------------------------------------------------------
  // TEST 3: Manufacturer only appears on BACK
  // -------------------------------------------------------------------------
  console.log('\n[TEST 3] Manufacturer only appears on BACK...');
  const mfgOnBackViews = {
    FRONT: { rawText: 'CHOCO CRUNCH COOKIES Net Wt 200g' },
    BACK: { rawText: 'Manufactured by ABC Foods Private Ltd, Plot 42 Industrial Estate, Chennai - 600001 MRP Rs. 50' },
    TOP: { rawText: 'SEALED QUALITY' },
    BOTTOM: { rawText: 'BATCH: A01 PKD: 01/2025' }
  };
  const extractedT3 = extractMultiViewStructuredFields(mfgOnBackViews, Object.values(mfgOnBackViews).map(v => v.rawText).join('\n'), 90);
  assert.ok(extractedT3.fields.manufacturer.value.length > 0, 'Manufacturer must be found');
  assert.strictEqual(extractedT3.fields.manufacturer.sourceView, 'BACK', 'Source view must be BACK');
  console.log(`  ✓ Manufacturer: "${extractedT3.fields.manufacturer.value}" attested in ${extractedT3.fields.manufacturer.sourceView}`);
  passed++;

  // -------------------------------------------------------------------------
  // TEST 4: MRP only appears on BACK
  // -------------------------------------------------------------------------
  console.log('\n[TEST 4] MRP only appears on BACK...');
  const mrpOnBackViews = {
    FRONT: { rawText: 'ORGANIC BASMATI RICE Net Wt 1 kg' },
    BACK: { rawText: 'Packed by Himalaya Foods Ltd, Delhi. MRP ₹120.00 (Inclusive of all taxes)' },
    TOP: { rawText: 'PREMIUM QUALITY' },
    BOTTOM: { rawText: 'BATCH NO: R992' }
  };
  const extractedT4 = extractMultiViewStructuredFields(mrpOnBackViews, Object.values(mrpOnBackViews).map(v => v.rawText).join('\n'), 90);
  assert.ok(extractedT4.fields.mrp.value.includes('120'), 'MRP must be extracted');
  assert.strictEqual(extractedT4.fields.mrp.sourceView, 'BACK', 'MRP source view must be BACK');
  console.log(`  ✓ MRP: "${extractedT4.fields.mrp.value}" attested in ${extractedT4.fields.mrp.sourceView}`);
  passed++;

  // -------------------------------------------------------------------------
  // TEST 5: Batch only appears on BOTTOM
  // -------------------------------------------------------------------------
  console.log('\n[TEST 5] Batch only appears on BOTTOM...');
  const batchOnBottomViews = {
    FRONT: { rawText: 'CRUNCHY CRACKERS Net Wt 150g' },
    BACK: { rawText: 'Manufactured by Metro Foods Ltd, Mumbai. MRP ₹30' },
    TOP: { rawText: 'CRACKERS' },
    BOTTOM: { rawText: 'LOT NO: AWH-9821 PKD 11/2024' }
  };
  const extractedT5 = extractMultiViewStructuredFields(batchOnBottomViews, Object.values(batchOnBottomViews).map(v => v.rawText).join('\n'), 90);
  assert.ok(extractedT5.fields.batchNumber.value.includes('AWH-9821') || extractedT5.fields.batchNumber.status === 'DETECTED', 'Batch must be found');
  assert.strictEqual(extractedT5.fields.batchNumber.sourceView, 'BOTTOM', 'Batch source view must be BOTTOM');
  console.log(`  ✓ Batch: "${extractedT5.fields.batchNumber.value}" attested in ${extractedT5.fields.batchNumber.sourceView}`);
  passed++;

  // -------------------------------------------------------------------------
  // TEST 6: Blurry declaration -> NEEDS REVIEW (Never confuse unknown with FAIL)
  // -------------------------------------------------------------------------
  console.log('\n[TEST 6] Blurry declaration -> NEEDS REVIEW (never FAIL without proof)...');
  const blurryViews = {
    FRONT: { rawText: 'BISCUITS 100g' },
    BACK: { rawText: 'Mfd by ... address unreadable ...' }
  };
  const extractedT6 = extractMultiViewStructuredFields(blurryViews, 'BISCUITS 100g Mfd by ...', 35);
  const complianceT6 = await evaluateCompliance({
    extractedFields: extractedT6.fields,
    productCategory: 'Food & Edible Commodities',
    ocrConfidence: 35
  });
  // Rule evaluations for missing/unverified required items must be NEEDS_REVIEW, NOT FAIL
  const mfgEval = complianceT6.ruleEvaluations.find(r => r.field === 'manufacturerAddress');
  assert.strictEqual(mfgEval.status, 'NEEDS_REVIEW', 'Unclear declaration must be NEEDS_REVIEW, never FAIL');
  assert.ok(mfgEval.explanation.includes('could not be confidently verified'), 'Explanation must note unverified evidence');
  console.log(`  ✓ Blurry Field Status: ${mfgEval.status} | Reason: ${mfgEval.explanation}`);
  passed++;

  // -------------------------------------------------------------------------
  // TEST 7: Random non-product image (Selfie, landscape, blank image)
  // -------------------------------------------------------------------------
  console.log('\n[TEST 7] Random image (blank / landscape / selfie / non-product)...');
  const nonProductViews = {
    FRONT: { rawText: '' },
    BACK: { rawText: 'beautiful sunny day in mountains' }
  };
  const identityT7 = verifyProductIdentity(nonProductViews);
  assert.strictEqual(identityT7.isPackagedProduct, false, 'Must identify media as non-product');
  assert.strictEqual(identityT7.confirmed, false, 'Must not confirm product');
  assert.strictEqual(identityT7.level, 'LOW CONFIDENCE');
  assert.ok(identityT7.explanation.includes('Unable to identify a packaged product'), 'Must show required invalid product message');
  
  const complianceT7 = await evaluateCompliance({
    isPackagedProduct: false,
    extractedFields: {}
  });
  assert.strictEqual(complianceT7.status, 'NEEDS_REVIEW', 'Status must be NEEDS_REVIEW');
  assert.strictEqual(complianceT7.score, 0, 'Score must be 0 for invalid non-product');
  console.log(`  ✓ Non-product identified: "${identityT7.explanation}" | Status: ${complianceT7.status} | Score: ${complianceT7.score}`);
  passed++;

  // -------------------------------------------------------------------------
  // TEST 8: Two different MRP values (Front: ₹100, Back: ₹120) -> POTENTIAL INCONSISTENCY
  // -------------------------------------------------------------------------
  console.log('\n[TEST 8] Two different MRP values across views (Front=100, Back=120)...');
  const conflictingMrpViews = {
    FRONT: { rawText: 'PREMIUM TEA Net Wt 500g Special Price MRP ₹100' },
    BACK: { rawText: 'PREMIUM TEA Packed by Tata Consumer Products Ltd MRP ₹120.00 (incl. of all taxes)' }
  };
  const extractedT8 = extractMultiViewStructuredFields(conflictingMrpViews, 'PREMIUM TEA Front MRP ₹100 Back MRP ₹120', 90);
  assert.ok(extractedT8.inconsistencies.length > 0, 'Must detect cross-view inconsistency');
  const mrpInconsistency = extractedT8.inconsistencies.find(i => i.field === 'mrp');
  assert.ok(mrpInconsistency, 'Must flag mrp inconsistency');
  assert.ok(mrpInconsistency.message.includes('POTENTIAL INCONSISTENCY'), 'Message must declare POTENTIAL INCONSISTENCY');
  console.log(`  ✓ Inconsistency Detected: ${mrpInconsistency.message}`);
  
  const complianceT8 = await evaluateCompliance({
    extractedFields: extractedT8.fields,
    hasInconsistencies: true,
    inconsistencies: extractedT8.inconsistencies
  });
  assert.strictEqual(complianceT8.status, 'NEEDS_REVIEW', 'Status with inconsistency must be NEEDS_REVIEW');
  console.log(`  ✓ Compliance Status under inconsistency: ${complianceT8.status}`);
  passed++;

  // -------------------------------------------------------------------------
  // TEST 9: Video contains same product
  // -------------------------------------------------------------------------
  console.log('\n[TEST 9] Video contains same product (Britannia)...');
  const videoMatchingViews = {
    FRONT: { rawText: 'BRITANNIA MARIE GOLD Net Wt 250g' },
    BACK: { rawText: 'BRITANNIA INDUSTRIES LTD Whitefield Bangalore' },
    VIDEO_FRAME_1: { rawText: 'BRITANNIA PACKAGING SURFACE CONTINUITY' },
    VIDEO_FRAME_2: { rawText: 'BRITANNIA MARIE GOLD CODING STAMP' }
  };
  const identityT9 = verifyProductIdentity(videoMatchingViews);
  assert.strictEqual(identityT9.mismatchDetected, false, 'No mismatch for video of same product');
  assert.strictEqual(identityT9.confirmed, true, 'Product confirmed with video support');
  console.log(`  ✓ Video Identity Check: Confirmed=${identityT9.confirmed} | Level=${identityT9.level}`);
  passed++;

  // -------------------------------------------------------------------------
  // TEST 10: Video contains another product (Images=Britannia, Video=Parle)
  // -------------------------------------------------------------------------
  console.log('\n[TEST 10] Video contains another product (Images=Britannia, Video=Parle)...');
  const videoMismatchViews = {
    FRONT: { rawText: 'BRITANNIA MARIE GOLD Net Wt 250g' },
    BACK: { rawText: 'BRITANNIA INDUSTRIES LTD Whitefield Bangalore' },
    VIDEO_FRAME_1: { rawText: 'PARLE-G GLUCOSE BISCUITS PARLE PRODUCTS PVT LTD' }
  };
  const identityT10 = verifyProductIdentity(videoMismatchViews);
  assert.strictEqual(identityT10.mismatchDetected, true, 'Video mismatch must be detected');
  assert.strictEqual(identityT10.suspiciousView, 'VIDEO', 'Suspicious view must be VIDEO');
  console.log(`  ✓ Video Mismatch Detected: Suspicious View=${identityT10.suspiciousView} | ${identityT10.explanation}`);
  passed++;

  // -------------------------------------------------------------------------
  // TEST 11: New scan after old scan (Independent records, no stale data)
  // -------------------------------------------------------------------------
  console.log('\n[TEST 11] New scan after old scan (Database uniqueness & independence)...');
  const resScan1 = await fetch(`${BASE_URL}/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demoType: 'compliant' })
  });
  const dataScan1 = await resScan1.json();
  const id1 = dataScan1.data.inspectionId;

  const resScan2 = await fetch(`${BASE_URL}/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demoType: 'non_compliant' })
  });
  const dataScan2 = await resScan2.json();
  const id2 = dataScan2.data.inspectionId;

  assert.notStrictEqual(id1, id2, 'Each inspection must have a unique inspectionId');
  assert.notStrictEqual(dataScan1.data.complianceScore, dataScan2.data.complianceScore, 'Scores must be independent');

  // Fetch scan 1 and scan 2 individually
  const fetch1 = await (await fetch(`${BASE_URL}/scans/${dataScan1.data._id}`)).json();
  const fetch2 = await (await fetch(`${BASE_URL}/scans/${dataScan2.data._id}`)).json();
  assert.strictEqual(fetch1.data.inspectionId, id1);
  assert.strictEqual(fetch2.data.inspectionId, id2);
  console.log(`  ✓ Scan 1 ID: ${id1} (Score: ${fetch1.data.complianceScore}%)`);
  console.log(`  ✓ Scan 2 ID: ${id2} (Score: ${fetch2.data.complianceScore}%)`);
  console.log('  ✓ Records are completely isolated and stored independently.');
  passed++;

  // -------------------------------------------------------------------------
  // TEST 12: Result ↔ Report Data Consistency
  // -------------------------------------------------------------------------
  console.log('\n[TEST 12] Result <-> Report Data Consistency...');
  const inspectionObj = fetch1.data;
  assert.ok(inspectionObj.ruleEvaluations && inspectionObj.ruleEvaluations.length > 0, 'Rule evaluations must exist');
  assert.ok(inspectionObj.scoreBreakdown, 'Score breakdown must exist');
  assert.strictEqual(inspectionObj.ruleEvaluations.length, inspectionObj.totalRules, 'Rule evaluations count matches totalRules');
  console.log(`  ✓ Web and Report data synchronized: ${inspectionObj.ruleEvaluations.length} evaluated rules across ${inspectionObj.scoreBreakdown.totalPossibleWeight} statutory points.`);
  passed++;

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`  CORE INTELLIGENCE TEST RESULTS: ${passed} / ${total} PASSED (100%) `);
  console.log('===============================================================\n');
}

runCoreIntelligenceTestSuite().catch(err => {
  console.error('\n❌ QA Test Suite Failed:', err);
  process.exit(1);
});
