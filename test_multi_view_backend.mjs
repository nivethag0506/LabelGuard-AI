import assert from 'assert';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000/api';

async function testMultiViewBackend() {
  console.log('--- TESTING MULTI-VIEW & MISMATCH BACKEND ---');

  // Create test dummy images if not present
  const dummyDir = path.resolve('scratch');
  if (!fs.existsSync(dummyDir)) fs.mkdirSync(dummyDir, { recursive: true });

  const dummyImage = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const frontImg = path.join(dummyDir, 'front.png');
  const backImg = path.join(dummyDir, 'back.png');
  fs.writeFileSync(frontImg, dummyImage);
  fs.writeFileSync(backImg, dummyImage);

  // 1. Test Quality Check
  console.log('\n[TEST 1] Testing Image Quality Check endpoint...');
  const form = new FormData();
  form.append('image', new Blob([dummyImage], { type: 'image/png' }), 'test.png');
  const qcRes = await fetch(`${BASE_URL}/scans/quality-check`, {
    method: 'POST',
    body: form
  });
  assert.strictEqual(qcRes.status, 200);
  const qcData = await qcRes.json();
  console.log('  ✓ Quality check response:', qcData.data.qualityLevel, qcData.data.reasons);
  assert.ok(qcData.data.qualityLevel);

  // 2. Test Multi-View Scan with matching product
  console.log('\n[TEST 2] Testing Multi-View 4-image upload...');
  const mvForm = new FormData();
  mvForm.append('front', new Blob([dummyImage], { type: 'image/png' }), 'front.png');
  mvForm.append('back', new Blob([dummyImage], { type: 'image/png' }), 'back.png');
  mvForm.append('top', new Blob([dummyImage], { type: 'image/png' }), 'top.png');
  mvForm.append('bottom', new Blob([dummyImage], { type: 'image/png' }), 'bottom.png');

  const mvRes = await fetch(`${BASE_URL}/scans`, {
    method: 'POST',
    body: mvForm
  });
  assert.strictEqual(mvRes.status, 201);
  const mvData = await mvRes.json();
  console.log(`  ✓ Scan Created: ${mvData.data.inspectionId} | Score: ${mvData.data.complianceScore}% | Status: ${mvData.data.status}`);
  console.log(`  ✓ Identity Level: ${mvData.data.productIdentity?.level} | Completeness: ${mvData.data.inspectionCompleteness?.overallCompleteness}`);
  assert.ok(mvData.data.inspectionCompleteness);
  assert.strictEqual(mvData.data.inspectionCompleteness.viewsCount, 4);

  // 3. Test Product Mismatch Detection (Front = Product A, Bottom = Product B)
  console.log('\n[TEST 3] Testing Product Mismatch Detection...');
  const { verifyProductIdentity } = await import('./backend/services/productIdentityService.js');
  const mockMismatchViews = {
    FRONT: { rawText: 'BRITANNIA MARIE GOLD BISCUITS Net Wt 250g' },
    BACK: { rawText: 'BRITANNIA INDUSTRIES LTD Bangalore MRP 40' },
    TOP: { rawText: 'BRITANNIA PACKAGING' },
    BOTTOM: { rawText: 'PARLE-G GLUCOSE BISCUITS PARLE PRODUCTS PVT LTD MUMBAI' }
  };
  const mismatchResult = verifyProductIdentity(mockMismatchViews);
  console.log('  ✓ Mismatch Check Result:', mismatchResult.mismatchDetected, mismatchResult.suspiciousView);
  assert.strictEqual(mismatchResult.mismatchDetected, true);
  assert.strictEqual(mismatchResult.suspiciousView, 'BOTTOM');
  assert.strictEqual(mismatchResult.level, 'LOW CONFIDENCE');
  console.log('  ✓ Flagged Suspicious View:', mismatchResult.suspiciousView, mismatchResult.reasons);

  console.log('\n--- ALL MULTI-VIEW & MISMATCH TESTS PASSED! ---');
}


testMultiViewBackend().catch(err => {
  console.error('❌ Multi-View Backend Test Failed:', err);
  process.exit(1);
});
