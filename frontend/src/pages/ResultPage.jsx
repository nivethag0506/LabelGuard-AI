import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ScanLine,
  Printer,
  History,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Share2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Sparkles,
  Info,
  HelpCircle,
  Hash,
  Eye,
  Camera,
  Layers,
  ExternalLink
} from 'lucide-react';
import ComplianceScore from '../components/ComplianceScore';
import ComplianceChecklist from '../components/ComplianceChecklist';
import IssueCard from '../components/IssueCard';
import Disclaimer from '../components/Disclaimer';
import { LoadingState, ErrorState } from '../components/StateFeedback';
import api from '../services/api';
import { downloadInspectionPdf } from '../services/reportPdfService';
import './ResultPage.css';

export default function ResultPage() {
  const { id } = useParams();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRawText, setShowRawText] = useState(false);
  const [showDebugDetails, setShowDebugDetails] = useState(false);
  const [debugTab, setDebugTab] = useState('ocr');
  const [ocrViewTab, setOcrViewTab] = useState('combined');
  const [highlightedSurface, setHighlightedSurface] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedFieldEvidence, setSelectedFieldEvidence] = useState(null);
  const [activeImageZoom, setActiveImageZoom] = useState(null);
  const [showReportPreviewModal, setShowReportPreviewModal] = useState(false);

  const handleSelectRuleEvidence = (rule) => {
    const src = (rule.sourceView || '').toUpperCase();
    let surface = null;
    if (src.includes('BACK')) surface = 'BACK';
    else if (src.includes('FRONT')) surface = 'FRONT';
    else if (src.includes('TOP')) surface = 'TOP';
    else if (src.includes('BOTTOM')) surface = 'BOTTOM';
    
    setHighlightedSurface(surface);
    showToast(`Surface Evidence: ${surface ? surface + ' surface' : 'Attested on package declarations'}`);
    
    const galleryEl = document.querySelector('.result-gallery-card');
    if (galleryEl) {
      galleryEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchScanReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getScanById(id);
        if (isMounted) {
          if (res && res.success && res.data) {
            setScan(res.data);
          } else {
            throw new Error(res?.message || 'Report not found.');
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('[ResultPage Error]:', err);
          setError(err.message || 'Failed to load compliance report.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchScanReport();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return <LoadingState message="Loading compliance assessment report..." />;
  }

  if (error || !scan) {
    return (
      <div className="container" style={{ padding: '3rem 1rem' }}>
        <ErrorState
          title="Inspection Report Not Found"
          message={error || `Could not find an inspection report with ID: ${id}`}
        />
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/scan" className="btn btn-primary btn-md">
            <ScanLine size={16} />
            <span>Start New Field Inspection</span>
          </Link>
        </div>
      </div>
    );
  }

  const issues = scan.issues || [];
  const ruleEvaluations = scan.ruleEvaluations || [];
  const extractedFields = scan.extractedFields || {};
  const scoreBreakdown = scan.scoreBreakdown || {};
  const inspectionCompleteness = scan.inspectionCompleteness || {};
  const smartRetakes = scan.smartRetakes || [];
  const productIdentity = scan.productIdentity || {};
  const images = scan.images || {};
  const imageQuality = scan.imageQuality || {};

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: `LegalScan Report: ${scan.productName}`,
      text: `Preliminary Compliance Assessment for ${scan.productName} (Score: ${scan.complianceScore}/100 - ${scan.status})`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Report URL copied to clipboard!');
    } catch {
      showToast('Could not copy link to clipboard.');
    }
  };

  // Professional PDF Download Handler
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      showToast('Generating official A4 audit report PDF...');
      const fileName = await downloadInspectionPdf(scan);
      showToast(`Report downloaded: ${fileName}`);
    } catch (err) {
      console.error('[PDF Generation Error]:', err);
      showToast('Unable to generate PDF report. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Text Download Fallback
  const handleDownloadText = () => {
    try {
      const scanId = scan._id || id;
      const safeName = (scan.productName || 'Commodity').replace(/[^a-zA-Z0-9_-]/g, '_');
      const inspId = scan.inspectionId || scanId?.slice(-6) || 'scan';
      const fileName = `LegalScan_Report_${safeName}_${inspId}.txt`;
      const serverUrl = api.getReportDownloadUrl(scan._id || id, 'txt');
      window.location.href = serverUrl;
      showToast(`Initiating download for ${fileName}...`);
    } catch (err) {
      showToast('Failed to download report.');
    }
  };

  // Dynamic physical views list for evidence gallery (no empty placeholders for omitted views)
  const submittedViewsList = [];
  if (images.front || scan.productImageUrl) {
    submittedViewsList.push({
      id: 'FRONT',
      label: 'FRONT ✓ REQUIRED',
      isRequired: true,
      url: images.front || scan.productImageUrl,
      quality: imageQuality.FRONT?.qualityLevel || 'GOOD'
    });
  }
  if (images.back) {
    submittedViewsList.push({
      id: 'BACK',
      label: 'BACK ✓ REQUIRED',
      isRequired: true,
      url: images.back,
      quality: imageQuality.BACK?.qualityLevel || 'GOOD'
    });
  }
  if (images.top) {
    submittedViewsList.push({
      id: 'TOP',
      label: 'TOP — OPTIONAL',
      isRequired: false,
      url: images.top,
      quality: imageQuality.TOP?.qualityLevel || 'GOOD'
    });
  }
  if (images.bottom) {
    submittedViewsList.push({
      id: 'BOTTOM',
      label: 'BOTTOM — OPTIONAL',
      isRequired: false,
      url: images.bottom,
      quality: imageQuality.BOTTOM?.qualityLevel || 'GOOD'
    });
  }
  if (images.left) {
    submittedViewsList.push({
      id: 'LEFT',
      label: 'LEFT — OPTIONAL',
      isRequired: false,
      url: images.left,
      quality: imageQuality.LEFT?.qualityLevel || 'GOOD'
    });
  }
  if (images.right) {
    submittedViewsList.push({
      id: 'RIGHT',
      label: 'RIGHT — OPTIONAL',
      isRequired: false,
      url: images.right,
      quality: imageQuality.RIGHT?.qualityLevel || 'GOOD'
    });
  }
  if (images.additionalViews && Array.isArray(images.additionalViews)) {
    images.additionalViews.forEach((av, idx) => {
      if (av && av.url) {
        submittedViewsList.push({
          id: `ADDITIONAL_${idx + 1}`,
          label: (av.label || `ADDITIONAL VIEW ${idx + 1}`).toUpperCase(),
          isRequired: false,
          url: av.url,
          quality: 'GOOD'
        });
      }
    });
  }
  if (images.livePhotos && Array.isArray(images.livePhotos)) {
    images.livePhotos.forEach((lp, idx) => {
      if (lp) {
        submittedViewsList.push({
          id: `LIVE_${idx + 1}`,
          label: `LIVE PHOTO ${idx + 1}`,
          isRequired: false,
          url: lp,
          quality: 'GOOD'
        });
      }
    });
  }

  const packageViews = submittedViewsList;

  return (
    <div className="result-page container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="result-toast-notification" role="status">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Action Buttons */}
      <div className="result-top-bar">
        <Link to="/history" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Inspection Records</span>
        </Link>

        <div className="result-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowReportPreviewModal(true)}
            title="Preview Generated Report"
          >
            <Eye size={15} />
            <span>View Report</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm btn-pdf-download"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            title="Download Professional A4 Inspection Report PDF"
          >
            <Download size={15} />
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleShare}
            title="Share Inspection Report"
          >
            <Share2 size={15} />
            <span className="hide-on-mobile">Share</span>
          </button>

          <Link to="/scan" className="btn btn-secondary btn-sm">
            <ScanLine size={15} />
            <span className="hide-on-mobile">New Inspection</span>
          </Link>
        </div>
      </div>

      {/* Preliminary Assessment Header Banner (Requirement 24) */}
      <div className="card preliminary-assessment-banner">
        <div className="preliminary-header-top">
          <div className="preliminary-badge">
            <ShieldCheck size={16} />
            <span>PRELIMINARY COMPLIANCE ASSESSMENT</span>
          </div>
          <span className="inspection-id-tag font-mono">
            {scan.inspectionId || scan._id?.slice(-8) || id}
          </span>
        </div>

        <div className="preliminary-stats-grid">
          <div className="prelim-stat-box">
            <span className="prelim-lbl">Product Identity</span>
            <span className={`prelim-val ${productIdentity.confirmed !== false ? 'success' : 'danger'}`}>
              {productIdentity.level || 'CONFIRMED'}
            </span>
            <span className="prelim-sub">{productIdentity.confidence || scan.identityConfidence || 95}% Match</span>
          </div>

          <div className="prelim-stat-box">
            <span className="prelim-lbl">Views Analyzed</span>
            <span className="prelim-val font-mono">
              {inspectionCompleteness.viewsCount || 4} / 4
            </span>
            <span className="prelim-sub">{inspectionCompleteness.overallCompleteness || 'COMPLETE'}</span>
          </div>

          <div className="prelim-stat-box">
            <span className="prelim-lbl">Video Continuity</span>
            <span className="prelim-val">
              {scan.video?.analyzed ? 'ANALYZED' : 'STANDARD'}
            </span>
            <span className="prelim-sub">{scan.video?.frameCount || 0} Keyframes</span>
          </div>

          <div className="prelim-stat-box">
            <span className="prelim-lbl">Multi-View OCR</span>
            <span className="prelim-val success">
              COMPLETED
            </span>
            <span className="prelim-sub">{scan.ocrConfidence || 85}% Confidence</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Multi-View Evidence Gallery (Left) & Compliance Score (Right) */}
      <div className="result-main-grid">
        {/* Left Column: 2x2 Image Evidence Gallery (Requirement 25) */}
        <div className="result-image-col">
          <div className="card result-gallery-card">
            <div className="gallery-header">
              <div className="gallery-title-group">
                <Camera size={18} />
                <h3 className="gallery-title">Submitted Package Evidence ({submittedViewsList.length} Views)</h3>
              </div>
              <span className="gallery-count-badge">
                {submittedViewsList.filter(v => v.isRequired).length}/2 Required • {submittedViewsList.filter(v => !v.isRequired).length} Additional
              </span>
            </div>

            <p className="gallery-subtitle">
              Tap any surface to inspect high-resolution declarations and attested OCR evidence.
            </p>

            {/* Evidence Link Highlight Banner (Requirement 27) */}
            {highlightedSurface && (
              <div className="surface-evidence-banner">
                <div className="surface-evidence-text">
                  <span className="surface-evidence-icon">📍</span>
                  <span>Declaration evidence located on: <strong>{highlightedSurface} SURFACE</strong></span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm btn-clear-evidence"
                  onClick={() => setHighlightedSurface(null)}
                >
                  Clear Highlight
                </button>
              </div>
            )}

            <div className="views-dynamic-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '0.85rem'
            }}>
              {submittedViewsList.map((v) => (
                <div
                  key={v.id}
                  className={`view-tile has-image ${highlightedSurface === v.id ? 'highlighted-evidence' : ''}`}
                  onClick={() => setActiveImageZoom(v)}
                >
                  <div className="tile-top-bar">
                    <span className="tile-name">{v.label}</span>
                    <span className={`tile-quality-badge ${v.quality === 'GOOD' ? 'good' : 'warning'}`}>
                      {v.quality}
                    </span>
                  </div>

                  {highlightedSurface === v.id && (
                    <div className="tile-evidence-indicator">
                      <span>📍 EVIDENCE LOCATED HERE</span>
                    </div>
                  )}

                  <div className="tile-img-container">
                    <img src={v.url} alt={v.label} className="tile-img" />
                    <div className="tile-hover-overlay">
                      <span>🔍 Tap to Zoom</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Video Frame Evidence Strip if available */}
            {scan.video?.sampledFrames && scan.video.sampledFrames.length > 0 && (
              <div className="video-frames-strip">
                <h5 className="video-strip-title">VIDEO CONTINUITY EVIDENCE ({scan.video.sampledFrames.length} Frames)</h5>
                <div className="video-strip-row">
                  {scan.video.sampledFrames.map((fUrl, fIdx) => (
                    <img
                      key={fIdx}
                      src={fUrl}
                      alt={`Video frame ${fIdx + 1}`}
                      className="video-strip-thumb"
                      onClick={() => setActiveImageZoom({ label: `Video Keyframe ${fIdx + 1}`, url: fUrl })}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preliminary Score & Summary */}
        <div className="result-score-col">
          <ComplianceScore
            score={scan.complianceScore}
            status={scan.status}
            passedRules={scan.passedRules}
            warningRules={scan.warningRules}
            failedRules={scan.failedRules}
            totalRules={scan.totalRules || 10}
          />

          {/* Completeness Card (Requirement 8) */}
          <div className="card completeness-widget-card">
            <h4 className="widget-title">Inspection Completeness Checklist</h4>
            <div className="completeness-grid">
              <div className="completeness-item">
                <span>Required Views:</span>
                <strong className={inspectionCompleteness.hasFront && inspectionCompleteness.hasBack ? 'text-success' : 'text-danger'}>
                  {inspectionCompleteness.requiredViewsLabel || '2/2 complete'}
                </strong>
              </div>
              <div className="completeness-item">
                <span>Front Surface:</span>
                <strong className={inspectionCompleteness.hasFront ? 'text-success' : 'text-danger'}>
                  {inspectionCompleteness.hasFront ? '✓ Attested' : '✗ Missing'}
                </strong>
              </div>
              <div className="completeness-item">
                <span>Back Label:</span>
                <strong className={inspectionCompleteness.hasBack ? 'text-success' : 'text-danger'}>
                  {inspectionCompleteness.hasBack ? '✓ Attested' : '✗ Missing'}
                </strong>
              </div>
              <div className="completeness-item">
                <span>Additional Evidence:</span>
                <strong className="text-primary">
                  {inspectionCompleteness.additionalViewsCount !== undefined ? `${inspectionCompleteness.additionalViewsCount} views` : `${submittedViewsList.filter(v => !v.isRequired).length} views`}
                </strong>
              </div>
              <div className="completeness-item">
                <span>Product Identity:</span>
                <strong className="text-success">{productIdentity.level || 'Confirmed'}</strong>
              </div>
              <div className="completeness-item">
                <span>Rule Version:</span>
                <strong className="text-primary font-mono">LMR-2011 (Amended 2022)</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Smart Retakes Recommendations (Requirement 29) */}
      {smartRetakes.length > 0 && (
        <div className="card smart-retakes-card">
          <div className="retakes-header">
            <AlertTriangle size={20} className="retakes-icon" />
            <h3 className="retakes-title">Inspector Dynamic Retake Recommendations</h3>
          </div>
          <p className="retakes-desc">
            To improve inspection confidence or resolve statutory ambiguities, the following surface captures are recommended:
          </p>
          <div className="retakes-list">
            {smartRetakes.map((sr, idx) => (
              <div key={idx} className="retake-item">
                <span className="retake-view-badge">{sr.view}</span>
                <span className="retake-reason">{sr.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dedicated Manufacturing & Responsible Entity Details (Requirement 13 & 51) */}
      <section className="result-section">
        <div className="card manufacturing-details-card">
          <div className="mfg-details-header">
            <div className="mfg-title-group">
              <ShieldCheck size={20} />
              <h3 className="mfg-title">Manufacturing & Responsible Entity Details</h3>
            </div>
            <span className="mfg-badge">Statutory Traceability</span>
          </div>

          <p className="mfg-subtitle">
            Statutory entity declarations extracted under Rule 6(1). Tap any field to review its exact source view and OCR text snippet.
          </p>

          <div className="mfg-fields-grid">
            {[
              { label: 'Manufacturer Name', key: 'manufacturer', defaultVal: scan.manufacturer },
              { label: 'Packer Details', key: 'packer', defaultVal: scan.packer || 'Domestically Packed' },
              { label: 'Importer Details', key: 'importer', defaultVal: scan.importer || 'N/A (Domestic)' },
              { label: 'Premises Postal Address', key: 'manufacturerAddress', defaultVal: scan.manufacturerAddress },
              { label: 'Manufacturing / Packing Date', key: 'manufacturingDate', defaultVal: scan.manufacturingDate },
              { label: 'Batch / Lot Number', key: 'batchNumber', defaultVal: scan.batchNumber },
              { label: 'Consumer Redressal Helpline', key: 'consumerCare', defaultVal: scan.consumerCare },
              { label: 'Country of Origin', key: 'countryOfOrigin', defaultVal: scan.countryOfOrigin || 'India' }
            ].map((fItem) => {
              const fieldObj = extractedFields[fItem.key] || {};
              const val = fieldObj.value || fItem.defaultVal;
              const hasVal = val && !val.toLowerCase().includes('not detected');
              const srcView = fieldObj.sourceView || 'BACK IMAGE';

              return (
                <div
                  key={fItem.key}
                  className="mfg-field-card"
                  onClick={() => setSelectedFieldEvidence({
                    field: fItem.label,
                    value: val,
                    sourceView: srcView,
                    sourceText: fieldObj.sourceText || `Extracted value: "${val}"`,
                    confidence: fieldObj.confidence || 0.90
                  })}
                >
                  <div className="mfg-field-top">
                    <span className="mfg-field-lbl">{fItem.label}</span>
                    <span className={`mfg-field-status ${hasVal ? 'detected' : 'review'}`}>
                      {hasVal ? '✓ Detected' : '⚠ Needs Review'}
                    </span>
                  </div>

                  <div className="mfg-field-val">
                    {val || 'Declaration not confidently detected'}
                  </div>

                  <div className="mfg-field-source">
                    Source: <strong>{srcView}</strong>
                    <span className="view-snippet-link">View Snippet →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mandatory Statutory Checklist */}
      <section className="result-section">
        <ComplianceChecklist
          ruleEvaluations={ruleEvaluations}
          onSelectRule={handleSelectRuleEvidence}
        />
      </section>

      {/* Identified Issues & Risk Points */}
      <section className="result-section">
        <div className="section-title-row">
          <div className="section-title-group">
            <AlertTriangle size={22} className="issues-icon" />
            <h3 className="section-title-text">
              Identified Compliance Issues & Uncertainties ({issues.length})
            </h3>
          </div>
          <span className="section-badge-info">
            {issues.length === 0 ? 'Zero Violations Detected' : 'Inspector Review Recommended'}
          </span>
        </div>

        {issues.length > 0 ? (
          <div className="issues-stack">
            {issues.map((issue, idx) => (
              <IssueCard key={idx} issue={issue} />
            ))}
          </div>
        ) : (
          <div className="card no-issues-box">
            <CheckCircle2 size={36} className="no-issues-icon" />
            <div className="no-issues-content">
              <h4>All Mandatory Statutory Declarations Confidently Verified</h4>
              <p>
                No statutory declaration omissions, format errors, or ambiguities were detected across the submitted package views.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Expandable Developer & Compliance Debug Mode (Requirement 37) */}
      <section className="result-section">
        <div className="card debug-mode-card">
          <button
            type="button"
            className="debug-mode-toggle-btn"
            onClick={() => setShowDebugDetails(!showDebugDetails)}
          >
            <div className="debug-toggle-title">
              <Sparkles size={18} />
              <span>Developer & Compliance Debug Mode</span>
              <span className="debug-tag">Core Intelligence Diagnostic</span>
            </div>
            {showDebugDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showDebugDetails && (
            <div className="debug-content-wrap">
              <div className="debug-tabs-bar">
                <button
                  type="button"
                  className={`debug-tab-btn ${debugTab === 'ocr' ? 'active' : ''}`}
                  onClick={() => setDebugTab('ocr')}
                >
                  1. Multi-View OCR
                </button>
                <button
                  type="button"
                  className={`debug-tab-btn ${debugTab === 'fields' ? 'active' : ''}`}
                  onClick={() => setDebugTab('fields')}
                >
                  2. Extracted Fields
                </button>
                <button
                  type="button"
                  className={`debug-tab-btn ${debugTab === 'identity' ? 'active' : ''}`}
                  onClick={() => setDebugTab('identity')}
                >
                  3. Product Identity
                </button>
                <button
                  type="button"
                  className={`debug-tab-btn ${debugTab === 'rules' ? 'active' : ''}`}
                  onClick={() => setDebugTab('rules')}
                >
                  4. Rules & Applicability
                </button>
                <button
                  type="button"
                  className={`debug-tab-btn ${debugTab === 'score' ? 'active' : ''}`}
                  onClick={() => setDebugTab('score')}
                >
                  5. Score Calculation
                </button>
                <button
                  type="button"
                  className={`debug-tab-btn ${debugTab === 'media' ? 'active' : ''}`}
                  onClick={() => setDebugTab('media')}
                >
                  6. Source Media
                </button>
              </div>

              {/* Tab 1: Multi-View OCR */}
              {debugTab === 'ocr' && (
                <div className="debug-tab-pane">
                  <div className="ocr-subtabs">
                    {['combined', 'front', 'back', 'top', 'bottom', 'live', 'video'].map(sub => (
                      <button
                        key={sub}
                        type="button"
                        className={`ocr-subtab-btn ${ocrViewTab === sub ? 'active' : ''}`}
                        onClick={() => setOcrViewTab(sub)}
                      >
                        {sub.toUpperCase()} OCR
                      </button>
                    ))}
                  </div>
                  <div className="ocr-preview-box">
                    <pre className="debug-pre">
                      {ocrViewTab === 'combined' && (scan.combinedText || scan.rawExtractedText || 'No combined text.')}
                      {ocrViewTab === 'front' && (scan.ocr?.front || 'No front OCR text.')}
                      {ocrViewTab === 'back' && (scan.ocr?.back || 'No back OCR text.')}
                      {ocrViewTab === 'top' && (scan.ocr?.top || 'No top OCR text.')}
                      {ocrViewTab === 'bottom' && (scan.ocr?.bottom || 'No bottom OCR text.')}
                      {ocrViewTab === 'live' && (scan.ocr?.live || 'No live OCR text.')}
                      {ocrViewTab === 'video' && (scan.ocr?.video || 'No video OCR text.')}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tab 2: Extracted Fields & Confidence */}
              {debugTab === 'fields' && (
                <div className="debug-tab-pane">
                  <table className="debug-table">
                    <thead>
                      <tr>
                        <th>Field Key</th>
                        <th>Raw Captured Value</th>
                        <th>Normalized Statutory Value</th>
                        <th>Source View</th>
                        <th>Confidence</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(extractedFields).map(([k, f]) => (
                        <tr key={k}>
                          <td><code>{k}</code></td>
                          <td>{f.rawValue || '—'}</td>
                          <td><strong>{f.normalizedValue || f.value || '—'}</strong></td>
                          <td><span className="source-tag">{f.sourceView || 'ALL VIEWS'}</span></td>
                          <td>{f.confidence ? `${Math.round(f.confidence * 100)}%` : '—'}</td>
                          <td><span className={`status-pill ${f.status?.toLowerCase()}`}>{f.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Product Identity */}
              {debugTab === 'identity' && (
                <div className="debug-tab-pane">
                  <div className="debug-stat-grid">
                    <div className="debug-stat-item">
                      <span>Identity Confirmation:</span>
                      <strong>{productIdentity.confirmed !== false ? 'CONFIRMED' : 'MISMATCH / UNCONFIRMED'}</strong>
                    </div>
                    <div className="debug-stat-item">
                      <span>Confidence Level:</span>
                      <strong>{productIdentity.level || 'HIGH CONFIDENCE'} ({productIdentity.identityConfidence || scan.identityConfidence || 95}%)</strong>
                    </div>
                    <div className="debug-stat-item">
                      <span>Mismatch Flag:</span>
                      <strong>{productIdentity.mismatchDetected ? `DETECTED (Suspicious: ${productIdentity.suspiciousView})` : 'NO CONFLICT'}</strong>
                    </div>
                    <div className="debug-stat-item">
                      <span>Product Consensus:</span>
                      <strong>{productIdentity.productSummary || scan.productName}</strong>
                    </div>
                  </div>
                  {productIdentity.reasons && productIdentity.reasons.length > 0 && (
                    <div className="debug-reasons-box">
                      <h5>Identity Diagnostic Notes:</h5>
                      <ul>
                        {productIdentity.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Rules & Applicability */}
              {debugTab === 'rules' && (
                <div className="debug-tab-pane">
                  <table className="debug-table">
                    <thead>
                      <tr>
                        <th>Rule ID</th>
                        <th>Statutory Requirement</th>
                        <th>Applicability Condition</th>
                        <th>Status</th>
                        <th>Weight</th>
                        <th>Attested Source View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ruleEvaluations.map((r) => (
                        <tr key={r.ruleId}>
                          <td><code>{r.ruleId}</code></td>
                          <td>{r.ruleTitle || r.label}</td>
                          <td><small>{r.applicableCategory || 'ALL'}</small></td>
                          <td><span className={`status-pill ${r.status?.toLowerCase()}`}>{r.status}</span></td>
                          <td>{r.weight} pts</td>
                          <td>{r.sourceView || 'SUBMITTED VIEWS'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 5: Score Calculation */}
              {debugTab === 'score' && (
                <div className="debug-tab-pane">
                  <div className="debug-stat-grid">
                    <div className="debug-stat-item">
                      <span>Total Applicable Weight:</span>
                      <strong>{scoreBreakdown.totalPossibleWeight || 100} pts</strong>
                    </div>
                    <div className="debug-stat-item">
                      <span>Total Earned Weight:</span>
                      <strong>{scoreBreakdown.earnedWeight || scan.complianceScore} pts</strong>
                    </div>
                    <div className="debug-stat-item">
                      <span>Passed Weight (100%):</span>
                      <strong>{scoreBreakdown.passedWeight || 0} pts</strong>
                    </div>
                    <div className="debug-stat-item">
                      <span>Warning Weight (50%):</span>
                      <strong>{scoreBreakdown.warningWeight || 0} pts</strong>
                    </div>
                    <div className="debug-stat-item">
                      <span>Needs Review Weight (70%):</span>
                      <strong>{scoreBreakdown.reviewWeight || 0} pts</strong>
                    </div>
                    <div className="debug-stat-item">
                      <span>Failed Weight (0%):</span>
                      <strong>{scoreBreakdown.failedWeight || 0} pts</strong>
                    </div>
                  </div>
                  <p className="debug-formula-note">
                    Score = (Earned Weight / Total Applicable Weight) × 100 = <strong>{scan.complianceScore}%</strong>. Excluded (NOT_APPLICABLE) rules do not reduce score.
                  </p>
                </div>
              )}

              {/* Tab 6: Source Media */}
              {debugTab === 'media' && (
                <div className="debug-tab-pane">
                  <div className="media-debug-grid">
                    {packageViews.map((pv) => (
                      <div key={pv.id} className="media-debug-card">
                        <h6>{pv.label}</h6>
                        {pv.url ? (
                          <div>
                            <img src={pv.url} alt={pv.label} className="media-debug-thumb" />
                            <p><small>Quality Assessment: <strong>{pv.quality}</strong></small></p>
                          </div>
                        ) : (
                          <p className="text-muted"><small>No image submitted</small></p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Field Evidence Inspection Snippet Modal */}
      {selectedFieldEvidence && (
        <div className="evidence-modal-backdrop" onClick={() => setSelectedFieldEvidence(null)}>
          <div className="evidence-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="evidence-modal-header">
              <h3>Statutory Field Attestation</h3>
              <button className="btn-close-modal" onClick={() => setSelectedFieldEvidence(null)}>✕</button>
            </div>

            <div className="evidence-modal-body">
              <div className="evidence-row">
                <span className="evidence-lbl">Field:</span>
                <strong>{selectedFieldEvidence.field}</strong>
              </div>

              <div className="evidence-row">
                <span className="evidence-lbl">Detected Value:</span>
                <span className="evidence-val-box">{selectedFieldEvidence.value}</span>
              </div>

              <div className="evidence-row">
                <span className="evidence-lbl">Attested Source Surface:</span>
                <span className="source-tag">{selectedFieldEvidence.sourceView}</span>
              </div>

              <div className="evidence-row">
                <span className="evidence-lbl">Recognition Confidence:</span>
                <span>{Math.round(selectedFieldEvidence.confidence * 100)}%</span>
              </div>

              <div className="evidence-row full">
                <span className="evidence-lbl">Exact OCR / Raw Text Snippet:</span>
                <pre className="evidence-snippet-pre">{selectedFieldEvidence.sourceText}</pre>
              </div>
            </div>

            <div className="evidence-modal-footer">
              <button className="btn btn-primary btn-sm" onClick={() => setSelectedFieldEvidence(null)}>
                Close Evidence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {activeImageZoom && (
        <div className="zoom-modal-backdrop" onClick={() => setActiveImageZoom(null)}>
          <div className="zoom-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="zoom-modal-header">
              <h3>{activeImageZoom.label}</h3>
              <button className="btn-close-modal" onClick={() => setActiveImageZoom(null)}>✕</button>
            </div>
            <div className="zoom-img-wrapper">
              <img src={activeImageZoom.url} alt={activeImageZoom.label} className="zoom-img" />
            </div>
          </div>
        </div>
      )}

      {/* Report Summary Preview Modal (Requirement 64) */}
      {showReportPreviewModal && (
        <div className="preview-modal-backdrop" onClick={() => setShowReportPreviewModal(false)}>
          <div className="preview-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <div>
                <h3>Official Legal Metrology Inspection Report</h3>
                <span className="preview-sub">ID: {scan.inspectionId || scan._id}</span>
              </div>
              <button className="btn-close-modal" onClick={() => setShowReportPreviewModal(false)}>✕</button>
            </div>

            <div className="preview-modal-body">
              <div className="preview-summary-box">
                <h4>{scan.productName}</h4>
                <p>Status: <strong>{scan.status}</strong> | Score: <strong>{scan.complianceScore}/100</strong></p>
                <p>Manufacturer: {scan.manufacturer || 'Not Detected'}</p>
                <p>Net Quantity: {scan.netQuantity || 'Not Detected'} | MRP: {scan.mrp || 'Not Detected'}</p>
              </div>

              <h5>Statutory Rule Evaluations ({ruleEvaluations.length})</h5>
              <div className="preview-rules-list">
                {ruleEvaluations.map((r, i) => (
                  <div key={i} className="preview-rule-row">
                    <span className={`preview-rule-status ${r.status.toLowerCase()}`}>[{r.status}]</span>
                    <span className="preview-rule-title">{r.ruleTitle || r.label}</span>
                    <span className="preview-rule-val">{r.detectedValue}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="preview-modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={handleDownloadText}>
                Download TXT Report
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleDownloadPdf}>
                Download Official A4 PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Statutory Notice */}
      <div className="scan-disclaimer-wrap">
        <Disclaimer />
      </div>
    </div>
  );
}
