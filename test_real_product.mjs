import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:5000/api/scans';

// Real product images already in uploads (First Crop Salted Biscuits)
const UPLOADS_DIR = 'backend/uploads';

// From the real uploads found: First Crop Salted Biscuits
const FRONT_IMAGE  = path.join(UPLOADS_DIR, 'scan-1790830502079-888893218.png');   // 201KB - Front with branding
const BACK_IMAGE   = path.join(UPLOADS_DIR, 'scan-1790830526880-829643135.png');   // 153KB - Back with declarations
const TOP_IMAGE    = path.join(UPLOADS_DIR, 'scan-1790830543755-806220171.png');   // 125KB - Ingredients/Nutrition
const BOTTOM_IMAGE = path.join(UPLOADS_DIR, 'scan-1790830558450-404964029.png');   // 32KB  - Side/bottom view

async function testWithRealProduct() {
  console.log('\n================================================================');
  console.log('   LEGALSCAN — REAL PRODUCT TEST: First Crop Salted Biscuits   ');
  console.log('================================================================\n');
  
  // Verify files exist
  for (const [name, f] of [['FRONT', FRONT_IMAGE], ['BACK', BACK_IMAGE], ['TOP', TOP_IMAGE], ['BOTTOM', BOTTOM_IMAGE]]) {
    const stats = fs.statSync(f);
    console.log(`[${name}] File: ${path.basename(f)} | Size: ${(stats.size / 1024).toFixed(1)} KB`);
  }
  
  console.log('\nSubmitting to LegalScan API...\n');
  
  const form = new FormData();
  form.append('front',  fs.createReadStream(FRONT_IMAGE),  { filename: 'front.png',  contentType: 'image/png' });
  form.append('back',   fs.createReadStream(BACK_IMAGE),   { filename: 'back.png',   contentType: 'image/png' });
  form.append('top',    fs.createReadStream(TOP_IMAGE),    { filename: 'top.png',    contentType: 'image/png' });
  form.append('bottom', fs.createReadStream(BOTTOM_IMAGE), { filename: 'bottom.png', contentType: 'image/png' });

  const response = await fetch(API_URL, {
    method: 'POST',
    body: form,
    headers: form.getHeaders()
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    console.error('ERROR:', result.message);
    process.exit(1);
  }

  const d = result.data;
  
  // === OCR PER VIEW ===
  console.log('================================================================');
  console.log('1. OCR RESULTS BY VIEW');
  console.log('================================================================');
  if (d.views && d.views.length > 0) {
    for (const v of d.views) {
      console.log(`\n[${v.viewType.toUpperCase()}]`);
      console.log(`  File: ${v.file}`);
      console.log(`  Quality: ${v.quality.qualityLevel} (Score: ${v.quality.score}/100)`);
      console.log(`  OCR Confidence: ${v.confidence}%`);
      console.log(`  OCR Text (first 400 chars):\n  "${(v.ocr || '').substring(0, 400) || '[No text extracted]'}"`);
    }
  } else {
    console.log('  OCR Front:', d.ocr?.front || '[empty]');
    console.log('  OCR Back:', d.ocr?.back || '[empty]');
    console.log('  OCR Top:', d.ocr?.top || '[empty]');
    console.log('  OCR Bottom:', d.ocr?.bottom || '[empty]');
  }
  
  // === PRODUCT IDENTITY ===
  console.log('\n================================================================');
  console.log('5. PRODUCT IDENTITY & 6. SAME-PRODUCT VERIFICATION');
  console.log('================================================================');
  console.log('  Product Identity Confirmed:', d.productIdentity?.confirmed);
  console.log('  Identity Level:', d.productIdentity?.level);
  console.log('  Identity Confidence:', d.identityConfidence, '%');
  console.log('  Mismatch Detected:', d.productIdentity?.mismatchDetected);
  console.log('  Explanation:', d.productIdentity?.explanation || 'N/A');
  
  // === EXTRACTED INFO ===
  console.log('\n================================================================');
  console.log('7–14. EXTRACTED PRODUCT INFORMATION');
  console.log('================================================================');
  console.log('  7.  Product Category:', d.productCategory || '[NEEDS REVIEW]', '| Confidence:', d.categoryConfidence);
  console.log('  8.  Manufacturer:', d.manufacturer || '[NEEDS REVIEW]');
  console.log('  9.  Address:', d.manufacturerAddress || '[NEEDS REVIEW]');
  console.log('  10. MRP:', d.mrp || '[NEEDS REVIEW]');
  console.log('  11. Net Quantity:', d.netQuantity || '[NEEDS REVIEW]');
  console.log('  12. Batch/Lot No:', d.batchNumber || '[NEEDS REVIEW]');
  console.log('  13a. Manufacturing Date:', d.manufacturingDate || '[NEEDS REVIEW]');
  console.log('  13b. Best Before/Expiry:', d.expiryDate || d.bestBefore || '[NEEDS REVIEW]');
  console.log('  13c. Packer:', d.packer || '[NEEDS REVIEW]');
  console.log('  13d. Importer:', d.importer || '[NEEDS REVIEW]');
  console.log('  13e. Country of Origin:', d.countryOfOrigin || '[NEEDS REVIEW]');
  console.log('  14. Consumer Care:', d.consumerCare || '[NEEDS REVIEW]');
  
  // === OCR COMBINED TEXT ===
  console.log('\n================================================================');
  console.log('COMBINED OCR TEXT (Full)');
  console.log('================================================================');
  console.log(d.combinedText || d.rawExtractedText || '[No text extracted — OCR failed]');
  
  // === RULE EVALUATIONS ===
  console.log('\n================================================================');
  console.log('15–16. COMPLIANCE RULES — EVIDENCE-LINKED EVALUATION');
  console.log('================================================================');
  if (d.ruleEvaluations && d.ruleEvaluations.length > 0) {
    for (const rule of d.ruleEvaluations) {
      const icon = rule.status === 'PASS' ? '✅' : rule.status === 'FAIL' ? '❌' : rule.status === 'WARNING' ? '⚠️' : '🔍';
      console.log(`\n  ${icon} [${rule.ruleId}] ${rule.description || rule.field}`);
      console.log(`     Status: ${rule.status} | Weight: ${rule.weight}pts`);
      console.log(`     Detected: "${rule.detectedValue || 'Not found'}"`);
      console.log(`     Source: ${rule.sourceView || 'N/A'}`);
      if (rule.evidence) console.log(`     Evidence: "${rule.evidence.substring(0, 150)}"`);
    }
  } else {
    console.log('  [NO RULES EVALUATED — Product was not identified as a packaged commodity]');
  }
  
  // === FINAL VERDICT ===
  console.log('\n================================================================');
  console.log('17–20. FINAL COMPLIANCE VERDICT');
  console.log('================================================================');
  console.log('  17. Confidence:', d.ocrConfidence, '%');
  console.log('  18. Status:', d.status);
  console.log('  19. Score:', d.complianceScore, '/ 100');
  console.log('      Passed Rules:', d.passedRules, '| Warnings:', d.warningRules, '| Review:', d.reviewRules, '| Failed:', d.failedRules, '| Total:', d.totalRules);
  console.log('  20. Explanation:');
  if (d.issues && d.issues.length > 0) {
    for (const issue of d.issues) {
      console.log(`      ⚠️  ${issue.title} [${issue.severity}]: ${issue.explanation}`);
    }
  } else {
    console.log('      No issues. Full compliance confirmed.');
  }
  
  // === SMART RETAKES ===
  if (d.smartRetakes && d.smartRetakes.length > 0) {
    console.log('\n  Smart Retake Recommendations:');
    for (const sr of d.smartRetakes) {
      console.log(`    - ${sr.view}: ${sr.reason}`);
    }
  }
  
  console.log('\n================================================================');
  console.log('  Decision Gate:', d.decisionGate?.code, '|', d.decisionGate?.reason || '');
  console.log('  Inspection ID:', d.inspectionId);
  console.log('================================================================\n');
}

testWithRealProduct().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
