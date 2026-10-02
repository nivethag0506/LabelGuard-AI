import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanLine,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Upload,
  Info,
  ShieldCheck,
  Zap,
  ArrowRight,
  FileEdit,
  ChevronDown,
  ChevronUp,
  Camera,
  Layers
} from 'lucide-react';
import MobileInspectionWizard from '../components/MobileInspectionWizard';
import AnalysisLoader from '../components/AnalysisLoader';
import Disclaimer from '../components/Disclaimer';
import api from '../services/api';
import './ScanPage.css';

export default function ScanPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('wizard'); // 'wizard' | 'demo' | 'audit'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mismatchData, setMismatchData] = useState(null);

  // Custom/Manual product data state for verifying real products directly
  const [customData, setCustomData] = useState({
    productName: '',
    manufacturer: '',
    manufacturerAddress: '',
    netQuantity: '',
    mrp: '',
    batchNumber: '',
    manufacturingDate: '',
    bestBefore: '',
    countryOfOrigin: 'India',
    consumerCare: '',
  });

  const handleCustomChange = (field, value) => {
    setCustomData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle Multi-View Inspection Submit (Primary Flow)
  const handleMultiViewSubmit = async ({ views, additionalViews, livePhotos, video, videoFrames }) => {
    if (isAnalyzing) return;

    try {
      setIsAnalyzing(true);
      setErrorMsg('');
      setMismatchData(null);

      const [res] = await Promise.all([
        api.createScan({ views, additionalViews, livePhotos, video, videoFrames }),
        new Promise((resolve) => setTimeout(resolve, 1400))
      ]);

      if (res && res.success && res.data) {
        if (res.data.status === 'PRODUCT_MISMATCH') {
          // Gate Halt: Mismatch detected! Do NOT generate compliance score
          setIsAnalyzing(false);
          setMismatchData(res.data);
        } else if (res.data._id) {
          navigate(`/result/${res.data._id}`);
        }
      } else {
        throw new Error(res?.message || 'Failed to complete field inspection.');
      }
    } catch (err) {
      console.error('[Multi-View Inspection Error]:', err);
      setErrorMsg(err.message || 'Error occurred during field inspection analysis.');
      setIsAnalyzing(false);
    }
  };

  // Handle custom product compliance audit
  const handleAnalyzeCustom = async (e) => {
    e.preventDefault();
    if (isAnalyzing) return;
    if (!customData.productName && !customData.manufacturer) {
      setErrorMsg('Please enter at least a Product Name or Manufacturer details.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMsg('');

      const [res] = await Promise.all([
        api.createScan({ productData: customData }),
        new Promise((resolve) => setTimeout(resolve, 1400))
      ]);

      if (res && res.success && res.data?._id) {
        navigate(`/result/${res.data._id}`);
      } else {
        throw new Error(res?.message || 'Failed to analyze custom commodity.');
      }
    } catch (err) {
      console.error('[Custom Analysis Error]:', err);
      setErrorMsg(err.message || 'Analysis failed.');
      setIsAnalyzing(false);
    }
  };

  // Quick Demo Execution (Compliant Product A)
  const handleRunDemoCompliant = async () => {
    if (isAnalyzing) return;

    try {
      setIsAnalyzing(true);
      setErrorMsg('');

      const [res] = await Promise.all([
        api.createScan({ demoType: 'compliant' }),
        new Promise((resolve) => setTimeout(resolve, 1400))
      ]);

      if (res && res.success && res.data?._id) {
        navigate(`/result/${res.data._id}`);
      } else {
        throw new Error(res?.message || 'Failed to analyze demo product.');
      }
    } catch (err) {
      console.error('[Demo Compliant Error]:', err);
      setErrorMsg(err.message || 'Demo analysis failed.');
      setIsAnalyzing(false);
    }
  };

  // Quick Demo Execution (Product B With Issues)
  const handleRunDemoIssues = async () => {
    if (isAnalyzing) return;

    try {
      setIsAnalyzing(true);
      setErrorMsg('');

      const [res] = await Promise.all([
        api.createScan({ demoType: 'non_compliant' }),
        new Promise((resolve) => setTimeout(resolve, 1400))
      ]);

      if (res && res.success && res.data?._id) {
        navigate(`/result/${res.data._id}`);
      } else {
        throw new Error(res?.message || 'Failed to analyze demo product with issues.');
      }
    } catch (err) {
      console.error('[Demo Issues Error]:', err);
      setErrorMsg(err.message || 'Demo analysis failed.');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="scan-page container">
      {/* Page Title */}
      <div className="scan-page-header">
        <div className="scan-page-badge">
          <ScanLine size={16} />
          <span>START REAL INSPECTION</span>
        </div>
        <h1 className="scan-page-title">Legal Metrology Package Inspection</h1>
        <p className="scan-page-subtitle">
          Upload or capture a product package to begin inspection. All compliance results and OCR extractions are derived exclusively from actual submitted package media.
        </p>
      </div>

      {/* Primary Real-World Inspection Mode Navigation */}
      <div className="inspection-tabs-bar">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'wizard' ? 'active' : ''}`}
          onClick={() => { setActiveTab('wizard'); setMismatchData(null); }}
        >
          <Camera size={18} />
          <span>Field Inspection (4 Real Views + Video)</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => { setActiveTab('audit'); setMismatchData(null); }}
        >
          <FileEdit size={18} />
          <span>Direct Declaration Audit</span>
        </button>

        {activeTab === 'demo' && (
          <button
            type="button"
            className="tab-btn active demo-tab-active"
            onClick={() => setActiveTab('demo')}
          >
            <Zap size={18} />
            <span>Isolated Demo Mode</span>
          </button>
        )}
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="scan-error-alert" role="alert">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Workspace Area */}
      <div className="scan-workspace">
        {isAnalyzing ? (
          <AnalysisLoader />
        ) : activeTab === 'wizard' ? (
          <MobileInspectionWizard
            onInspectionSubmit={handleMultiViewSubmit}
            isSubmitting={isAnalyzing}
          />
        ) : activeTab === 'demo' ? (
          <div className="card demo-section-card">
            {/* Explicit Demo Warning (Point 33) */}
            <div className="demo-isolation-banner" style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.25rem',
              color: '#f87171',
              fontWeight: 700,
              fontSize: '0.9rem',
              textAlign: 'center',
              letterSpacing: '0.05em'
            }}>
              ⚠ DEMONSTRATION DATA — NOT A REAL INSPECTION
            </div>

            <div className="demo-header">
              <div className="demo-title-group">
                <Zap size={20} className="demo-icon" />
                <h3 className="demo-title">Deterministic Benchmark Demos</h3>
              </div>
              <span className="demo-badge">Test Lab Only</span>
            </div>

            <p className="demo-description">
              Test automated Legal Metrology evaluation with synthetic test profiles. Real field officers must use the <strong>Field Inspection</strong> mode above.
            </p>

            <div className="demo-cards-grid">
              {/* Demo Product A */}
              <div className="demo-product-card compliant-box">
                <div className="demo-card-top">
                  <span className="demo-label-tag success">HIGH COMPLIANCE</span>
                  <span className="demo-score-est">Est. Score: ~98-100</span>
                </div>
                <h4 className="demo-prod-name">Demo Product A: Premium Rice</h4>
                <p className="demo-prod-summary">
                  ABC Foods Pvt Ltd. Complete declarations for MRP, Net Qty (5 kg), Batch B12345, Origin India, and Consumer Helpline.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm btn-block demo-trigger-btn"
                  onClick={handleRunDemoCompliant}
                  disabled={isAnalyzing}
                >
                  <CheckCircle size={16} />
                  <span>Run Compliant Product Test</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Demo Product B */}
              <div className="demo-product-card warning-box">
                <div className="demo-card-top">
                  <span className="demo-label-tag warning">MISSING DECLARATIONS</span>
                  <span className="demo-score-est">Est. Score: ~55-65</span>
                </div>
                <h4 className="demo-prod-name">Demo Product B: Premium Snack</h4>
                <p className="demo-prod-summary">
                  XYZ Foods. Missing Consumer Care contact, Country of Origin, Expiry Period, and incomplete premise address.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm btn-block demo-trigger-btn"
                  onClick={handleRunDemoIssues}
                  disabled={isAnalyzing}
                >
                  <AlertTriangle size={16} />
                  <span>Run Product With Deficiencies</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card custom-product-card">
            <div className="custom-toggle-title">
              <FileEdit size={22} className="custom-toggle-icon" />
              <div className="custom-toggle-texts">
                <h3 className="custom-heading">Direct Package Declaration Audit</h3>
                <span className="custom-subheading">
                  Enter statutory declarations printed on any real packaging to verify Legal Metrology compliance directly.
                </span>
              </div>
            </div>

            <form onSubmit={handleAnalyzeCustom} className="custom-product-form">
              <div className="custom-form-grid">
                <div className="custom-input-group">
                  <label>Commodity / Product Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Parle-G Biscuits, Tata Salt, Dettol Soap"
                    value={customData.productName}
                    onChange={(e) => handleCustomChange('productName', e.target.value)}
                    required
                  />
                </div>

                <div className="custom-input-group">
                  <label>Manufacturer / Packer Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Parle Products Private Limited"
                    value={customData.manufacturer}
                    onChange={(e) => handleCustomChange('manufacturer', e.target.value)}
                    required
                  />
                </div>

                <div className="custom-input-group full-span">
                  <label>Premises Full Address (with PIN code)</label>
                  <input
                    type="text"
                    placeholder="e.g. Vile Parle East, Mumbai, Maharashtra - 400057"
                    value={customData.manufacturerAddress}
                    onChange={(e) => handleCustomChange('manufacturerAddress', e.target.value)}
                  />
                </div>

                <div className="custom-input-group">
                  <label>Net Quantity (with metric unit)</label>
                  <input
                    type="text"
                    placeholder="e.g. 250 g, 1 kg, 500 ml"
                    value={customData.netQuantity}
                    onChange={(e) => handleCustomChange('netQuantity', e.target.value)}
                  />
                </div>

                <div className="custom-input-group">
                  <label>Maximum Retail Price (MRP)</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹25 (incl. of all taxes)"
                    value={customData.mrp}
                    onChange={(e) => handleCustomChange('mrp', e.target.value)}
                  />
                </div>

                <div className="custom-input-group">
                  <label>Batch / Lot Number</label>
                  <input
                    type="text"
                    placeholder="e.g. B-9012"
                    value={customData.batchNumber}
                    onChange={(e) => handleCustomChange('batchNumber', e.target.value)}
                  />
                </div>

                <div className="custom-input-group">
                  <label>Date of Manufacture / Packing</label>
                  <input
                    type="text"
                    placeholder="e.g. 09/2026 or 15/09/2026"
                    value={customData.manufacturingDate}
                    onChange={(e) => handleCustomChange('manufacturingDate', e.target.value)}
                  />
                </div>

                <div className="custom-input-group">
                  <label>Best Before / Expiry Period</label>
                  <input
                    type="text"
                    placeholder="e.g. 6 Months from packaging"
                    value={customData.bestBefore}
                    onChange={(e) => handleCustomChange('bestBefore', e.target.value)}
                  />
                </div>

                <div className="custom-input-group">
                  <label>Country of Origin</label>
                  <input
                    type="text"
                    placeholder="e.g. India"
                    value={customData.countryOfOrigin}
                    onChange={(e) => handleCustomChange('countryOfOrigin', e.target.value)}
                  />
                </div>

                <div className="custom-input-group full-span">
                  <label>Consumer Care Helpline / Email</label>
                  <input
                    type="text"
                    placeholder="e.g. 1800-222-3333 | care@brand.com"
                    value={customData.consumerCare}
                    onChange={(e) => handleCustomChange('consumerCare', e.target.value)}
                  />
                </div>
              </div>

              <div className="custom-form-actions">
                <button
                  type="submit"
                  className="btn btn-accent btn-md"
                  disabled={isAnalyzing}
                >
                  <ShieldCheck size={18} />
                  <span>Run Legal Metrology Audit on This Product</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Product Mismatch Detection Modal (Requirement 6) */}
      {mismatchData && (
        <div className="mismatch-modal-backdrop">
          <div className="mismatch-modal-card">
            <div className="mismatch-header">
              <span className="mismatch-icon">⚠</span>
              <h2 className="mismatch-title">PRODUCT MISMATCH DETECTED</h2>
              <p className="mismatch-subtitle">
                The uploaded views do not appear to belong to the same physical product.
              </p>
            </div>

            <div className="mismatch-views-list">
              {Object.entries(mismatchData.productIdentity?.viewAssessments || {}).map(([viewName, assess]) => {
                const isSuspicious = viewName === mismatchData.productIdentity?.suspiciousView;
                return (
                  <div key={viewName} className={`mismatch-view-row ${isSuspicious ? 'suspicious' : 'consensus'}`}>
                    <span className="mismatch-view-name">{viewName}</span>
                    <span className="mismatch-arrow">→</span>
                    <span className="mismatch-prod-label">{assess.brand} {assess.commodity}</span>
                    {isSuspicious && (
                      <span className="suspicious-tag">⚠ SUSPICIOUS VIEW</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mismatch-explanation">
              {mismatchData.productIdentity?.explanation}
            </div>

            <div className="mismatch-modal-actions">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => setMismatchData(null)}
              >
                🔄 REPLACE IMAGE
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => setMismatchData(null)}
              >
                REVIEW IMAGES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Isolated Demo Mode Switcher (Strictly for developer/QA benchmarks) */}
      <div className="demo-mode-toggle-footer" style={{ textAlign: 'center', margin: '1.5rem 0 0.5rem 0' }}>
        <button
          type="button"
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => { setActiveTab(activeTab === 'demo' ? 'wizard' : 'demo'); setMismatchData(null); }}
        >
          {activeTab === 'demo' ? '← Return to Real Field Inspection' : '⚙ Switch to Isolated Demo Test Lab (Benchmarks Only)'}
        </button>
      </div>

      {/* Mandatory Statutory Notice */}
      <div className="scan-disclaimer-wrap">
        <Disclaimer />
      </div>
    </div>
  );
}
