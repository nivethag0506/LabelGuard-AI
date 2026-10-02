import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { verifyProductIdentity } from './backend/services/productIdentityService.js';
import { extractMultiViewStructuredFields } from './backend/services/extractionService.js';
import { evaluateCompliance } from './backend/services/complianceEngine.js';

const BASE_URL = 'http://localhost:5000/api';

async function runAudit() {
  console.log('================================================================');
  console.log('       LEGALSCAN — FINAL REAL-WORLD DATA & PREDICTION AUDIT      ');
  console.log('================================================================');

  // -------------------------------------------------------------------------
  // 1. Negative Test: Empty Database (Zero Mock Data)
  // -------------------------------------------------------------------------
  console.log('\n[AUDIT 1] Testing Empty Database State (Zero Mock Data)...');
  const dashRes = await fetch(`${BASE_URL}/dashboard/stats`);
  assert.strictEqual(dashRes.status, 200);
  const dashData = (await dashRes.json()).data;

  console.log(`  ✓ Total Scans in DB: ${dashData.totalScans}`);
  console.log(`  ✓ Compliant Count: ${dashData.compliantCount}`);
  console.log(`  ✓ Average Score: ${dashData.averageScore}%`);
  console.log(`  ✓ Common Issues: ${dashData.commonIssues.length}`);
  console.log(`  ✓ Recent Scans: ${dashData.recentScans.length}`);
  console.log(`  ✓ Trend Points: ${dashData.complianceTrend.length}`);

  assert.strictEqual(dashData.totalScans, 0, 'Total scans must be 0 in empty state');
  assert.strictEqual(dashData.compliantCount, 0, 'Compliant count must be 0');
  assert.strictEqual(dashData.averageScore, 0, 'Average score must be 0');
  assert.strictEqual(dashData.commonIssues.length, 0, 'No fake common issues');
  assert.strictEqual(dashData.recentScans.length, 0, 'No fake recent scans');
  assert.strictEqual(dashData.complianceTrend.length, 0, 'No fake trend points');

  const historyRes = await fetch(`${BASE_URL}/scans`);
  assert.strictEqual(historyRes.status, 200);
  const historyData = await historyRes.json();
  console.log(`  ✓ History Records Count: ${historyData.count}`);
  assert.strictEqual(historyData.count, 0, 'History records must be 0');
  assert.strictEqual(historyData.data.length, 0, 'History data list must be empty');

  // -------------------------------------------------------------------------
  // 2. Negative Test: No Media = No Prediction (Button Blocked)
  // -------------------------------------------------------------------------
  console.log('\n[AUDIT 2] Testing No Media Submission...');
  const emptyPostRes = await fetch(`${BASE_URL}/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.strictEqual(emptyPostRes.status, 400);
  const emptyPostJson = await emptyPostRes.json();
  console.log(`  ✓ Empty Submission Rejected: HTTP ${emptyPostRes.status}`);
  console.log(`  ✓ Message: "${emptyPostJson.message}"`);
  assert.strictEqual(emptyPostJson.message, 'Upload or capture a product package to begin inspection.');

  // -------------------------------------------------------------------------
  // 3. Negative Test: Random Non-Product Media
  // -------------------------------------------------------------------------
  console.log('\n[AUDIT 3] Testing Random Non-Product Media Analysis...');
  const nonProductOcr = {
    FRONT: { rawText: 'Sunset at the mountain beach vacation 2026 scenery', cleanedText: 'Sunset at the mountain beach vacation 2026 scenery', confidence: 60 }
  };
  const identityNonProduct = verifyProductIdentity(nonProductOcr);
  console.log(`  ✓ Product Candidate Flag: isPackagedProduct=${identityNonProduct.isPackagedProduct}`);
  console.log(`  ✓ Identity Diagnostic: "${identityNonProduct.explanation}"`);
  assert.strictEqual(identityNonProduct.isPackagedProduct, false);

  const reportNonProduct = await evaluateCompliance({
    isPackagedProduct: false,
    extractedFields: {},
    ocrConfidence: 60
  });
  console.log(`  ✓ Non-Product Status: ${reportNonProduct.status}`);
  console.log(`  ✓ Non-Product Score: ${reportNonProduct.score}%`);
  console.log(`  ✓ Issues Flagged: "${reportNonProduct.issues[0]?.title}"`);

  assert.strictEqual(reportNonProduct.score, 0, 'Non-product must yield 0 compliance score');
  assert.strictEqual(reportNonProduct.status, 'NEEDS_REVIEW');
  assert.strictEqual(reportNonProduct.issues[0]?.title, 'Unable to Identify a Packaged Product');

  // -------------------------------------------------------------------------
  // 4. Negative Test: Conflicting Products (Product Mismatch)
  // -------------------------------------------------------------------------
  console.log('\n[AUDIT 4] Testing Mixed Products (Front=Britannia, Bottom=Parle)...');
  const mixedOcr = {
    FRONT: { rawText: 'BRITANNIA GOOD DAY BUTTER COOKIES Net Wt 200g MRP Rs 40', cleanedText: 'BRITANNIA GOOD DAY BUTTER COOKIES Net Wt 200g MRP Rs 40', confidence: 95 },
    BOTTOM: { rawText: 'PARLE-G GLUCOSE BISCUITS Batch B9928', cleanedText: 'PARLE-G GLUCOSE BISCUITS Batch B9928', confidence: 95 }
  };
  const mismatchIdentity = verifyProductIdentity(mixedOcr);
  console.log(`  ✓ Mismatch Check: mismatchDetected=${mismatchIdentity.mismatchDetected}`);
  console.log(`  ✓ Flagged Suspicious View: ${mismatchIdentity.suspiciousView}`);
  console.log(`  ✓ Reason: ${mismatchIdentity.reasons[0]}`);

  assert.strictEqual(mismatchIdentity.mismatchDetected, true);
  assert.strictEqual(mismatchIdentity.suspiciousView, 'BOTTOM');

  const mismatchReport = await evaluateCompliance({
    mismatchDetected: true,
    isPackagedProduct: true,
    extractedFields: {},
    ocrConfidence: 95
  });
  console.log(`  ✓ Mismatch Compliance Status: ${mismatchReport.status}`);
  console.log(`  ✓ Mismatch Score: ${mismatchReport.score}%`);
  assert.strictEqual(mismatchReport.status, 'PRODUCT_MISMATCH');
  assert.strictEqual(mismatchReport.score, 0);

  // -------------------------------------------------------------------------
  // 5. Real-World Product Analysis: Direct Declaration Audit
  // -------------------------------------------------------------------------
  console.log('\n[AUDIT 5] Testing Real-World Product Audit (Whole Wheat Atta 5 kg)...');
  const realProductInput = {
    productName: 'Whole Wheat Atta 5 kg',
    brand: 'Aashirvaad',
    manufacturer: 'ITC Limited',
    manufacturerAddress: 'Virginia House, 37 J.L. Nehru Road, Kolkata, West Bengal - 700071',
    packer: 'ITC Limited Foods Business Division',
    importer: 'N/A (Domestic)',
    netQuantity: '5 kg',
    mrp: '₹265 (Inclusive of all taxes)',
    batchNumber: 'B-ATT782',
    manufacturingDate: '15/09/2026',
    bestBefore: 'Best before 9 months from packaging',
    expiryDate: '15/06/2027',
    countryOfOrigin: 'India',
    consumerCare: 'Toll Free 1800-345-8888 or customercare@itc.in'
  };

  const realAuditRes = await fetch(`${BASE_URL}/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productData: realProductInput })
  });

  assert.strictEqual(realAuditRes.status, 201);
  const realScan = (await realAuditRes.json()).data;

  console.log(`  ✓ Generated Inspection ID: ${realScan.inspectionId}`);
  console.log(`  ✓ Product Name: ${realScan.productName}`);
  console.log(`  ✓ Manufacturer: ${realScan.manufacturer}`);
  console.log(`  ✓ Net Qty: ${realScan.netQuantity} | MRP: ${realScan.mrp}`);
  console.log(`  ✓ Score: ${realScan.complianceScore}% | Status: ${realScan.status}`);
  console.log(`  ✓ Passed Rules: ${realScan.passedRules}, Warnings: ${realScan.warningRules}, Failures: ${realScan.failedRules}`);

  assert.strictEqual(realScan.productName, 'Whole Wheat Atta 5 kg');
  assert.strictEqual(realScan.manufacturer, 'ITC Limited');
  assert.strictEqual(realScan.netQuantity, '5 kg');
  assert.strictEqual(realScan.mrp, '₹265 (Inclusive of all taxes)');
  assert.strictEqual(realScan.status, 'COMPLIANT');
  assert.ok(realScan.complianceScore >= 95, 'Real fully compliant product must score >= 95');

  // Verify that rule evaluations are linked to actual evidence
  const mfgRule = realScan.ruleEvaluations.find(r => r.field === 'manufacturer');
  assert.ok(mfgRule, 'Manufacturer rule must be evaluated');
  assert.strictEqual(mfgRule.status, 'PASS');
  console.log(`  ✓ Statutory Rule LMR-02 (Manufacturer): Status=${mfgRule.status}, Detected="${mfgRule.detectedValue}", Weight=${mfgRule.weight}pts`);

  // -------------------------------------------------------------------------
  // 6. Verify Database, History, and Dashboard Now Contain Exactly the Real Scans
  // -------------------------------------------------------------------------
  console.log('\n[AUDIT 6] Verifying Live Persistence & Analytics Update...');
  const updatedDash = (await (await fetch(`${BASE_URL}/dashboard/stats`)).json()).data;
  console.log(`  ✓ Total Inspections Now: ${updatedDash.totalScans}`);
  console.log(`  ✓ Compliant Count: ${updatedDash.compliantCount}`);
  console.log(`  ✓ Average Score: ${updatedDash.averageScore}%`);
  console.log(`  ✓ Recent Scan 1: ${updatedDash.recentScans[0]?.productName}`);

  assert.ok(updatedDash.totalScans >= 1, 'Total scans must now reflect real inspections');
  assert.ok(updatedDash.compliantCount >= 1, 'Compliant count must reflect real compliant scan');
  assert.strictEqual(updatedDash.recentScans[0]?.productName, 'Whole Wheat Atta 5 kg');

  // -------------------------------------------------------------------------
  // 7. Verify Official Report Text Download (No Mock Data)
  // -------------------------------------------------------------------------
  console.log('\n[AUDIT 7] Verifying Downloaded Compliance Report Content...');
  const reportRes = await fetch(`${BASE_URL}/scans/${realScan._id}/report?format=txt`);
  assert.strictEqual(reportRes.status, 200);
  const reportText = await reportRes.text();

  assert.ok(reportText.includes('Whole Wheat Atta 5 kg'), 'Report must contain real product name');
  assert.ok(reportText.includes('ITC Limited'), 'Report must contain real manufacturer');
  assert.ok(reportText.includes('₹265'), 'Report must contain real MRP');
  assert.ok(reportText.includes(realScan.inspectionId), 'Report must contain real inspectionId');
  assert.ok(!reportText.includes('Premium Rice'), 'Report must NEVER contain fallback Premium Rice');

  console.log('  ✓ Verified official report text is 100% matched to real inspected commodity.');
  console.log('  ✓ No fake or fallback data found in report.');

  console.log('\n================================================================');
  console.log('       ALL REAL-WORLD AUDIT VERIFICATIONS PASSED (100%)         ');
  console.log('================================================================\n');
}

runAudit().catch(err => {
  console.error('\n❌ AUDIT FAILED:', err);
  process.exit(1);
});
