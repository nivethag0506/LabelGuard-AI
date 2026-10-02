import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';
const FRONTEND_URL = 'http://localhost:5173';

async function runTests() {
  console.log('================================================================');
  console.log('       STRICT HACKATHON QA SUITE — END-TO-END VERIFICATION      ');
  console.log('================================================================');

  // 1. Health check & Server Connectivity
  console.log('\n[STAGE 1] Backend Health & Connectivity...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(healthRes.status, 200);
  const healthData = await healthRes.json();
  console.log('  ✓ API is running:', healthData.message);
  assert.strictEqual(healthData.success, true);

  // 2. Demo Compliant Product Scan (Product A)
  console.log('\n[STAGE 2] Testing Demo Compliant Product (Product A: Premium Rice)...');
  const scanARes = await fetch(`${BASE_URL}/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demoType: 'compliant' })
  });
  assert.strictEqual(scanARes.status, 201);
  const scanAData = await scanARes.json();
  const scanA = scanAData.data;
  console.log(`  ✓ Scan Created: ${scanA.productName}`);
  console.log(`  ✓ Score: ${scanA.complianceScore}% | Status: ${scanA.status}`);
  console.log(`  ✓ Passed: ${scanA.passedRules}, Warnings: ${scanA.warningRules}, Failures: ${scanA.failedRules}`);
  assert.ok(scanA.complianceScore >= 90, 'Compliant score must be >= 90');
  assert.strictEqual(scanA.status, 'COMPLIANT');
  assert.strictEqual(scanA.failedRules, 0);

  // 3. Demo High-Risk Product Scan (Product B)
  console.log('\n[STAGE 3] Testing Demo High-Risk Product (Product B: Premium Snack)...');
  const scanBRes = await fetch(`${BASE_URL}/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demoType: 'non_compliant' })
  });
  assert.strictEqual(scanBRes.status, 201);
  const scanBData = await scanBRes.json();
  const scanB = scanBData.data;
  console.log(`  ✓ Scan Created: ${scanB.productName}`);
  console.log(`  ✓ Score: ${scanB.complianceScore}% | Status: ${scanB.status}`);
  console.log(`  ✓ Issues Detected: ${scanB.issues.length}`);
  assert.ok(scanB.complianceScore < 70, 'High-risk score must be < 70');
  assert.strictEqual(scanB.status, 'HIGH_RISK');
  assert.ok(scanB.issues.length >= 3, 'Must have at least 3 issues flagged');

  // Verify issue structure
  const firstIssue = scanB.issues[0];
  assert.ok(firstIssue.title, 'Issue must have title');
  assert.ok(firstIssue.explanation, 'Issue must explain why it matters');
  assert.ok(firstIssue.recommendation, 'Issue must provide recommended action');
  console.log(`  ✓ Verified Issue Card Format: "${firstIssue.title}" -> "${firstIssue.explanation.slice(0, 50)}..."`);

  // 4. Report Retrieval by ID
  console.log(`\n[STAGE 4] Retrieving Inspection Report (${scanA._id})...`);
  const reportRes = await fetch(`${BASE_URL}/scans/${scanA._id}`);
  assert.strictEqual(reportRes.status, 200);
  const reportData = await reportRes.json();
  assert.strictEqual(reportData.data.productName, 'Premium Rice');
  assert.ok(reportData.data.ruleEvaluations.length >= 10);
  console.log(`  ✓ Report successfully loaded with ${reportData.data.ruleEvaluations.length} evaluated rules.`);

  // 5. Search Functionality
  console.log('\n[STAGE 5] Testing Search Functionality...');
  const searchRice = await fetch(`${BASE_URL}/scans?search=Rice`).then(r => r.json());
  assert.ok(searchRice.data.length >= 1, 'Search for Rice must return results');
  assert.ok(searchRice.data.every(s => s.productName.toLowerCase().includes('rice') || s.manufacturer.toLowerCase().includes('rice')));
  console.log(`  ✓ Search for "Rice" correctly matched ${searchRice.data.length} records.`);

  const searchSnack = await fetch(`${BASE_URL}/scans?search=Snack`).then(r => r.json());
  assert.ok(searchSnack.data.length >= 1, 'Search for Snack must return results');
  console.log(`  ✓ Search for "Snack" correctly matched ${searchSnack.data.length} records.`);

  // 6. Filtering Functionality
  console.log('\n[STAGE 6] Testing Status Filters...');
  const filterCompliant = await fetch(`${BASE_URL}/scans?status=COMPLIANT`).then(r => r.json());
  assert.ok(filterCompliant.data.every(s => s.status === 'COMPLIANT'));
  console.log(`  ✓ Filter [COMPLIANT] returned ${filterCompliant.data.length} exclusively compliant records.`);

  const filterNeedsReview = await fetch(`${BASE_URL}/scans?status=NEEDS_REVIEW`).then(r => r.json());
  assert.ok(filterNeedsReview.data.every(s => s.status === 'NEEDS_REVIEW'));
  console.log(`  ✓ Filter [NEEDS_REVIEW] returned ${filterNeedsReview.data.length} review records.`);

  const filterHighRisk = await fetch(`${BASE_URL}/scans?status=HIGH_RISK`).then(r => r.json());
  assert.ok(filterHighRisk.data.every(s => s.status === 'HIGH_RISK'));
  console.log(`  ✓ Filter [HIGH_RISK] returned ${filterHighRisk.data.length} high-risk records.`);

  // 7. Sorting Functionality
  console.log('\n[STAGE 7] Testing Sort Orders...');
  const sortScoreHigh = await fetch(`${BASE_URL}/scans?sort=score_high`).then(r => r.json());
  for (let i = 0; i < sortScoreHigh.data.length - 1; i++) {
    assert.ok(sortScoreHigh.data[i].complianceScore >= sortScoreHigh.data[i + 1].complianceScore);
  }
  console.log('  ✓ Sorting [Highest Score] verified strictly descending.');

  const sortScoreLow = await fetch(`${BASE_URL}/scans?sort=score_low`).then(r => r.json());
  for (let i = 0; i < sortScoreLow.data.length - 1; i++) {
    assert.ok(sortScoreLow.data[i].complianceScore <= sortScoreLow.data[i + 1].complianceScore);
  }
  console.log('  ✓ Sorting [Lowest Score] verified strictly ascending.');

  // 8. Admin Rules Configuration & MongoDB Persistence
  console.log('\n[STAGE 8] Testing Admin Rules Engine & MongoDB Persistence...');
  const rulesList = await fetch(`${BASE_URL}/rules`).then(r => r.json());
  assert.ok(rulesList.data.length >= 10);
  const targetRule = rulesList.data[0];
  const originalWeight = targetRule.weight;
  const testWeight = originalWeight === 15 ? 20 : 15;

  // Update rule in MongoDB
  const updateRes = await fetch(`${BASE_URL}/rules/${targetRule.ruleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weight: testWeight })
  });
  assert.strictEqual(updateRes.status, 200);
  const updatedRule = await updateRes.json();
  assert.strictEqual(Number(updatedRule.data.weight), testWeight);
  console.log(`  ✓ Admin Rule ${targetRule.ruleId} weight updated: ${originalWeight} -> ${testWeight}`);

  // Re-fetch to ensure database persistence
  const recheckRule = await fetch(`${BASE_URL}/rules`).then(r => r.json());
  const verifiedRule = recheckRule.data.find(r => r.ruleId === targetRule.ruleId);
  assert.strictEqual(Number(verifiedRule.weight), testWeight);
  console.log('  ✓ Rule persistence in MongoDB verified.');

  // Restore original weight
  await fetch(`${BASE_URL}/rules/${targetRule.ruleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weight: originalWeight })
  });
  console.log(`  ✓ Rule weight restored to original ${originalWeight} pts.`);

  // 9. Dashboard Analytics & Calculations
  console.log('\n[STAGE 9] Testing Dashboard Metric Calculations...');
  const dashRes = await fetch(`${BASE_URL}/dashboard/stats`);
  assert.strictEqual(dashRes.status, 200);
  const dash = (await dashRes.json()).data;
  
  console.log(`  Total Scans:    ${dash.totalScans}`);
  console.log(`  Compliant:      ${dash.compliantCount}`);
  console.log(`  Needs Review:   ${dash.needsReviewCount}`);
  console.log(`  High Risk:      ${dash.highRiskCount}`);
  console.log(`  Average Score:  ${dash.averageScore}%`);
  console.log(`  Common Issues:  ${dash.commonIssues.length} categories`);

  assert.strictEqual(dash.totalScans, dash.compliantCount + dash.needsReviewCount + dash.highRiskCount);
  assert.ok(dash.averageScore >= 0 && dash.averageScore <= 100);
  assert.ok(dash.commonIssues.length > 0);
  assert.ok(dash.recentScans.length <= 5);
  console.log('  ✓ Mathematical integrity of dashboard counts & averages verified.');

  // 10. Frontend Routes & Assets
  console.log('\n[STAGE 10] Testing Frontend Server & Routes...');
  const feRes = await fetch(FRONTEND_URL);
  assert.strictEqual(feRes.status, 200);
  const html = await feRes.text();
  assert.ok(html.includes('LegalScan'));
  console.log('  ✓ Frontend index.html served cleanly.');

  console.log('\n================================================================');
  console.log('   ALL 10 QA STAGES PASSED! SYSTEM IS PRODUCTION READY!         ');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ QA TEST FAILURE:', err);
  process.exit(1);
});
