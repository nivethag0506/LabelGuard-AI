import mongoose from 'mongoose';
import Scan from '../models/Scan.js';
import { isDatabaseConnected } from '../config/db.js';
import { 
  extractProductInformation, 
  extractTextFromImage, 
  extractMultiViewText, 
  DEMO_PRODUCTS 
} from '../services/ocrService.js';
import { evaluateCompliance } from '../services/complianceEngine.js';
import { 
  extractStructuredFields, 
  extractMultiViewStructuredFields 
} from '../services/extractionService.js';
import { checkImageQuality } from '../services/imageQualityService.js';
import { verifyProductIdentity } from '../services/productIdentityService.js';
// In-memory fallback repository for resilience when MongoDB connection is pending
let inMemoryScans = [];

/**
 * Generate unique inspection identifier
 */
const generateInspectionId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INSP-${timestamp}-${randomSuffix}`;
};

/**
 * POST /api/scans/quality-check
 * Instant pre-flight quality check for mobile camera viewfinder
 */
export const checkSingleImageQuality = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded for quality analysis.'
      });
    }

    const qualityResult = await checkImageQuality(req.file.path);
    return res.json({
      success: true,
      data: qualityResult
    });
  } catch (err) {
    console.error('[checkSingleImageQuality Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to assess image quality: ' + err.message
    });
  }
};

/**
 * POST /api/scans
 * Multi-View Mobile Field Inspection Engine
 * Verifies same product identity, runs multi-view OCR, detects mismatches, and applies Legal Metrology rules
 */
export const createScan = async (req, res) => {
  try {
    const { demoType, rawText, productData: customProductData } = req.body;
    const inspectionId = generateInspectionId();
    
    let fileList = [];
    if (Array.isArray(req.files)) {
      fileList = req.files;
    } else if (req.files && typeof req.files === 'object') {
      fileList = Object.values(req.files).flat();
    } else if (req.file) {
      fileList = [req.file];
    }
    const hasFiles = fileList.length > 0;

    // =========================================================================
    // 1. Explicit Demo Mode (Benchmark QA & Deterministic Demo Testing)
    // =========================================================================
    if (!hasFiles && (demoType === 'compliant' || demoType === 'demo-compliant')) {
      const demoData = DEMO_PRODUCTS.compliant;
      const complianceReport = await evaluateCompliance({
        ...demoData,
        extractedFields: extractStructuredFields(demoData.rawExtractedText, 98),
        isPackageLabelCandidate: true,
        ocrConfidence: 98
      });

      const scanData = {
        inspectionId,
        productName: demoData.productName,
        brand: 'ABC Foods',
        productCategory: 'Food & Edible Commodities',
        categoryConfidence: 0.98,
        manufacturer: demoData.manufacturer,
        manufacturerAddress: demoData.manufacturerAddress,
        packer: demoData.packer,
        importer: demoData.importer,
        netQuantity: demoData.netQuantity,
        mrp: demoData.mrp,
        batchNumber: demoData.batchNumber,
        manufacturingDate: demoData.manufacturingDate,
        bestBefore: demoData.bestBefore,
        expiryDate: demoData.expiryDate,
        countryOfOrigin: demoData.countryOfOrigin,
        consumerCare: demoData.consumerCare,
        
        images: {
          front: demoData.productImageUrl,
          back: demoData.productImageUrl,
          top: demoData.productImageUrl,
          bottom: demoData.productImageUrl,
          livePhotos: []
        },
        imageQuality: {
          FRONT: { isAcceptable: true, qualityLevel: 'GOOD', score: 98, reasons: [] },
          BACK: { isAcceptable: true, qualityLevel: 'GOOD', score: 96, reasons: [] },
          TOP: { isAcceptable: true, qualityLevel: 'GOOD', score: 95, reasons: [] },
          BOTTOM: { isAcceptable: true, qualityLevel: 'GOOD', score: 97, reasons: [] }
        },
        video: { url: '', analyzed: false, sampledFrames: [], frameCount: 0 },
        productIdentity: {
          confirmed: true,
          level: 'HIGH CONFIDENCE',
          confidence: 98,
          mismatchDetected: false,
          suspiciousView: '',
          explanation: 'Deterministic demo product verified: all views belong to the same physical unit.'
        },
        identityConfidence: 98,
        ocr: {
          front: demoData.cleanedExtractedText,
          back: demoData.cleanedExtractedText,
          top: 'ABC FOODS SEALED TOP',
          bottom: 'BATCH B12345'
        },
        combinedText: demoData.cleanedExtractedText,
        rawExtractedText: demoData.rawExtractedText,
        cleanedExtractedText: demoData.cleanedExtractedText,
        ocrConfidence: 98,
        isPackageLabelCandidate: true,
        productImageUrl: demoData.productImageUrl,
        extractedFields: extractStructuredFields(demoData.rawExtractedText, 98),
        scoreBreakdown: complianceReport.scoreBreakdown,
        complianceScore: complianceReport.score,
        status: complianceReport.status,
        passedRules: complianceReport.passedRules,
        warningRules: complianceReport.warningRules,
        reviewRules: complianceReport.reviewRules || 0,
        failedRules: complianceReport.failedRules,
        totalRules: complianceReport.totalRules,
        ruleEvaluations: complianceReport.ruleEvaluations,
        issues: complianceReport.issues,
        smartRetakes: complianceReport.smartRetakes || [],
        inspectionCompleteness: {
          viewsCount: 4,
          hasFront: true,
          hasBack: true,
          hasTop: true,
          hasBottom: true,
          hasLive: false,
          hasVideo: false,
          imageQuality: 'Good',
          productIdentity: 'Confirmed',
          ocrCoverage: 'High',
          ruleCoverage: 'Complete',
          overallCompleteness: 'COMPLETE',
          percentage: 100
        },
        ruleVersion: complianceReport.ruleVersion,
        sourceMetadata: complianceReport.sourceMetadata,
        decisionGate: { passed: true, code: 'READY', reason: 'Demo verification passed' }
      };

      let savedRecord;
      if (isDatabaseConnected()) {
        const newScan = new Scan(scanData);
        savedRecord = await newScan.save();
      } else {
        savedRecord = { _id: `demo-${Date.now()}`, ...scanData, createdAt: new Date() };
        inMemoryScans.unshift(savedRecord);
      }

      return res.status(201).json({
        success: true,
        message: 'Demo Compliant Product Analyzed',
        data: savedRecord.toObject ? savedRecord.toObject() : savedRecord
      });
    }

    if (!hasFiles && (demoType === 'non_compliant' || demoType === 'demo-issues' || demoType === 'issues')) {
      const demoData = DEMO_PRODUCTS.non_compliant;
      const complianceReport = await evaluateCompliance({
        ...demoData,
        extractedFields: extractStructuredFields(demoData.rawExtractedText, 85),
        isPackageLabelCandidate: true,
        ocrConfidence: 85
      });

      const scanData = {
        inspectionId,
        productName: demoData.productName,
        brand: 'XYZ Foods',
        productCategory: 'Food & Edible Commodities',
        categoryConfidence: 0.90,
        manufacturer: demoData.manufacturer,
        manufacturerAddress: demoData.manufacturerAddress,
        packer: demoData.packer,
        importer: demoData.importer,
        netQuantity: demoData.netQuantity,
        mrp: demoData.mrp,
        batchNumber: demoData.batchNumber,
        manufacturingDate: demoData.manufacturingDate,
        bestBefore: demoData.bestBefore,
        expiryDate: demoData.expiryDate,
        countryOfOrigin: demoData.countryOfOrigin,
        consumerCare: demoData.consumerCare,
        
        images: {
          front: demoData.productImageUrl,
          back: demoData.productImageUrl,
          top: '',
          bottom: ''
        },
        imageQuality: {
          FRONT: { isAcceptable: true, qualityLevel: 'GOOD', score: 85, reasons: [] }
        },
        video: { url: '', analyzed: false, sampledFrames: [], frameCount: 0 },
        productIdentity: {
          confirmed: true,
          level: 'MEDIUM CONFIDENCE',
          confidence: 82,
          mismatchDetected: false,
          suspiciousView: '',
          explanation: 'Demo product with known non-compliance declarations.'
        },
        identityConfidence: 82,
        ocr: { front: demoData.cleanedExtractedText },
        combinedText: demoData.cleanedExtractedText,
        rawExtractedText: demoData.rawExtractedText,
        cleanedExtractedText: demoData.cleanedExtractedText,
        ocrConfidence: 85,
        isPackageLabelCandidate: true,
        productImageUrl: demoData.productImageUrl,
        extractedFields: extractStructuredFields(demoData.rawExtractedText, 85),
        scoreBreakdown: complianceReport.scoreBreakdown,
        complianceScore: complianceReport.score,
        status: complianceReport.status,
        passedRules: complianceReport.passedRules,
        warningRules: complianceReport.warningRules,
        reviewRules: complianceReport.reviewRules || 0,
        failedRules: complianceReport.failedRules,
        totalRules: complianceReport.totalRules,
        ruleEvaluations: complianceReport.ruleEvaluations,
        issues: complianceReport.issues,
        smartRetakes: complianceReport.smartRetakes || [],
        inspectionCompleteness: {
          viewsCount: 2,
          hasFront: true,
          hasBack: true,
          hasTop: false,
          hasBottom: false,
          hasLive: false,
          hasVideo: false,
          imageQuality: 'Good',
          productIdentity: 'Confirmed',
          ocrCoverage: 'Medium',
          ruleCoverage: 'Incomplete',
          overallCompleteness: 'INCOMPLETE',
          percentage: 50
        },
        ruleVersion: complianceReport.ruleVersion,
        sourceMetadata: complianceReport.sourceMetadata,
        decisionGate: { passed: true, code: 'READY', reason: 'Demo test passed' }
      };

      let savedRecord;
      if (isDatabaseConnected()) {
        const newScan = new Scan(scanData);
        savedRecord = await newScan.save();
      } else {
        savedRecord = { _id: `demo-${Date.now()}`, ...scanData, createdAt: new Date() };
        inMemoryScans.unshift(savedRecord);
      }

      return res.status(201).json({
        success: true,
        message: 'Demo Non-Compliant Product Analyzed',
        data: savedRecord.toObject ? savedRecord.toObject() : savedRecord
      });
    }

    // =========================================================================
    // 2. Direct Package Audit (Manual entry)
    // =========================================================================
    if (!hasFiles && customProductData && typeof customProductData === 'object') {
      const manualText = Object.entries(customProductData)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      
      const structured = extractStructuredFields(manualText, 95);
      for (const [key, val] of Object.entries(customProductData)) {
        if (val && typeof val === 'string' && val.trim().length > 0) {
          structured[key] = {
            field: key,
            rawValue: val,
            normalizedValue: val,
            value: val,
            confidence: 0.95,
            sourceText: `Direct Audit: ${val}`,
            sourceView: 'MANUAL ENTRY',
            status: 'DETECTED'
          };
        }
      }

      const complianceReport = await evaluateCompliance({
        ...customProductData,
        rawExtractedText: manualText,
        cleanedExtractedText: manualText,
        ocrConfidence: 95,
        isPackageLabelCandidate: true,
        isManualAudit: true,
        extractedFields: structured
      });

      const scanData = {
        inspectionId,
        productName: customProductData.productName || 'Packaged Commodity',
        brand: customProductData.brand || '',
        productCategory: 'General Packaged Commodity',
        manufacturer: customProductData.manufacturer || '',
        manufacturerAddress: customProductData.manufacturerAddress || '',
        packer: customProductData.packer || '',
        importer: customProductData.importer || '',
        netQuantity: customProductData.netQuantity || '',
        mrp: customProductData.mrp || '',
        batchNumber: customProductData.batchNumber || '',
        manufacturingDate: customProductData.manufacturingDate || '',
        bestBefore: customProductData.bestBefore || '',
        expiryDate: customProductData.expiryDate || '',
        countryOfOrigin: customProductData.countryOfOrigin || '',
        consumerCare: customProductData.consumerCare || '',
        
        images: { front: '', back: '', top: '', bottom: '', livePhotos: [] },
        imageQuality: {},
        video: { url: '', analyzed: false, sampledFrames: [], frameCount: 0 },
        productIdentity: {
          confirmed: true,
          level: 'HIGH CONFIDENCE',
          confidence: 95,
          mismatchDetected: false,
          suspiciousView: '',
          explanation: 'Direct manual package audit.'
        },
        identityConfidence: 95,
        ocr: { front: manualText },
        combinedText: manualText,
        rawExtractedText: manualText,
        cleanedExtractedText: manualText,
        ocrConfidence: 95,
        isPackageLabelCandidate: true,
        productImageUrl: '',
        extractedFields: structured,
        scoreBreakdown: complianceReport.scoreBreakdown,
        complianceScore: complianceReport.score,
        status: complianceReport.status,
        passedRules: complianceReport.passedRules,
        warningRules: complianceReport.warningRules,
        reviewRules: complianceReport.reviewRules || 0,
        failedRules: complianceReport.failedRules,
        totalRules: complianceReport.totalRules,
        ruleEvaluations: complianceReport.ruleEvaluations,
        issues: complianceReport.issues,
        smartRetakes: complianceReport.smartRetakes || [],
        inspectionCompleteness: {
          viewsCount: 4,
          hasFront: true,
          hasBack: true,
          hasTop: true,
          hasBottom: true,
          overallCompleteness: 'COMPLETE',
          percentage: 100
        },
        ruleVersion: complianceReport.ruleVersion,
        sourceMetadata: complianceReport.sourceMetadata,
        decisionGate: { passed: true, code: 'READY', reason: 'Manual audit complete' }
      };

      let savedRecord;
      if (isDatabaseConnected()) {
        const newScan = new Scan(scanData);
        savedRecord = await newScan.save();
      } else {
        savedRecord = { _id: `audit-${Date.now()}`, ...scanData, createdAt: new Date() };
        inMemoryScans.unshift(savedRecord);
      }

      return res.status(201).json({
        success: true,
        message: 'Direct Package Audit Evaluated Successfully',
        data: savedRecord.toObject ? savedRecord.toObject() : savedRecord
      });
    }

    // =========================================================================
    // 3. Multi-View Field Inspection (Real Mobile Camera / Gallery / Video)
    // =========================================================================
    if (hasFiles) {
      const findFile = (names) => fileList.find(f => names.includes((f.fieldname || '').toLowerCase()));
      const frontFile = findFile(['front', 'image', 'frontview', 'front_view']);
      const backFile = findFile(['back', 'backview', 'back_view']);

      // Section 2 & 3: Front and Back are strictly compulsory
      if (!frontFile && !backFile) {
        return res.status(400).json({
          success: false,
          message: 'Front view is required to identify the product, and Back view is required for complete label and declaration verification.'
        });
      }
      if (!frontFile) {
        return res.status(400).json({
          success: false,
          message: 'Front view is required to identify the product.'
        });
      }
      if (!backFile) {
        return res.status(400).json({
          success: false,
          message: 'Back view is required for complete label and declaration verification.'
        });
      }

      // Optional Standard & Additional Views (Top, Bottom, Left, Right, Close-ups, etc.)
      const topFile = findFile(['top', 'topview', 'top_view']);
      const bottomFile = findFile(['bottom', 'bottomview', 'bottom_view']);
      const leftFile = findFile(['left', 'leftview', 'left_view']);
      const rightFile = findFile(['right', 'rightview', 'right_view']);
      const videoFile = findFile(['video']);
      const liveFiles = fileList.filter(f => (f.fieldname || '').toLowerCase().startsWith('livephoto') || (f.fieldname || '').toLowerCase() === 'live');
      const videoFrameFiles = fileList.filter(f => (f.fieldname || '').toLowerCase().startsWith('videoframe'));

      const recognizedSet = new Set([
        frontFile, backFile, topFile, bottomFile, leftFile, rightFile, videoFile,
        ...liveFiles, ...videoFrameFiles
      ].filter(Boolean));

      const additionalFiles = fileList.filter(f => !recognizedSet.has(f));

      // Parse metadata for additional views if passed
      let additionalViewsMeta = [];
      try {
        if (req.body.additionalViews) {
          additionalViewsMeta = typeof req.body.additionalViews === 'string' ? JSON.parse(req.body.additionalViews) : req.body.additionalViews;
        } else if (req.body.viewsData) {
          additionalViewsMeta = typeof req.body.viewsData === 'string' ? JSON.parse(req.body.viewsData) : req.body.viewsData;
        }
      } catch (err) {
        console.warn('[ScanController] Failed to parse additionalViews metadata:', err.message);
      }

      // Build viewsMap for OCR & Identity Verification
      const viewsMap = {};
      if (frontFile) viewsMap.FRONT = frontFile.path;
      if (backFile) viewsMap.BACK = backFile.path;
      if (topFile) viewsMap.TOP = topFile.path;
      if (bottomFile) viewsMap.BOTTOM = bottomFile.path;
      if (leftFile) viewsMap.LEFT = leftFile.path;
      if (rightFile) viewsMap.RIGHT = rightFile.path;

      additionalFiles.forEach((f, idx) => {
        const meta = (Array.isArray(additionalViewsMeta) ? additionalViewsMeta.find(m => m.id === f.fieldname || m.fieldname === f.fieldname || m.index === idx) : {}) || {};
        let viewKey = (meta.viewType || f.fieldname || `ADDITIONAL_${idx + 1}`).toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        if (viewsMap[viewKey]) {
          viewKey = `${viewKey}_${idx + 1}`;
        }
        viewsMap[viewKey] = f.path;
      });

      liveFiles.forEach((f, idx) => {
        viewsMap[`LIVE_${idx + 1}`] = f.path;
      });

      videoFrameFiles.forEach((f, idx) => {
        viewsMap[`VIDEO_FRAME_${idx + 1}`] = f.path;
      });

      console.log(`[ScanController] Flexible Multi-View upload received: ${Object.keys(viewsMap).join(', ')}`);

      // 3.1 Run Image Quality Assessment on each submitted view
      const imageQualityMap = {};
      for (const [viewName, filePath] of Object.entries(viewsMap)) {
        imageQualityMap[viewName] = await checkImageQuality(filePath);
      }

      // 3.2 Run Multi-View Optical Character Recognition
      const multiOcr = await extractMultiViewText(viewsMap);
      const ocrByView = multiOcr.ocrByView;
      const combinedCleanedText = multiOcr.combinedCleanedText;
      const combinedRawText = multiOcr.combinedRawText;
      const avgConfidence = multiOcr.averageConfidence;

      // 3.3 Verify Product Identity Across All Submitted Views
      const identityResult = verifyProductIdentity(ocrByView);

      // Helper to build database views records (Requirement 21) & images object
      const submittedViews = [];
      const addViewRecord = (viewId, viewType, fileObj, ocrKey, source = 'CAMERA_OR_UPLOAD') => {
        if (!fileObj) return;
        const ocrData = ocrByView[ocrKey] || {};
        submittedViews.push({
          viewId: viewId || fileObj.fieldname,
          viewType: (viewType || 'additional').toLowerCase(),
          file: fileObj.filename,
          url: `/uploads/${fileObj.filename}`,
          source,
          timestamp: new Date(),
          quality: imageQualityMap[ocrKey] || {},
          ocr: ocrData.cleanedText || '',
          confidence: ocrData.confidence || 0
        });
      };

      addViewRecord('front', 'front', frontFile, 'FRONT', 'CAMERA_OR_UPLOAD');
      addViewRecord('back', 'back', backFile, 'BACK', 'CAMERA_OR_UPLOAD');
      if (topFile) addViewRecord('top', 'top', topFile, 'TOP', 'CAMERA_OR_UPLOAD');
      if (bottomFile) addViewRecord('bottom', 'bottom', bottomFile, 'BOTTOM', 'CAMERA_OR_UPLOAD');
      if (leftFile) addViewRecord('left', 'left', leftFile, 'LEFT', 'CAMERA_OR_UPLOAD');
      if (rightFile) addViewRecord('right', 'right', rightFile, 'RIGHT', 'CAMERA_OR_UPLOAD');

      additionalFiles.forEach((f, idx) => {
        const meta = (Array.isArray(additionalViewsMeta) ? additionalViewsMeta.find(m => m.id === f.fieldname || m.fieldname === f.fieldname || m.index === idx) : {}) || {};
        const vType = (meta.viewType || f.fieldname || `additional_${idx + 1}`).toLowerCase();
        const ocrKey = Object.keys(viewsMap).find(k => viewsMap[k] === f.path) || `ADDITIONAL_${idx + 1}`;
        addViewRecord(f.fieldname || `additional_${idx + 1}`, vType, f, ocrKey, 'ADDITIONAL_VIEW');
      });

      liveFiles.forEach((f, idx) => {
        addViewRecord(`live_${idx + 1}`, 'live', f, `LIVE_${idx + 1}`, 'LIVE_PHOTO');
      });

      const additionalViewsData = additionalFiles.map((f, idx) => {
        const meta = (Array.isArray(additionalViewsMeta) ? additionalViewsMeta.find(m => m.id === f.fieldname || m.fieldname === f.fieldname || m.index === idx) : {}) || {};
        return {
          viewType: (meta.viewType || 'additional').toLowerCase(),
          url: `/uploads/${f.filename}`,
          label: meta.label || meta.viewType || `Additional View ${idx + 1}`
        };
      });

      const imagesData = {
        front: frontFile ? `/uploads/${frontFile.filename}` : '',
        back: backFile ? `/uploads/${backFile.filename}` : '',
        top: topFile ? `/uploads/${topFile.filename}` : '',
        bottom: bottomFile ? `/uploads/${bottomFile.filename}` : '',
        left: leftFile ? `/uploads/${leftFile.filename}` : '',
        right: rightFile ? `/uploads/${rightFile.filename}` : '',
        additionalViews: additionalViewsData,
        livePhotos: liveFiles.map(f => `/uploads/${f.filename}`)
      };

      const additionalCount = (topFile ? 1 : 0) + (bottomFile ? 1 : 0) + (leftFile ? 1 : 0) + (rightFile ? 1 : 0) + additionalFiles.length + liveFiles.length;
      const totalSubmittedCount = 2 + additionalCount;
      const allQualitiesAcceptable = Object.values(imageQualityMap).every(q => q.isAcceptable);

      const inspectionCompleteness = {
        viewsCount: totalSubmittedCount,
        totalViewsCount: totalSubmittedCount,
        requiredViewsLabel: '2/2 complete',
        requiredComplete: true,
        requiredViews: {
          front: true,
          back: true
        },
        hasFront: true,
        hasBack: true,
        hasTop: Boolean(topFile),
        hasBottom: Boolean(bottomFile),
        hasLeft: Boolean(leftFile),
        hasRight: Boolean(rightFile),
        additionalViewsCount: additionalCount,
        hasLive: liveFiles.length > 0,
        hasVideo: Boolean(videoFile),
        imageQuality: allQualitiesAcceptable ? 'Good' : 'Needs Review',
        productIdentity: identityResult.level,
        ocrCoverage: avgConfidence > 65 ? 'High' : 'Medium',
        ruleCoverage: 'Complete',
        overallCompleteness: 'COMPLETE',
        percentage: 100
      };

      const primaryImage = frontFile ? `/uploads/${frontFile.filename}` : (backFile ? `/uploads/${backFile.filename}` : '');

      // =======================================================================
      // GATE 1: Invalid / Non-Product Media Detection (Requirement 6 & Test 7)
      // =======================================================================
      if (identityResult.isPackagedProduct === false) {
        console.warn(`[ScanController] INVALID PRODUCT: Unable to identify a packaged product from submitted media.`);
        
        const invalidProductScanData = {
          inspectionId,
          productName: 'Unable to Identify a Packaged Product',
          brand: 'Unidentified Media',
          productCategory: 'Non-Product / Unclear Media',
          complianceScore: 0,
          status: 'NEEDS_REVIEW',
          productIdentity: identityResult,
          identityConfidence: identityResult.identityConfidence || 15,
          images: imagesData,
          views: submittedViews,
          imageQuality: imageQualityMap,
          video: {
            url: videoFile ? `/uploads/${videoFile.filename}` : '',
            analyzed: Boolean(videoFile || videoFrameFiles.length),
            sampledFrames: videoFrameFiles.map(f => `/uploads/${f.filename}`),
            frameCount: videoFrameFiles.length
          },
          ocr: {
            front: ocrByView.FRONT?.cleanedText || '',
            back: ocrByView.BACK?.cleanedText || '',
            top: ocrByView.TOP?.cleanedText || '',
            bottom: ocrByView.BOTTOM?.cleanedText || '',
            left: ocrByView.LEFT?.cleanedText || '',
            right: ocrByView.RIGHT?.cleanedText || ''
          },
          combinedText: combinedCleanedText,
          rawExtractedText: combinedRawText,
          cleanedExtractedText: combinedCleanedText,
          ocrConfidence: avgConfidence,
          productImageUrl: primaryImage || '',
          decisionGate: {
            passed: false,
            code: 'INVALID_PRODUCT',
            reason: 'Unable to identify a packaged product from the submitted media.'
          },
          issues: [{
            ruleId: 'PACKAGE-VALIDITY-01',
            field: 'mediaValidity',
            title: 'Unable to Identify a Packaged Product',
            severity: 'HIGH',
            status: 'NEEDS_REVIEW',
            confidence: 0.95,
            detectedValue: 'Unidentified Media',
            sourceView: 'ALL VIEWS',
            sourceText: 'No statutory package declarations, brand trademarks, or commodity packaging hallmarks found.',
            evidence: 'Unable to identify a packaged product from the submitted media.',
            explanation: 'Unable to identify a packaged product from the submitted media.',
            recommendation: 'Submit clear photographs of an actual physical packaged commodity with printed labels.',
            whyItMatters: 'LegalScan performs compliance checks specifically on pre-packaged commodities under the Legal Metrology (Packaged Commodities) Rules.',
            recommendedAction: 'Submit clear photographs of an actual physical packaged commodity with printed labels.'
          }],
          recommendations: [
            'Ensure the camera is focused on an actual packaged product.',
            'Capture surfaces that display statutory declarations (e.g. MRP, Net Wt, Manufacturer, Batch).'
          ],
          smartRetakes: [{
            view: 'FRONT',
            reason: 'Submit photographs of an actual packaged commodity with printed statutory declarations.'
          }],
          inspectionCompleteness: {
            ...inspectionCompleteness,
            imageQuality: 'Low',
            productIdentity: 'Unidentified',
            ocrCoverage: 'None',
            ruleCoverage: 'Blocked',
            overallCompleteness: 'INVALID_PRODUCT'
          }
        };

        let savedRecord;
        if (isDatabaseConnected()) {
          const newScan = new Scan(invalidProductScanData);
          savedRecord = await newScan.save();
        } else {
          savedRecord = { _id: `invalid-${Date.now()}`, ...invalidProductScanData, createdAt: new Date() };
          inMemoryScans.unshift(savedRecord);
        }

        return res.status(201).json({
          success: true,
          message: 'Unable to identify a packaged product from the submitted media.',
          data: savedRecord.toObject ? savedRecord.toObject() : savedRecord
        });
      }

      // =======================================================================
      // GATE 2: Product Mismatch Gate (Requirement 7 & Test 6)
      // =======================================================================
      if (identityResult.mismatchDetected) {
        console.warn(`[ScanController] PRODUCT MISMATCH DETECTED: Suspicious view: ${identityResult.suspiciousView}`);
        
        const mismatchScanData = {
          inspectionId,
          productName: 'Product Mismatch Detected',
          brand: 'Multiple Brands Detected',
          productCategory: 'Mixed Package Views',
          complianceScore: 0,
          status: 'PRODUCT_MISMATCH',
          productIdentity: identityResult,
          identityConfidence: identityResult.identityConfidence,
          images: imagesData,
          views: submittedViews,
          imageQuality: imageQualityMap,
          video: {
            url: videoFile ? `/uploads/${videoFile.filename}` : '',
            analyzed: Boolean(videoFile || videoFrameFiles.length),
            sampledFrames: videoFrameFiles.map(f => `/uploads/${f.filename}`),
            frameCount: videoFrameFiles.length
          },
          ocr: {
            front: ocrByView.FRONT?.cleanedText || '',
            back: ocrByView.BACK?.cleanedText || '',
            top: ocrByView.TOP?.cleanedText || '',
            bottom: ocrByView.BOTTOM?.cleanedText || '',
            left: ocrByView.LEFT?.cleanedText || '',
            right: ocrByView.RIGHT?.cleanedText || ''
          },
          combinedText: combinedCleanedText,
          rawExtractedText: combinedRawText,
          cleanedExtractedText: combinedCleanedText,
          ocrConfidence: avgConfidence,
          productImageUrl: primaryImage || '',
          decisionGate: {
            passed: false,
            code: 'PRODUCT_MISMATCH',
            reason: identityResult.explanation
          },
          issues: [{
            ruleId: 'MISMATCH-01',
            field: 'productIdentity',
            title: 'Product Mismatch Detected Across Views',
            severity: 'CRITICAL',
            status: 'FAIL',
            confidence: 0.98,
            detectedValue: `Suspicious View: ${identityResult.suspiciousView}`,
            sourceView: identityResult.suspiciousView,
            sourceText: identityResult.reasons.join('; '),
            evidence: `Conflicting product declarations detected in ${identityResult.suspiciousView}.`,
            explanation: `Conflicting product declarations detected in ${identityResult.suspiciousView}: ${identityResult.reasons.join('; ')}`,
            recommendation: `Replace the image for view: ${identityResult.suspiciousView} to continue inspection.`,
            whyItMatters: 'Legal Metrology compliance requires all submitted inspection views to belong to the exact same physical packaged product.',
            recommendedAction: 'Replace the flagged image view to continue inspection.'
          }],
          recommendations: [
            `Replace the image for view: ${identityResult.suspiciousView}`,
            'Ensure all package views are captured from the exact same physical packaging unit.'
          ],
          smartRetakes: [{
            view: identityResult.suspiciousView,
            reason: `Replace ${identityResult.suspiciousView} — does not match the product consensus.`
          }],
          inspectionCompleteness: {
            ...inspectionCompleteness,
            imageQuality: 'Low',
            productIdentity: 'Mismatch Detected',
            ocrCoverage: 'Partial',
            ruleCoverage: 'Blocked',
            overallCompleteness: 'MISMATCH'
          }
        };

        let savedRecord;
        if (isDatabaseConnected()) {
          const newScan = new Scan(mismatchScanData);
          savedRecord = await newScan.save();
        } else {
          savedRecord = { _id: `mismatch-${Date.now()}`, ...mismatchScanData, createdAt: new Date() };
          inMemoryScans.unshift(savedRecord);
        }

        return res.status(201).json({
          success: true,
          message: 'Product Mismatch Detected across submitted views',
          data: savedRecord.toObject ? savedRecord.toObject() : savedRecord
        });
      }

      // =======================================================================
      // GATE 3: Low Product Identity Confidence Gate (Requirement 8)
      // =======================================================================
      if (identityResult.identityConfidence < 40 && Object.keys(viewsMap).length > 1) {
        console.warn(`[ScanController] LOW IDENTITY CONFIDENCE: Unable to establish all views belong to the same product.`);
        
        const lowConfidenceScanData = {
          inspectionId,
          productName: 'Low Identity Confidence',
          brand: 'Unconfirmed Product',
          productCategory: 'Unverified Commodity',
          complianceScore: 0,
          status: 'NEEDS_REVIEW',
          productIdentity: identityResult,
          identityConfidence: identityResult.identityConfidence,
          images: imagesData,
          views: submittedViews,
          imageQuality: imageQualityMap,
          video: {
            url: videoFile ? `/uploads/${videoFile.filename}` : '',
            analyzed: Boolean(videoFile || videoFrameFiles.length),
            sampledFrames: videoFrameFiles.map(f => `/uploads/${f.filename}`),
            frameCount: videoFrameFiles.length
          },
          ocr: {
            front: ocrByView.FRONT?.cleanedText || '',
            back: ocrByView.BACK?.cleanedText || '',
            top: ocrByView.TOP?.cleanedText || '',
            bottom: ocrByView.BOTTOM?.cleanedText || '',
            left: ocrByView.LEFT?.cleanedText || '',
            right: ocrByView.RIGHT?.cleanedText || ''
          },
          combinedText: combinedCleanedText,
          rawExtractedText: combinedRawText,
          cleanedExtractedText: combinedCleanedText,
          ocrConfidence: avgConfidence,
          productImageUrl: primaryImage || '',
          decisionGate: {
            passed: false,
            code: 'LOW_CONFIDENCE',
            reason: 'Unable to confidently establish that all submitted views belong to the same product.'
          },
          issues: [{
            ruleId: 'IDENTITY-01',
            field: 'productIdentity',
            title: 'Low Product Identity Confidence',
            severity: 'HIGH',
            status: 'NEEDS_REVIEW',
            confidence: 0.90,
            detectedValue: `Confidence: ${identityResult.identityConfidence}%`,
            sourceView: 'ALL VIEWS',
            sourceText: identityResult.explanation,
            evidence: 'Unable to confidently establish that all submitted views belong to the same product.',
            explanation: identityResult.explanation || 'Unable to confidently establish that all submitted views belong to the same product.',
            recommendation: 'Re-capture package surfaces in sequence with clear branding visible.',
            whyItMatters: 'Field inspection requires all submitted views to belong to a single physical product unit.',
            recommendedAction: 'Re-capture package surfaces in sequence with clear branding visible.'
          }],
          recommendations: [
            'Ensure all photos are taken of the same packaging unit.',
            'Keep brand name and product title visible.'
          ],
          smartRetakes: [{
            view: 'ALL',
            reason: 'Retake package surfaces in sequence to verify product continuity.'
          }],
          inspectionCompleteness: {
            ...inspectionCompleteness,
            imageQuality: 'Needs Review',
            productIdentity: 'Uncertain',
            ocrCoverage: 'Partial',
            ruleCoverage: 'Blocked',
            overallCompleteness: 'LOW_CONFIDENCE'
          }
        };

        let savedRecord;
        if (isDatabaseConnected()) {
          const newScan = new Scan(lowConfidenceScanData);
          savedRecord = await newScan.save();
        } else {
          savedRecord = { _id: `lowconf-${Date.now()}`, ...lowConfidenceScanData, createdAt: new Date() };
          inMemoryScans.unshift(savedRecord);
        }

        return res.status(201).json({
          success: true,
          message: 'Unable to confidently establish that all submitted views belong to the same product.',
          data: savedRecord.toObject ? savedRecord.toObject() : savedRecord
        });
      }

      // 3.4 Multi-View Structured Field Extraction & Cross-Check (Requirement 11 & 12)
      const multiExtraction = extractMultiViewStructuredFields(ocrByView, combinedCleanedText, avgConfidence);
      const extractedFields = multiExtraction.fields;
      const detectedCategory = multiExtraction.productCategory;
      const isPerishable = multiExtraction.isPerishable;

      // 3.5 Evaluate Compliance via Legal Metrology Rule Engine
      const complianceReport = await evaluateCompliance({
        extractedFields,
        productCategory: detectedCategory,
        isPerishable,
        hasBottom: Boolean(bottomFile),
        ocrConfidence: avgConfidence,
        isPackageLabelCandidate: true,
        isPackagedProduct: identityResult.isPackagedProduct,
        mismatchDetected: identityResult.mismatchDetected,
        hasInconsistencies: multiExtraction.inconsistencies && multiExtraction.inconsistencies.length > 0,
        inconsistencies: multiExtraction.inconsistencies
      });

      // Append cross-view inconsistencies if any found (Requirement 19)
      if (multiExtraction.inconsistencies && multiExtraction.inconsistencies.length > 0) {
        for (const inc of multiExtraction.inconsistencies) {
          complianceReport.issues.unshift({
            ruleId: 'INCONSISTENCY-01',
            field: inc.field,
            title: `Inconsistent ${inc.field.toUpperCase()} Across Views`,
            severity: 'HIGH',
            status: 'WARNING',
            confidence: 0.90,
            detectedValue: inc.views.join(' | '),
            sourceView: 'MULTI-VIEW',
            sourceText: inc.message,
            evidence: inc.message,
            whyItMatters: 'Conflicting statutory declarations across package panels violate uniform packaging standards under Rule 6.',
            recommendedAction: 'Verify physical packaging to confirm which declaration is authoritative.'
          });
        }
      }

      const scanData = {
        inspectionId,
        productName: extractedFields.productName?.value || 'Packaged Commodity',
        brand: extractedFields.manufacturer?.value || '',
        productCategory: detectedCategory,
        categoryConfidence: multiExtraction.categoryConfidence,
        manufacturer: extractedFields.manufacturer?.value || '',
        manufacturerAddress: extractedFields.manufacturerAddress?.value || '',
        packer: extractedFields.packer?.value || '',
        importer: extractedFields.importer?.value || '',
        netQuantity: extractedFields.netQuantity?.value || '',
        mrp: extractedFields.mrp?.value || '',
        batchNumber: extractedFields.batchNumber?.value || '',
        manufacturingDate: extractedFields.manufacturingDate?.value || '',
        bestBefore: extractedFields.bestBefore?.value || '',
        expiryDate: extractedFields.expiryDate?.value || '',
        countryOfOrigin: extractedFields.countryOfOrigin?.value || '',
        consumerCare: extractedFields.consumerCare?.value || '',

        images: imagesData,
        views: submittedViews,
        imageQuality: imageQualityMap,
        video: {
          url: videoFile ? `/uploads/${videoFile.filename}` : '',
          analyzed: Boolean(videoFile || videoFrameFiles.length),
          sampledFrames: videoFrameFiles.map(f => `/uploads/${f.filename}`),
          frameCount: videoFrameFiles.length
        },
        productIdentity: identityResult,
        identityConfidence: identityResult.identityConfidence,
        ocr: {
          front: ocrByView.FRONT?.cleanedText || '',
          back: ocrByView.BACK?.cleanedText || '',
          top: ocrByView.TOP?.cleanedText || '',
          bottom: ocrByView.BOTTOM?.cleanedText || '',
          left: ocrByView.LEFT?.cleanedText || '',
          right: ocrByView.RIGHT?.cleanedText || '',
          live: liveFiles.map((_, i) => ocrByView[`LIVE_${i+1}`]?.cleanedText || '').filter(Boolean).join('\n'),
          video: videoFrameFiles.map((_, i) => ocrByView[`VIDEO_FRAME_${i+1}`]?.cleanedText || '').filter(Boolean).join('\n')
        },
        combinedText: combinedCleanedText,
        rawExtractedText: combinedRawText,
        cleanedExtractedText: combinedCleanedText,
        ocrConfidence: avgConfidence,
        isPackageLabelCandidate: true,
        productImageUrl: primaryImage || '',
        extractedFields,
        scoreBreakdown: complianceReport.scoreBreakdown,
        complianceScore: complianceReport.score,
        status: complianceReport.status,
        passedRules: complianceReport.passedRules,
        warningRules: complianceReport.warningRules,
        reviewRules: complianceReport.reviewRules || 0,
        failedRules: complianceReport.failedRules,
        notApplicableRules: complianceReport.notApplicableRules || 0,
        totalRules: complianceReport.totalRules,
        ruleEvaluations: complianceReport.ruleEvaluations,
        issues: complianceReport.issues,
        smartRetakes: complianceReport.smartRetakes || [],
        inspectionCompleteness,
        ruleVersion: complianceReport.ruleVersion,
        sourceMetadata: complianceReport.sourceMetadata,
        decisionGate: {
          passed: true,
          code: 'READY',
          reason: 'All field inspection validation gates passed.'
        }
      };

      let savedRecord;
      if (isDatabaseConnected()) {
        const newScan = new Scan(scanData);
        savedRecord = await newScan.save();
      } else {
        savedRecord = { _id: `scan-${Date.now()}`, ...scanData, createdAt: new Date() };
        inMemoryScans.unshift(savedRecord);
      }

      return res.status(201).json({
        success: true,
        message: 'Multi-view inspection analyzed and preliminary compliance evaluated successfully',
        data: savedRecord.toObject ? savedRecord.toObject() : savedRecord
      });
    }

    // 4. Raw Text Fallback
    if (rawText && typeof rawText === 'string') {
      const extractedInfo = extractProductInformation(rawText);
      const complianceReport = await evaluateCompliance(extractedInfo);
      const scanData = {
        inspectionId,
        productName: extractedInfo.productName || 'Packaged Commodity',
        manufacturer: extractedInfo.manufacturer || '',
        manufacturerAddress: extractedInfo.manufacturerAddress || '',
        netQuantity: extractedInfo.netQuantity || '',
        mrp: extractedInfo.mrp || '',
        batchNumber: extractedInfo.batchNumber || '',
        manufacturingDate: extractedInfo.manufacturingDate || '',
        bestBefore: extractedInfo.bestBefore || '',
        countryOfOrigin: extractedInfo.countryOfOrigin || '',
        consumerCare: extractedInfo.consumerCare || '',
        rawExtractedText: rawText,
        cleanedExtractedText: rawText,
        ocrConfidence: 75,
        complianceScore: complianceReport.score,
        status: complianceReport.status,
        ruleEvaluations: complianceReport.ruleEvaluations,
        issues: complianceReport.issues,
        extractedFields: extractedInfo.extractedFields || {},
        productImageUrl: ''
      };

      let savedRecord;
      if (isDatabaseConnected()) {
        const newScan = new Scan(scanData);
        savedRecord = await newScan.save();
      } else {
        savedRecord = { _id: `raw-${Date.now()}`, ...scanData, createdAt: new Date() };
        inMemoryScans.unshift(savedRecord);
      }

      return res.status(201).json({
        success: true,
        message: 'Text analysis complete',
        data: savedRecord.toObject ? savedRecord.toObject() : savedRecord
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Front view is required to identify the product, and Back view is required for complete label and declaration verification.'
    });
  } catch (error) {
    console.error('[createScan Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to analyze the submitted product: ' + error.message
    });
  }
};


/**
 * GET /api/scans
 * Retrieve scan history with search, status filters, and sorting
 */
export const getScans = async (req, res) => {
  try {
    const { search, status, sort } = req.query;

    if (isDatabaseConnected()) {
      const query = {};

      if (status && status !== 'ALL') {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { productName: { $regex: search, $options: 'i' } },
          { manufacturer: { $regex: search, $options: 'i' } },
          { batchNumber: { $regex: search, $options: 'i' } },
          { inspectionId: { $regex: search, $options: 'i' } }
        ];
      }

      let sortOption = { createdAt: -1 };
      if (sort === 'oldest') {
        sortOption = { createdAt: 1 };
      } else if (sort === 'score_high') {
        sortOption = { complianceScore: -1 };
      } else if (sort === 'score_low') {
        sortOption = { complianceScore: 1 };
      }

      const scans = await Scan.find(query).sort(sortOption).lean();

      return res.json({
        success: true,
        count: scans.length,
        source: 'MongoDB',
        data: scans
      });
    }

    // Fallback to in-memory records
    let filtered = [...inMemoryScans];
    if (status && status !== 'ALL') {
      filtered = filtered.filter(s => s.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s => 
        (s.productName && s.productName.toLowerCase().includes(q)) ||
        (s.manufacturer && s.manufacturer.toLowerCase().includes(q)) ||
        (s.batchNumber && s.batchNumber.toLowerCase().includes(q)) ||
        (s.inspectionId && s.inspectionId.toLowerCase().includes(q))
      );
    }

    if (sort === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === 'score_high') {
      filtered.sort((a, b) => b.complianceScore - a.complianceScore);
    } else if (sort === 'score_low') {
      filtered.sort((a, b) => a.complianceScore - b.complianceScore);
    } else {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return res.json({
      success: true,
      count: filtered.length,
      source: 'local_storage',
      data: filtered
    });
  } catch (error) {
    console.error('[getScans Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve scans: ' + error.message
    });
  }
};

/**
 * GET /api/scans/:id
 * Retrieve a single scan by ID
 */
export const getScanById = async (req, res) => {
  try {
    const { id } = req.params;

    if (isDatabaseConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const scan = await Scan.findById(id).lean();
      if (scan) {
        // Return existing ruleEvaluations or evaluate on the fly
        let ruleEvaluations = scan.ruleEvaluations;
        let scoreBreakdown = scan.scoreBreakdown;

        if (!ruleEvaluations || ruleEvaluations.length === 0) {
          const report = await evaluateCompliance(scan);
          ruleEvaluations = report.ruleEvaluations;
          scoreBreakdown = report.scoreBreakdown;
        }

        return res.json({
          success: true,
          data: {
            ...scan,
            ruleEvaluations,
            scoreBreakdown
          }
        });
      }
    }

    // Check in-memory
    const memoryRecord = inMemoryScans.find(s => s._id === id || s._id?.toString() === id || s.inspectionId === id);
    if (memoryRecord) {
      let ruleEvaluations = memoryRecord.ruleEvaluations;
      let scoreBreakdown = memoryRecord.scoreBreakdown;

      if (!ruleEvaluations || ruleEvaluations.length === 0) {
        const report = await evaluateCompliance(memoryRecord);
        ruleEvaluations = report.ruleEvaluations;
        scoreBreakdown = report.scoreBreakdown;
      }

      return res.json({
        success: true,
        data: {
          ...memoryRecord,
          ruleEvaluations,
          scoreBreakdown
        }
      });
    }

    return res.status(404).json({
      success: false,
      message: `Inspection record with ID '${id}' not found.`
    });
  } catch (error) {
    console.error('[getScanById Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve scan report: ' + error.message
    });
  }
};

/**
 * DELETE /api/scans/:id
 * Delete a scan record
 */
export const deleteScan = async (req, res) => {
  try {
    const { id } = req.params;

    if (isDatabaseConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const result = await Scan.findByIdAndDelete(id);
      if (result) {
        return res.json({
          success: true,
          message: 'Inspection record deleted successfully from database.'
        });
      }
    }

    const index = inMemoryScans.findIndex(s => s._id === id || s._id?.toString() === id);
    if (index !== -1) {
      inMemoryScans.splice(index, 1);
      return res.json({
        success: true,
        message: 'Inspection record deleted successfully from local storage.'
      });
    }

      return res.status(404).json({
        success: false,
        message: `Inspection record '${id}' not found to delete.`
      });
    } catch (error) {
      console.error('[deleteScan Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete scan: ' + error.message
      });
    }
  };

/**
 * GET /api/scans/:id/report
 * Direct HTTP attachment download for official compliance audit report
 */
export const downloadScanReport = async (req, res) => {
  try {
    const { id } = req.params;
    const format = (req.query.format || 'txt').toLowerCase();

    let scan = null;
    if (isDatabaseConnected() && mongoose.Types.ObjectId.isValid(id)) {
      scan = await Scan.findById(id).lean();
    }
    if (!scan) {
      scan = inMemoryScans.find(s => s._id === id || s._id?.toString() === id || s.inspectionId === id);
    }

    if (!scan) {
      return res.status(404).send('Inspection record not found.');
    }

    let ruleEvaluations = scan.ruleEvaluations || [];
    let scoreBreakdown = scan.scoreBreakdown || {};
    let issues = scan.issues || [];

    if (!ruleEvaluations.length) {
      const report = await evaluateCompliance(scan);
      ruleEvaluations = report.ruleEvaluations;
      scoreBreakdown = report.scoreBreakdown;
      issues = report.issues;
    }

    const safeName = (scan.productName || 'Commodity').replace(/[^a-zA-Z0-9_-]/g, '_');
    const inspId = scan.inspectionId || scan._id?.toString().slice(-6) || 'scan';

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="LegalScan_Report_${safeName}_${inspId}.json"`);
      return res.send(JSON.stringify({ ...scan, ruleEvaluations, scoreBreakdown, issues }, null, 2));
    }

    // Default text report
    const reportText = `======================================================================
LEGALSCAN — PRELIMINARY COMPLIANCE AUDIT REPORT
Legal Metrology (Packaged Commodities) Rules, 2011
======================================================================
Inspection ID:   ${scan.inspectionId || scan._id || id}
Inspection Date: ${new Date(scan.createdAt || Date.now()).toLocaleString('en-IN')}
Commodity Name:  ${scan.productName}
Manufacturer:    ${scan.manufacturer || 'Not Detected'}
Premises Address:${scan.manufacturerAddress || 'Not Detected'}
Net Quantity:    ${scan.netQuantity || 'Not Detected'}
MRP:             ${scan.mrp || 'Not Detected'}
Batch / Lot:     ${scan.batchNumber || 'Not Detected'}
MFD / PKD Date:  ${scan.manufacturingDate || 'Not Detected'}
Best Before:     ${scan.bestBefore || 'Not Detected'}
Country of Origin:${scan.countryOfOrigin || 'Not Detected'}
Consumer Care:   ${scan.consumerCare || 'Not Detected'}

----------------------------------------------------------------------
ASSESSMENT RESULTS & SCORE TRANSPARENCY
----------------------------------------------------------------------
Preliminary Score: ${scan.complianceScore} / 100
Status:            ${scan.status}
Passed Rules:      ${scan.passedRules}
Warning Rules:     ${scan.warningRules}
Review Rules:      ${scan.reviewRules || 0}
Failed Rules:      ${scan.failedRules}
Total Rules:       ${scan.totalRules || 10}

Score Weights:
  Total Possible:  ${scoreBreakdown.totalPossibleWeight || 100} pts
  Passed Weight:   ${scoreBreakdown.passedWeight || 0} pts
  Warning Weight:  ${scoreBreakdown.warningWeight || 0} pts
  Review Weight:   ${scoreBreakdown.reviewWeight || 0} pts
  Failed Weight:   ${scoreBreakdown.failedWeight || 0} pts

----------------------------------------------------------------------
EVALUATED STATUTORY DECLARATIONS (${ruleEvaluations.length})
----------------------------------------------------------------------
${ruleEvaluations.map((r, i) => `${i + 1}. [${r.status}] ${r.label} (${r.weight} pts)
   Detected: ${r.detectedValue}
   Confidence: ${Math.round((r.confidence || 0) * 100)}%
   Note: ${r.explanation || 'Evaluated'}
`).join('\n')}

----------------------------------------------------------------------
POTENTIAL ISSUES DETECTED (${issues.length})
----------------------------------------------------------------------
${issues.map((iss, i) => `${i + 1}. [${iss.status || iss.severity}] ${iss.title}
   Detected Value: ${iss.detectedValue}
   Confidence: ${Math.round((iss.confidence || 0) * 100)}%
   Why this matters: ${iss.explanation}
   Recommended action: ${iss.recommendation}
`).join('\n') || 'None. All mandatory statutory declarations detected.'}

======================================================================
STATUTORY LIMITATION NOTICE
======================================================================
LegalScan provides a preliminary, automated assessment of detectable
package declarations for assistance and review under the Legal Metrology
(Packaged Commodities) Rules, 2011. It does not constitute legal certification,
enforcement action, or a substitute for verification by the competent authority.
======================================================================`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="LegalScan_Report_${safeName}_${inspId}.txt"`);
    return res.send(reportText);
  } catch (error) {
    console.error('[downloadScanReport Error]:', error);
    return res.status(500).send('Error generating report download: ' + error.message);
  }
};

