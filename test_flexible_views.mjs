
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_URL = 'http://localhost:5000/api/scans';

// Mock images (using a small dummy buffer or existing images if we have them)
// For testing the API structure, we can just send any valid image buffer
const dummyImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const dummyMismatchImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

async function runTest(name, files, expectSuccess) {
  console.log(`\n--- Running Test: ${name} ---`);
  const form = new FormData();
  
  files.forEach(file => {
    form.append(file.fieldname, file.buffer, {
      filename: file.filename,
      contentType: 'image/png'
    });
  });
  
  // Custom product data to simulate mismatch if needed
  form.append('productData', JSON.stringify({}));
  if (name.includes('MISMATCH')) {
    form.append('demoType', 'mismatch'); // Let backend know we're simulating a mismatch for this test
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const data = await response.json();
    
    if (expectSuccess && response.ok) {
      console.log(`✅ Passed: Request succeeded as expected. Status: ${response.status}`);
      if (data.data) {
         console.log(`   Product Name: ${data.data.productName}`);
         console.log(`   Views Analyzed: ${data.data.inspectionCompleteness.viewsCount}`);
         if (name.includes('MISMATCH')) {
            if (data.data.productIdentity && data.data.productIdentity.mismatchDetected) {
               console.log(`✅ Passed: Mismatch detected as expected`);
            } else {
               console.log(`❌ Failed: Mismatch NOT detected`);
            }
         }
      }
    } else if (!expectSuccess && !response.ok) {
      console.log(`✅ Passed: Request failed as expected. Status: ${response.status}`);
      console.log(`   Error message: ${data.message}`);
    } else {
      console.log(`❌ Failed: Expected success=${expectSuccess}, but got status=${response.status}`);
      console.log(data);
    }
  } catch (error) {
    console.error(`❌ Error during test:`, error);
  }
}

async function main() {
  console.log("Starting Flexible Multi-View Capture Tests...");

  // TEST 1: Front + Back only
  await runTest("TEST 1: Front + Back only", [
    { fieldname: 'front', filename: 'front.png', buffer: dummyImageBuffer },
    { fieldname: 'back', filename: 'back.png', buffer: dummyImageBuffer }
  ], true);

  // TEST 2: Front only
  await runTest("TEST 2: Front only", [
    { fieldname: 'front', filename: 'front.png', buffer: dummyImageBuffer }
  ], false);

  // TEST 3: Back only
  await runTest("TEST 3: Back only", [
    { fieldname: 'back', filename: 'back.png', buffer: dummyImageBuffer }
  ], false);

  // TEST 4: Front + Back + Top
  await runTest("TEST 4: Front + Back + Top", [
    { fieldname: 'front', filename: 'front.png', buffer: dummyImageBuffer },
    { fieldname: 'back', filename: 'back.png', buffer: dummyImageBuffer },
    { fieldname: 'top', filename: 'top.png', buffer: dummyImageBuffer }
  ], true);

  // TEST 5: Front + Back + Top + Bottom + Left + Right + Close-ups
  await runTest("TEST 5: Front + Back + Top + Bottom + Left + Right + Close-ups", [
    { fieldname: 'front', filename: 'front.png', buffer: dummyImageBuffer },
    { fieldname: 'back', filename: 'back.png', buffer: dummyImageBuffer },
    { fieldname: 'top', filename: 'top.png', buffer: dummyImageBuffer },
    { fieldname: 'bottom', filename: 'bottom.png', buffer: dummyImageBuffer },
    { fieldname: 'left', filename: 'left.png', buffer: dummyImageBuffer },
    { fieldname: 'right', filename: 'right.png', buffer: dummyImageBuffer },
    { fieldname: 'additional_1', filename: 'close1.png', buffer: dummyImageBuffer },
    { fieldname: 'additional_2', filename: 'close2.png', buffer: dummyImageBuffer }
  ], true);

  // TEST 6: Front + Back + Mismatch
  await runTest("TEST 6: Front + Back + MISMATCH view", [
    { fieldname: 'front', filename: 'front.png', buffer: dummyImageBuffer },
    { fieldname: 'back', filename: 'back.png', buffer: dummyImageBuffer },
    { fieldname: 'additional_1', filename: 'mismatch.png', buffer: dummyMismatchImageBuffer }
  ], true); // The API request itself succeeds, but returns product mismatch in payload
  
  console.log("\nFinished tests.");
}

main();
