import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import {
  cleanOcrText,
  assessLabelCandidate,
  extractStructuredFields
} from './extractionService.js';

/**
 * Deterministic Demo Products (as specified in hackathon requirements)
 * ONLY used when explicitly requested via demoType parameter
 */
export const DEMO_PRODUCTS = {
  compliant: {
    id: 'demo-compliant',
    productName: 'Premium Rice',
    manufacturer: 'ABC Foods Private Limited',
    manufacturerAddress: 'SF No. 42/1, Industrial Estate, Coimbatore, Tamil Nadu - 641021',
    packer: 'ABC Foods Packaging Division',
    importer: 'N/A (Domestically Produced)',
    netQuantity: '5 kg',
    mrp: '₹425 (Inclusive of all taxes)',
    batchNumber: 'B12345',
    manufacturingDate: '01/09/2026',
    bestBefore: '6 Months from packaging date',
    expiryDate: '01/03/2027',
    countryOfOrigin: 'India',
    consumerCare: '1800-123-4567 | support@abcfoods.in | P.O. Box 42 Coimbatore',
    productImageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
    rawExtractedText: `PREMIUM TRADITIONAL RICE\nMfd & Pkd by: ABC Foods Private Limited\nAddress: SF No. 42/1, Industrial Estate, Coimbatore, Tamil Nadu - 641021\nNet Weight: 5 kg\nMax Retail Price: Rs 425.00 (Incl. of all taxes)\nBatch No: B12345\nMfg Date: 01/09/2026\nBest Before: 6 Months from packaging date\nCountry of Origin: India\nConsumer Care Cell: Toll Free 1800-123-4567 or email support@abcfoods.in\nStandard unit: Net Qty verified under Legal Metrology Rules, 2011`,
    cleanedExtractedText: `PREMIUM TRADITIONAL RICE\nMfd & Pkd by: ABC Foods Private Limited\nAddress: SF No. 42/1, Industrial Estate, Coimbatore, Tamil Nadu - 641021\nNet Weight: 5 kg\nMax Retail Price: Rs 425.00 (Incl. of all taxes)\nBatch No: B12345\nMfg Date: 01/09/2026\nBest Before: 6 Months from packaging date\nCountry of Origin: India\nConsumer Care Cell: Toll Free 1800-123-4567 or email support@abcfoods.in`,
    ocrConfidence: 98,
    isPackageLabelCandidate: true
  },
  non_compliant: {
    id: 'demo-issues',
    productName: 'Premium Snack',
    manufacturer: 'XYZ Foods',
    manufacturerAddress: 'Tamil Nadu',
    packer: 'Not Detected',
    importer: 'Not Detected',
    netQuantity: '200 g',
    mrp: '₹80',
    batchNumber: 'Not Detected',
    manufacturingDate: 'Not Detected',
    bestBefore: 'Not Detected',
    expiryDate: 'Not Detected',
    countryOfOrigin: 'Not Detected',
    consumerCare: 'Not Detected',
    productImageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80',
    rawExtractedText: `PREMIUM CRUNCHY SNACK\nXYZ Foods, Tamil Nadu\nNet Wt: 200 g\nMRP: Rs 80\nCrispy & Delicious Potato Chips`,
    cleanedExtractedText: `PREMIUM CRUNCHY SNACK\nXYZ Foods, Tamil Nadu\nNet Wt: 200 g\nMRP: Rs 80\nCrispy & Delicious Potato Chips`,
    ocrConfidence: 85,
    isPackageLabelCandidate: true
  }
};

/**
 * Multi-Pass Optical Character Recognition using Tesseract.js with Sharp Preprocessing
 * Pass 1: High-Resolution RGB image (resolves light/color-contrasted panels)
 * Pass 2: High-Contrast Green Channel (resolves red/dark panel statutory declarations)
 */
export const extractTextFromImage = async (imagePath) => {
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.warn(`[OCR] File path does not exist: ${imagePath}`);
    return {
      rawText: '',
      cleanedText: '',
      confidence: 0,
      wordsCount: 0
    };
  }

  console.log(`[OCR] Multi-pass preprocessing & running OCR on ${imagePath}...`);
  const parsed = path.parse(imagePath);
  const p1Path = path.join(parsed.dir, `prep-p1-${parsed.name}.png`);
  const p2Path = path.join(parsed.dir, `prep-p2-${parsed.name}.png`);

  try {
    const metadata = await sharp(imagePath).metadata();
    const origWidth = metadata.width || 800;
    const targetWidth = Math.min(Math.max(origWidth * 2, 1600), 2200);

    // Pass 1: Upscaled RGB with sharpening
    await sharp(imagePath)
      .resize({ width: targetWidth, withoutEnlargement: false, kernel: sharp.kernel.lanczos3 })
      .normalize()
      .sharpen({ sigma: 1.2, m1: 1.0, m2: 2.0 })
      .png({ quality: 100 })
      .toFile(p1Path);

    // Pass 2: Green channel contrast for red/dark statutory panels
    await sharp(imagePath)
      .resize({ width: targetWidth, withoutEnlargement: false, kernel: sharp.kernel.lanczos3 })
      .extractChannel('green')
      .normalize()
      .sharpen()
      .png({ quality: 100 })
      .toFile(p2Path);

    // Run parallel OCR passes
    const [res1, res2] = await Promise.all([
      Tesseract.recognize(p1Path, 'eng').catch(() => ({ data: { text: '', confidence: 0, words: [] } })),
      Tesseract.recognize(p2Path, 'eng').catch(() => ({ data: { text: '', confidence: 0, words: [] } }))
    ]);

    const text1 = (res1.data?.text || '').trim();
    const text2 = (res2.data?.text || '').trim();

    // Deduplicate and combine text lines
    const combinedLines = [...new Set([...text1.split('\n'), ...text2.split('\n')])]
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .join('\n');

    const cleaned = cleanOcrText(combinedLines);
    const confidence = Math.max(Math.round(res1.data?.confidence || 0), Math.round(res2.data?.confidence || 0));
    const wordsCount = (res1.data?.words?.length || 0) + (res2.data?.words?.length || 0);

    console.log(`[OCR] Multi-pass finished. Combined text: ${combinedLines.length} chars, confidence: ${confidence}%`);

    return {
      rawText: combinedLines,
      cleanedText: cleaned,
      confidence,
      wordsCount
    };
  } catch (err) {
    console.error(`[OCR Error] Tesseract failed: ${err.message}`);
    return {
      rawText: '',
      cleanedText: '',
      confidence: 0,
      wordsCount: 0,
      error: err.message
    };
  } finally {
    // Cleanup temporary passes
    if (fs.existsSync(p1Path)) { try { fs.unlinkSync(p1Path); } catch {} }
    if (fs.existsSync(p2Path)) { try { fs.unlinkSync(p2Path); } catch {} }
  }
};

/**
 * Comprehensive Product Information Extraction
 * Extracts structured fields, confidence scores, and label quality assessment
 */
export const extractProductInformation = (ocrResult = {}, demoType = null) => {
  // If explicitly requested demo product
  if (demoType === 'compliant' || demoType === 'demo-compliant') {
    return {
      ...DEMO_PRODUCTS.compliant,
      isPackageLabelCandidate: true,
      qualityNotice: '',
      extractedFields: extractStructuredFields(DEMO_PRODUCTS.compliant.rawExtractedText, 98)
    };
  }
  if (demoType === 'non_compliant' || demoType === 'demo-issues' || demoType === 'issues') {
    return {
      ...DEMO_PRODUCTS.non_compliant,
      isPackageLabelCandidate: true,
      qualityNotice: '',
      extractedFields: extractStructuredFields(DEMO_PRODUCTS.non_compliant.rawExtractedText, 85)
    };
  }

  const rawText = typeof ocrResult === 'string' ? ocrResult : (ocrResult.rawText || '');
  const cleanedText = typeof ocrResult === 'string' ? cleanOcrText(ocrResult) : (ocrResult.cleanedText || cleanOcrText(rawText));
  const confidence = typeof ocrResult === 'object' ? (ocrResult.confidence || 50) : 50;

  // Assess whether the image is a valid packaged commodity label
  const candidateAssessment = assessLabelCandidate(cleanedText, confidence);
  const structuredFields = extractStructuredFields(cleanedText, confidence);

  return {
    productName: structuredFields.productName?.value || 'Packaged Commodity',
    manufacturer: structuredFields.manufacturer?.value || '',
    manufacturerAddress: structuredFields.manufacturerAddress?.value || '',
    packer: structuredFields.packer?.value || '',
    importer: structuredFields.importer?.value || '',
    netQuantity: structuredFields.netQuantity?.value || '',
    mrp: structuredFields.mrp?.value || '',
    batchNumber: structuredFields.batchNumber?.value || '',
    manufacturingDate: structuredFields.manufacturingDate?.value || '',
    bestBefore: structuredFields.bestBefore?.value || '',
    expiryDate: structuredFields.expiryDate?.value || '',
    countryOfOrigin: structuredFields.countryOfOrigin?.value || '',
    consumerCare: structuredFields.consumerCare?.value || '',
    
    rawExtractedText: rawText,
    cleanedExtractedText: cleanedText,
    ocrConfidence: confidence,
    isPackageLabelCandidate: candidateAssessment.isCandidate,
    qualityNotice: candidateAssessment.isCandidate ? '' : candidateAssessment.reason,
    extractedFields: structuredFields
  };
};

export const getDemoProductsList = () => {
  return [
    {
      type: 'compliant',
      title: 'Demo Product A (High Compliance)',
      name: DEMO_PRODUCTS.compliant.productName,
      description: 'Fully compliant package with all 10 mandatory Legal Metrology declarations detected.',
      expectedStatus: 'COMPLIANT',
      data: DEMO_PRODUCTS.compliant
    },
    {
      type: 'non_compliant',
      title: 'Demo Product B (With Issues)',
      name: DEMO_PRODUCTS.non_compliant.productName,
      description: 'Incomplete package label missing Consumer Care, Origin, Expiry, and partial address.',
      expectedStatus: 'NEEDS_REVIEW / HIGH_RISK',
      data: DEMO_PRODUCTS.non_compliant
    }
  ];
};

/**
 * Multi-Image & Video-Frame OCR Runner
 * Runs OCR across FRONT, BACK, TOP, BOTTOM, LIVE, and VIDEO views
 * Preserves individual view OCR and builds attributed combined text
 */
export const extractMultiViewText = async (viewsMap = {}) => {
  const ocrByView = {};
  const entries = Object.entries(viewsMap).filter(([_, p]) => p && fs.existsSync(p));

  if (entries.length === 0) {
    return {
      ocrByView: {},
      combinedRawText: '',
      combinedCleanedText: '',
      averageConfidence: 0,
      totalWordsCount: 0
    };
  }

  let totalConf = 0;
  let totalWords = 0;
  const rawParts = [];
  const cleanParts = [];

  for (const [viewName, filePath] of entries) {
    try {
      console.log(`[OCR MultiView] Processing view ${viewName} (${filePath})...`);
      const ocrRes = await extractTextFromImage(filePath);
      const fileName = path.basename(filePath);
      
      ocrByView[viewName] = {
        view: viewName,
        rawText: ocrRes.rawText,
        cleanedText: ocrRes.cleanedText,
        confidence: ocrRes.confidence,
        wordsCount: ocrRes.wordsCount,
        filePath,
        imageUrl: `/uploads/${fileName}`
      };

      totalConf += ocrRes.confidence;
      totalWords += ocrRes.wordsCount;

      if (ocrRes.cleanedText) {
        cleanParts.push(`--- [VIEW: ${viewName}] ---\n${ocrRes.cleanedText}`);
      }
      if (ocrRes.rawText) {
        rawParts.push(`--- [VIEW: ${viewName}] ---\n${ocrRes.rawText}`);
      }
    } catch (err) {
      console.warn(`[OCR MultiView] Error on view ${viewName}:`, err.message);
      ocrByView[viewName] = {
        view: viewName,
        rawText: '',
        cleanedText: '',
        confidence: 0,
        wordsCount: 0,
        filePath,
        error: err.message
      };
    }
  }

  const averageConfidence = entries.length > 0 ? Math.round(totalConf / entries.length) : 0;
  const combinedRawText = rawParts.join('\n\n');
  const combinedCleanedText = cleanParts.join('\n\n');

  return {
    ocrByView,
    combinedRawText,
    combinedCleanedText,
    averageConfidence,
    totalWordsCount: totalWords
  };
};

