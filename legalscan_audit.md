# LegalScan — Complete Implementation Status Audit
> Inspected: 2026-10-02 | DO NOT MODIFY ANY CODE BASED ON THIS DOCUMENT ALONE

---

## 1. PROJECT OVERVIEW

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 18 + Vite (JSX, React Router v6) |
| **Styling** | Vanilla CSS (per-component `.css` files) |
| **Backend Framework** | Node.js + Express (ESM `import/export`) |
| **Database** | MongoDB via Mongoose — local `127.0.0.1:27017/legalscan` |
| **OCR Technology** | **Tesseract.js v7** (client-side English OCR, `eng.traineddata` bundled) |
| **Image Preprocessing** | **Sharp** — 2-pass multi-channel preprocessing before OCR |
| **AI / Vision Model** | ❌ None. No external AI/Vision API (no Gemini, no GPT-Vision, no Google Vision) |
| **PDF Generation** | **jsPDF + jspdf-autotable** — runs entirely in the browser (frontend) |
| **Authentication** | ❌ Not implemented. No login, sessions, or JWT. |
| **File Storage** | Local disk — `backend/uploads/` via Multer. No cloud storage. |
| **APIs Used** | Only internal REST API (`/api/scans`, `/api/dashboard`, `/api/rules`, `/api/demo`) |
| **Deployment** | ❌ Not deployed. Only local (`localhost:5000` + `localhost:5173`) |

---

## 2. FEATURE CHECKLIST

| Feature | Status | File / Component |
|---------|--------|-----------------|
| Product image upload | ✅ Fully working | `MobileInspectionWizard.jsx`, `uploadMiddleware.js` |
| Front image (required) | ✅ Fully working | `scanController.js` L413-425 |
| Back image (required) | ✅ Fully working | `scanController.js` L426-430 |
| Top image (optional) | ✅ Working | `MobileInspectionWizard.jsx`, `scanController.js` |
| Bottom image (optional) | ✅ Working | `MobileInspectionWizard.jsx`, `scanController.js` |
| Additional image upload | ✅ Working (unlimited) | `MobileInspectionWizard.jsx` — `additionalViews` array |
| Camera capture | ✅ Working | `triggerCameraCapture()` — uses `<input capture="environment">` |
| Live photo | ✅ Working | `livePhotos` state in wizard |
| Video upload | ✅ Working (struct only) | `videoFile`, `videoFrameFiles` in controller. **No frame extraction logic.** |
| Image preview | ✅ Fully working | `URL.createObjectURL()` in wizard |
| Image replacement | ✅ Working | Supported via re-upload to same slot |
| Image deletion | ✅ Working | `additionalViews` management in wizard |
| Image quality checking | ✅ Fully working | `imageQualityService.js` — resolution, brightness, glare, blur checks via Sharp |
| Product validation | ✅ Working | `productIdentityService.js` — packaging hallmark detection |
| Same-product verification | 🟡 Partially working | `productIdentityService.js` — keyword/brand-based, not visual AI |
| OCR | ✅ Fully working | `ocrService.js` — Tesseract.js 2-pass multi-channel OCR |
| Multi-image OCR | ✅ Fully working | `extractMultiViewText()` — runs OCR per view, combines results |
| Product identification | 🟡 Partial | Keyword matching from OCR, no visual model |
| Product category detection | 🟡 Partial | Keyword-based heuristics in `extractionService.js` |
| Field extraction | ✅ Working | `extractionService.js` — regex + normalization for 13 fields |
| Manufacturer detection | ✅ Working | Regex in `extractionService.js` |
| Packer detection | ✅ Working | Regex in `extractionService.js` |
| Importer detection | ✅ Working | Regex in `extractionService.js` |
| Address detection | 🟡 Partial | Regex-based, PIN code check |
| MRP detection | ✅ Working | Regex + OCR character correction (`O→0`, `I→1`, etc.) |
| Net quantity detection | ✅ Working | Regex with unit normalization |
| Batch/lot detection | ✅ Working | Regex in `extractionService.js` |
| Manufacturing/packing date | ✅ Working | Date regex in `extractionService.js` |
| Best before/expiry | ✅ Working | Regex in `extractionService.js` |
| Consumer care details | ✅ Working | Phone/email/toll-free regex |
| Country of origin | ✅ Working | Regex in `extractionService.js` |
| Cross-view consistency | ✅ Working | `extractMultiViewStructuredFields()` — detects inconsistent values across views |
| Legal Metrology rule engine | ✅ Fully working | `complianceEngine.js` — 10 LMR rules, 5 states |
| Rule applicability | ✅ Working | `bestBefore` → `NOT_APPLICABLE` for non-perishables |
| Evidence-based checking | ✅ Working | Each rule reports `detectedValue`, `sourceView`, `sourceText`, `evidence` |
| Confidence calculation | ✅ Working | Per-field confidence from extraction service |
| Compliance score | ✅ Working | Weighted formula: PASS=100%, WARNING=50%, NEEDS_REVIEW=70%, FAIL=0% |
| Final compliance status | ✅ Working | Dynamic: COMPLIANT / NEEDS_REVIEW / HIGH_RISK / PRODUCT_MISMATCH |
| Recommendations | ✅ Working | Per-issue `recommendation` + `smartRetakes` |
| Smart retake | ✅ Working | Suggested if MRP/address/quantity not detected |
| MongoDB storage | ✅ Working | Full `Scan` schema with 35+ fields |
| Inspection history | ✅ Working | `HistoryPage.jsx` + `GET /api/scans` |
| Dashboard | ✅ Working | `DashboardPage.jsx` + `dashboardController.js` — real data from MongoDB |
| Analytics | 🟡 Partial | Score trends, category distribution — real data but limited depth |
| PDF report | ✅ Fully working | `reportPdfService.js` — 5-page professional PDF via jsPDF |
| Mobile responsiveness | ✅ Working | `MobileInspectionWizard.jsx` + per-page CSS |
| Deployment | 🔴 Not done | Local only |
| Error handling | ✅ Working | Try/catch, 400/500 responses, fallback to in-memory |

---

## 3. IMAGE WORKFLOW — DETAILED ANSWERS

| Question | Answer |
|----------|--------|
| **Are Front and Back compulsory?** | ✅ YES. Both are enforced in `scanController.js` L413-430. Missing either = HTTP 400. |
| **Is exactly 4 images currently required?** | ❌ NO. Only Front + Back are required. Top/Bottom are optional. |
| **Can user upload additional views?** | ✅ YES. Unlimited via `additionalViews` array in `MobileInspectionWizard.jsx`. |
| **Can user upload unlimited/useful additional views?** | ✅ YES. Named views: TOP, BOTTOM, LEFT, RIGHT, CLOSEUP_MRP, CLOSEUP_LABEL, CLOSEUP_MFG, CLOSEUP_BARCODE, OTHER. |
| **Can user capture using camera?** | ✅ YES. `<input type="file" capture="environment">` — standard mobile camera capture. |
| **Can user upload video?** | 🟡 YES (file upload works), but NO frame extraction. Video file is saved but individual frames are NOT extracted or OCR'd. Only `videoFrameFiles` (separate image uploads) are processed. |
| **Are uploaded images actually sent to the backend?** | ✅ YES. FormData multipart upload via `fetch()` to `POST /api/scans`. |
| **Are actual uploaded images sent to OCR?** | ✅ YES. Each file's `.path` from Multer disk storage is passed to Tesseract via Sharp preprocessing. |
| **Are any sample images used automatically?** | ❌ NO. Real inspection = real files only. Demo mode uses hardcoded text, not sample images. |
| **Is the rice image still hardcoded anywhere in the real flow?** | ❌ NO rice image is used in the real scan flow. It appears only in: (1) `DEMO_PRODUCTS.compliant` in `ocrService.js` as a demo Unsplash URL, (2) `SEED_SCANS` in `seedDatabase.js`. Both are only triggered explicitly. |

---

## 4. REAL DATA vs MOCK DATA — COMPLETE AUDIT

### Where Mock/Demo Data Exists

| Location | What It Is | When Triggered |
|----------|-----------|----------------|
| `ocrService.js` → `DEMO_PRODUCTS.compliant` | "Premium Rice" — ABC Foods — hardcoded OCR text + Unsplash URL | Only when `demoType === 'compliant'` is passed explicitly (no files) |
| `ocrService.js` → `DEMO_PRODUCTS.non_compliant` | "Premium Snack" — XYZ Foods — hardcoded OCR text | Only when `demoType === 'non_compliant'` is passed explicitly (no files) |
| `seedDatabase.js` → `SEED_SCANS` | 8 hardcoded scan records (Rice, Atta, Ghee, Chips, Chilli, Juice, Snack, Wafer) | Only if `npm run seed` is explicitly run |
| `ScanPage.jsx` L263 | UI label "Demo Product A: Premium Rice" | Only in Demo tab |
| `scanController.js` L17 | `inMemoryScans = []` | Only when MongoDB is disconnected |

### Is Rice Hardcoded?
- **In demo mode:** YES — `DEMO_PRODUCTS.compliant.productName = 'Premium Rice'` with an Unsplash rice photo URL.
- **In real scan flow:** ❌ NO. Real image upload uses actual Tesseract OCR on actual uploaded files.
- **In seed data:** YES — `SEED_SCANS[0].productName = 'Premium Rice'` in `seedDatabase.js`.

### Sample OCR
- ❌ No sample OCR is auto-injected into real scan flow.
- DEMO_PRODUCTS has hardcoded `rawExtractedText` strings but these are only used when `demoType` is set explicitly.

### Hardcoded / Random Scores
- ❌ NO random scores. Score is calculated deterministically via weighted formula in `complianceEngine.js`.
- ⚠️ **ONE issue:** In demo data blocks (`scanController.js` lines ~114-119), image quality scores are hardcoded: `{ isAcceptable: true, qualityLevel: 'GOOD', score: 98 }`. This is only for demo mode.

### Dashboard Statistics
- ✅ **REAL.** Dashboard aggregates actual MongoDB records dynamically. No fake totals.
- ⚠️ If MongoDB is empty (no scans run yet), dashboard shows all zeros.

### History Records
- ✅ **REAL.** `GET /api/scans` reads from MongoDB.
- ⚠️ If `npm run seed` was never run, history is empty until real scans are done.
- ✅ The seed script's scan records are **not automatically inserted** — requires explicit `npm run seed`.

### PDF Data
- ✅ **REAL.** PDF uses the actual `scan` object passed from MongoDB — real OCR text, real rule evaluations, real score, real field values.

---

## 5. ACTUAL ANALYSIS PIPELINE

```
USER CLICKS "ANALYZE" (Field Inspection mode, with real images)
│
├── [FRONTEND] ScanPage.jsx → handleMultiViewSubmit()
│   └── Calls api.createScan({ views, additionalViews, livePhotos, videoFrames })
│
├── [FRONTEND API] services/api.js → createScan()
│   └── Builds FormData: appends front, back, top, bottom, additional_1..N, livePhotos, videoFrames
│   └── POST /api/scans with multipart/form-data
│
├── [BACKEND ROUTE] routes/scanRoutes.js
│   └── upload.any() middleware (Multer) → saves files to backend/uploads/
│   └── → scanController.createScan()
│
├── [SCAN CONTROLLER] controllers/scanController.js → createScan()
│   │
│   ├── [VALIDATION] Enforce Front + Back both present → 400 if missing
│   │
│   ├── [STEP 3.1] imageQualityService.checkImageQuality(filePath) per view
│   │   └── Sharp: resolution/brightness/glare/blur → returns isAcceptable, score, reasons
│   │
│   ├── [STEP 3.2] ocrService.extractMultiViewText(viewsMap)
│   │   └── Per view: Sharp 2-pass preprocessing (Pass1: RGB, Pass2: green channel)
│   │   └── Tesseract.recognize(preprocessed_image) × 2 passes
│   │   └── Deduplicate + combine lines → cleanOcrText()
│   │   └── Returns: ocrByView, combinedCleanedText, averageConfidence
│   │
│   ├── [STEP 3.3] productIdentityService.verifyProductIdentity(ocrByView)
│   │   └── Extracts brand, commodity, barcode, qty, hallmarks from each view's OCR
│   │   └── Gate 1: isPackagedProduct? (needs ≥2 hallmarks OR brand/commodity OR barcode)
│   │   └── Gate 2: mismatchDetected? (conflicting brands/commodities across views)
│   │   └── Returns: confirmed, identityConfidence, mismatchDetected, suspiciousView
│   │
│   ├── [GATE 1] If NOT a packaged product → return NEEDS_REVIEW (score=0), save to MongoDB
│   ├── [GATE 2] If PRODUCT_MISMATCH detected → return PRODUCT_MISMATCH (score=0), save to MongoDB
│   ├── [GATE 3] If identityConfidence < 40 → return NEEDS_REVIEW (score=0), save to MongoDB
│   │
│   ├── [STEP 3.4] extractionService.extractMultiViewStructuredFields(ocrByView)
│   │   └── Runs field extraction per view, then merges highest-confidence values
│   │   └── Detects cross-view inconsistencies (e.g. MRP differs between views)
│   │   └── Returns: extractedFields (13 fields with value, confidence, sourceView, sourceText)
│   │
│   ├── [STEP 3.5] complianceEngine.evaluateCompliance(productData + extractedFields)
│   │   └── Loads rules from MongoDB (or DEFAULT_RULES if DB not connected)
│   │   └── Per rule: determines PASS / WARNING / NEEDS_REVIEW / FAIL / NOT_APPLICABLE
│   │   └── Weighted score calculation
│   │   └── Dynamic overall status: COMPLIANT / NEEDS_REVIEW / HIGH_RISK / PRODUCT_MISMATCH
│   │
│   ├── [SAVE] Scan saved to MongoDB (or inMemoryScans if DB unavailable)
│   │
│   └── Returns full scan object with: inspectionId, extractedFields, ruleEvaluations, issues, score, status
│
├── [FRONTEND] ScanPage navigates to /result/:id
│
├── [FRONTEND] ResultPage.jsx → api.getScanById(id) → fetches full scan from MongoDB
│
└── [PDF] User clicks Download → reportPdfService.generateInspectionPdf(scan)
    └── Reads real scan data: score, status, extractedFields, ruleEvaluations, issues, views
    └── jsPDF builds 5-page A4 PDF entirely in browser → downloads
```

---

## 6. PREDICTION LOGIC

| Question | Answer |
|----------|--------|
| Is it AI-generated? | ❌ No. No external AI/Vision model. |
| Is it rule-based? | ✅ YES. 10 Legal Metrology rules from `complianceEngine.js`. |
| Is it hardcoded? | ❌ No random/hardcoded predictions. Score is calculated. |
| Is it based on OCR? | ✅ YES. All field values come from Tesseract OCR on uploaded images. |
| Is it based on actual uploaded images? | ✅ YES (via OCR text extracted from them). |
| Is it based on product category? | 🟡 Partially. `bestBefore` is `NOT_APPLICABLE` for non-perishables. Category detection is keyword-based. |
| Is it based on Legal Metrology rules? | ✅ YES. LMR 2011 (amended 2022), Rules 6, 12. |
| Is it based on a fixed checklist? | ✅ YES. 10 fixed rules: LMR-01 to LMR-10. |
| Is the score dynamically calculated? | ✅ YES. `earnedWeight / totalPossibleWeight × 100` |
| Can the system produce a result without evidence? | ✅ YES — if OCR finds nothing, all rules get `NEEDS_REVIEW` (not FAIL). System will still produce a score. |

### Status Determination Logic:
```
isPackagedProduct === false      → NEEDS_REVIEW (score=0)
mismatchDetected === true        → PRODUCT_MISMATCH (score=0)
inconsistencies found            → NEEDS_REVIEW
ocrConfidence < 25               → NEEDS_REVIEW
failedCount > 0                  → HIGH_RISK
warningCount > 0 || reviewCount > 0 || score < 85 → NEEDS_REVIEW
otherwise                        → COMPLIANT
```

---

## 7. OCR AUDIT

| Question | Answer |
|----------|--------|
| **OCR technology** | Tesseract.js v7 — English (`eng`) only |
| **OCR actually running?** | ✅ YES — confirmed by `eng.traineddata` in backend folder |
| **OCR performed on every uploaded view?** | ✅ YES — `extractMultiViewText()` loops all views |
| **OCR combined across views?** | ✅ YES — combined with `[VIEW: name]` section headers, deduped |
| **Raw OCR stored in MongoDB?** | ✅ YES — `rawExtractedText`, `cleanedExtractedText`, per-view `ocr.front/.back/.top/.bottom` |
| **Structured data stored?** | ✅ YES — `extractedFields` (Mixed type in Scan schema) |
| **OCR confidence available?** | ✅ YES — `ocrConfidence` (average), per-view `confidence`, per-field `confidence` |
| **Can identify which image a field came from?** | ✅ YES — `sourceView` per field (e.g. `"BACK"`, `"FRONT"`) |
| **What happens when OCR fails?** | Returns `{ rawText: '', confidence: 0 }` — silently continues without crashing |

### OCR Multi-pass Preprocessing:
- **Pass 1:** Upscale (2x, max 2200px wide) → normalize → sharpen (RGB) → PNG → Tesseract
- **Pass 2:** Same upscale → extract green channel → normalize → sharpen → PNG → Tesseract
- Both results merged, deduplicated by line, then `cleanOcrText()` applied.

---

## 8. SAME-PRODUCT VERIFICATION

**Status: 🟡 PARTIALLY IMPLEMENTED — Text-based, not visual AI**

The system verifies same-product identity via `productIdentityService.verifyProductIdentity()`:

**Method:**
1. For each view's OCR text, extract: known brand names (32 brands in list), commodity types (24 types), Indian barcode (EAN-13, starts with 890), net quantity, packaging hallmarks (30+ keywords)
2. If multiple different brands are detected across views → `mismatchDetected = true`
3. If incompatible commodity types are detected across views → `mismatchDetected = true`
4. If no packaging hallmarks/brand/barcode found → `isPackagedProduct = false`

**What it CANNOT do:**
- It cannot visually verify that two images show the same physical product (requires Vision AI/embedding)
- It can be fooled if two different products share the same brand (e.g., both are Britannia products)
- Products with very few packaging keywords may pass or fail incorrectly

---

## 9. LEGAL METROLOGY COMPLIANCE ENGINE

| Aspect | Details |
|--------|---------|
| **Rules stored** | Hardcoded in `complianceEngine.js` → `DEFAULT_RULES` array (10 rules). Also replicated to MongoDB via `seedDatabase.js`. |
| **How rules are selected** | All active rules from MongoDB. Falls back to `DEFAULT_RULES` if DB not connected. |
| **Applicability** | `LMR-08` (bestBefore) → `NOT_APPLICABLE` for non-perishable, non-food products |
| **Rule evaluation** | Per-rule: resolves `extractedFields[rule.field]`, determines PASS/WARNING/NEEDS_REVIEW/FAIL based on value presence + confidence + format validation |
| **Evidence attached** | `detectedValue`, `sourceView`, `sourceText`, `evidence` per rule evaluation |
| **Rule source/version** | "Legal Metrology (Packaged Commodities) Rules, 2011 (Amended up to 2022)" |
| **Are rules hardcoded?** | ✅ YES — in `DEFAULT_RULES` in code. But also seedable to MongoDB for DB-driven updates. |
| **Can rules be updated?** | ✅ YES — via `AdminRulesPage.jsx` → `PUT /api/rules/:id`. Edits stored in MongoDB. |
| **NOT_APPLICABLE exists?** | ✅ YES — used for `bestBefore` on non-perishables |
| **NEEDS_REVIEW exists?** | ✅ YES — used when field is not confidently detected (avoids false FAILs) |

---

## 10. MONGODB AUDIT

**Database:** `legalscan`

**Collections:**
- `scans` — Main inspection records
- `compliancerules` — LMR rules (seeded)
- `users` — Placeholder users (seeded, not used)

**Scan document key fields:**
```
inspectionId, productName, brand, productCategory, categoryConfidence
manufacturer, manufacturerAddress, packer, importer
netQuantity, mrp, batchNumber, manufacturingDate, bestBefore, expiryDate
countryOfOrigin, consumerCare
images: { front, back, top, bottom, left, right, additionalViews[], livePhotos[] }
views: [{ viewId, viewType, file, url, source, timestamp, quality, ocr, confidence }]
imageQuality: { FRONT: { isAcceptable, qualityLevel, score, reasons }, BACK: ... }
video: { url, analyzed, sampledFrames[], frameCount }
productIdentity: { confirmed, level, confidence, mismatchDetected, suspiciousView }
ocr: { front, back, top, bottom, live, video }
combinedText, rawExtractedText, cleanedExtractedText, ocrConfidence
extractedFields: { [fieldName]: { value, confidence, sourceView, sourceText } }
complianceScore, status, passedRules, warningRules, reviewRules, failedRules, totalRules
ruleEvaluations: [{ ruleId, label, status, confidence, detectedValue, sourceView, evidence, explanation }]
issues: [{ ruleId, field, title, severity, status, confidence, recommendation }]
smartRetakes: [{ view, reason }]
inspectionCompleteness: { viewsCount, hasFront, hasBack, hasTop, hasBottom, ... percentage }
createdAt, updatedAt (timestamps)
```

**Sample/demo records in MongoDB?**
- ❌ Not automatically. Only if `npm run seed` is explicitly run.
- The seed script **deletes all scans** (`Scan.deleteMany({})`) and inserts only compliance rules + users.
- The 8 SEED_SCANS in `seedDatabase.js` are **defined but NOT inserted** into the DB by the seed script.

---

## 11. PDF AUDIT

**Generator:** `reportPdfService.js` — jsPDF + jspdf-autotable, runs in browser (no backend PDF generation)

**PDF Contents:**
| Page | Content | Real or Sample? |
|------|---------|-----------------|
| Page 1 | Cover: Status badge, score, product name, brand, MRP, rule tally (PASS/WARNING/REVIEW/FAIL), methodology notice | ✅ Real |
| Page 2 | View completeness (Front/Back/Top/Bottom), product identity verification, view gallery attestation | ✅ Real |
| Page 3 | Product & manufacturing details table (13 fields, source view, confidence, status) | ✅ Real |
| Page 4 | Legal Metrology rules table (rule-by-rule: status, evidence, source, confidence, remarks) | ✅ Real |
| Page 5 | Score breakdown, identified issues (up to 4), smart retake recommendations | ✅ Real |

**Is any PDF content hardcoded/sample?** — ❌ No. PDF pulls from the actual `scan` object stored in MongoDB.

**⚠️ One limitation:** Actual product images are NOT embedded in the PDF (only text references to views). The `imageUrl` fields exist in the scan data but are not rendered into the PDF with `<img>`.

---

## 12. MOBILE AUDIT

| Aspect | Status |
|--------|--------|
| Responsive layout | ✅ CSS with media queries across all pages |
| Camera capture | ✅ `<input capture="environment">` — works on Android/iOS browsers |
| File upload | ✅ Works |
| Buttons | ✅ All accessible |
| Navigation | ✅ Navbar included |
| Result screen | ✅ ResultPage has responsive CSS |
| Dashboard | ✅ DashboardPage has responsive CSS |
| History | ✅ HistoryPage has responsive CSS |
| PDF download | ✅ jsPDF `.save()` works on mobile |
| Horizontal scrolling | Could not verify without running |
| Overflow issues | Could not verify without running |
| Broken components | Could not verify without running |

---

## 13. DEPLOYMENT AUDIT

| Question | Answer |
|----------|--------|
| Frontend deployed? | ❌ No — localhost:5173 only |
| Backend deployed? | ❌ No — localhost:5000 only |
| Deployment platform configured? | ❌ No Vercel/Render/Railway/Netlify config found |
| MongoDB Atlas configured? | ❌ No — `.env` uses `mongodb://127.0.0.1:27017/legalscan` (local) |
| Environment variables configured? | ⚠️ Partial — `.env` files exist locally but not for production |
| API keys exposed in frontend? | ✅ No API keys in frontend at all |
| CORS configured? | ✅ `origin: true` (allows all origins) |
| Uploaded files in production? | ❌ Not applicable — not deployed |
| API URL | Backend `.env` has `CLIENT_URL`, frontend reads `VITE_API_URL` (defaults to `/api` if not set) |

---

## 14. BUGS & RISKS

### 🔴 CRITICAL — Must fix before hackathon

| # | Issue |
|---|-------|
| C1 | **No deployment.** App only runs locally. For a hackathon demo, judges can't access it. |
| C2 | **No external Vision/AI API.** OCR is Tesseract.js only. For real-world packaged products with complex labels, Tesseract often fails or produces garbled text → most fields show "Not Detected" → result is always `NEEDS_REVIEW`. |
| C3 | **Same-product verification is text-only.** Only works if products have known brand keywords or packaging hallmarks in OCR. Many real products will have `isPackagedProduct: false` even if a valid product was uploaded (if OCR quality is poor). |
| C4 | **Video frame extraction not implemented.** Video file is saved but never split into frames for OCR. Passing `video` without `videoFrames` produces no useful analysis. |
| C5 | **MongoDB is local only.** If MongoDB service is not running, system falls back to in-memory (lost on server restart). No persistence in production. |

### 🟠 HIGH — Should fix

| # | Issue |
|---|-------|
| H1 | **PDF does not embed actual product images.** Views are referenced by URL/text but not rendered as images inside the PDF. |
| H2 | **`SEED_SCANS` are defined in `seedDatabase.js` but the seed script does NOT insert them** (`Scan.deleteMany({})` only clears). History page will be empty until real scans are done. |
| H3 | **No deployment config.** No `vercel.json`, `railway.toml`, or `Procfile` exists. |
| H4 | **Tesseract OCR accuracy is limited** on real-world photos (glare, shadows, curved labels, small fonts). Fields may frequently be "Not Detected" even when physically present. |
| H5 | **`productName` defaults to `'Packaged Commodity'`** when OCR doesn't detect it — misleading in reports. |

### 🟡 MEDIUM — Can fix if time permits

| # | Issue |
|---|-------|
| M1 | **In-memory fallback for MongoDB** (`inMemoryScans`) is lost on server restart. All history disappears without MongoDB. |
| M2 | **Demo tab is visible** on ScanPage with banner saying "NOT A REAL INSPECTION" — good warning but could confuse judges. |
| M3 | **Country of origin defaults to 'India' in PDF** even when not detected (line 499 `|| 'India'`). |
| M4 | **`isManualAudit` flag used to decide FAIL vs NEEDS_REVIEW** — could cause false `FAIL` in some edge cases. |
| M5 | **No pagination on history page.** If many scans exist, all are fetched. |

### 🟢 LOW — Optional

| # | Issue |
|---|-------|
| L1 | No authentication — anyone can see all scan history |
| L2 | Admin rules page has no auth protection |
| L3 | `User.js` model exists but is never used in auth flows |

---

## 15. CURRENT CAPABILITY TABLE

| Capability | Current Status |
|-----------|----------------|
| Real product upload | ✅ Working |
| Front required | ✅ Enforced |
| Back required | ✅ Enforced |
| Additional views | ✅ Unlimited, named |
| Camera | ✅ Working (browser input capture) |
| Video | 🟡 File upload only, NO frame OCR |
| OCR | ✅ Tesseract.js, 2-pass, real |
| Multi-view OCR | ✅ Per-view + combined |
| Same-product verification | 🟡 Text/keyword-based (not visual AI) |
| Product detection | 🟡 Keyword-based from OCR |
| Rule engine | ✅ 10 LMR rules, weighted scoring |
| Evidence-based result | ✅ sourceView, sourceText, confidence per rule |
| Real MongoDB data | ✅ When MongoDB is running |
| Real PDF | ✅ 5-page, all real data |
| Mobile responsive | ✅ CSS-based |
| Deployment | ❌ Not deployed |

---

## 16. FINAL ASSESSMENT

### A. WHAT IS FULLY WORKING
- Multi-view image upload (Front, Back, Top, Bottom, additional, live, video file)
- Image quality pre-check (resolution, blur, brightness, glare) via Sharp
- Real Tesseract.js OCR on actual uploaded images with 2-pass preprocessing
- 13-field extraction with regex, normalization, OCR character correction
- Legal Metrology compliance engine (10 rules, 5 states, weighted scoring)
- Evidence attribution (sourceView, sourceText per field and rule)
- MongoDB CRUD (save, retrieve, delete scans)
- Dashboard with real aggregated MongoDB data
- Inspection history with search/filter
- 5-page professional PDF report (real data)
- Smart retake suggestions
- Cross-view consistency detection
- Product mismatch detection gate (text-based)
- Frontend routing (7 pages)
- Mobile-responsive CSS layout

### B. WHAT IS PARTIALLY WORKING
- Same-product verification (works for known brands/keywords, fails for unfamiliar products)
- Product category detection (keyword-based, not ML)
- Video analysis (file saved, but no frame extraction for OCR)
- Dashboard trends (functional but only meaningful after multiple scans)

### C. WHAT IS NOT IMPLEMENTED
- External AI/Vision API (no Gemini Vision, no GPT-4V, no Google Vision)
- Video frame extraction / sampling
- User authentication / sessions
- Production deployment (no cloud config)
- MongoDB Atlas (still using localhost)
- Actual product image embedding in PDF

### D. WHAT IS BROKEN
- If OCR produces very poor results (which is common for real-world photos), almost all 10 fields will be "Not Detected" → status will always be `NEEDS_REVIEW` with a ~70% score (because NEEDS_REVIEW = 70% credit). **This makes the compliance engine look like it always says "NEEDS_REVIEW" on real products.**
- Video upload presents no actual analysis value currently.

### E. WHAT IS MOCK/FAKE
- `DEMO_PRODUCTS.compliant` ("Premium Rice") — only used in demo mode, clearly labeled
- `DEMO_PRODUCTS.non_compliant` ("Premium Snack") — only used in demo mode
- `SEED_SCANS` in `seedDatabase.js` — 8 fictional records, NOT auto-inserted
- Demo image quality scores in `scanController.js` (hardcoded `score: 98` for demo products)

### F. WHAT MUST BE FIXED FIRST
1. **Deploy** (Render/Railway backend + Vercel frontend + MongoDB Atlas)
2. **Add a real Vision/AI API** (Gemini Vision or Google Cloud Vision) to replace or supplement Tesseract for better field extraction on real-world photos
3. **Fix video frame extraction** or remove the video option from UI if not implemented
4. **Embed actual images in PDF** (fetch blob from backend uploads URL, convert to base64, insert in jsPDF)
5. **Connect to MongoDB Atlas** for persistent production data

### G. WHAT SHOULD NOT BE TOUCHED (Already Working)
- `complianceEngine.js` — the 10-rule LMR engine is solid and evidence-based
- `ocrService.js` → `extractMultiViewText()` — multi-pass OCR pipeline is well-designed
- `extractionService.js` — field extraction with OCR character correction is solid
- `productIdentityService.js` → `verifyProductIdentity()` — good for known brands
- `reportPdfService.js` — professional-grade PDF, don't touch
- `imageQualityService.js` — Sharp-based quality check works correctly
- `MobileInspectionWizard.jsx` — upload/camera/additional views UI is solid
- `Scan.js` MongoDB schema — comprehensive, well-structured
- `dashboardController.js` — real data aggregation, no mock data
- `scanController.js` — the full real-image pipeline (lines 406-991) is correct
