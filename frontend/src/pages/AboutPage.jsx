import React from 'react';
import {
  Scale,
  ShieldCheck,
  AlertCircle,
  Database,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText
} from 'lucide-react';
import Disclaimer from '../components/Disclaimer';
import './AboutPage.css';

export default function AboutPage() {
  const mandatoryRules = [
    { rule: 'Rule 6(1)(a)', title: 'Name and Address of Manufacturer / Packer / Importer', desc: 'Identifies legal responsibility and premises for contact.' },
    { rule: 'Rule 6(1)(b)', title: 'Generic or Common Name of the Commodity', desc: 'Ensures consumers clearly understand the nature of the packaged product.' },
    { rule: 'Rule 6(1)(c)', title: 'Net Quantity in Standard Units of Weight/Measure', desc: 'Must conform to standard metric units (kg, g, l, ml, n) complying with Rule 12.' },
    { rule: 'Rule 6(1)(d)', title: 'Month and Year of Manufacture / Pre-packing', desc: 'Determines product freshness, shelf-life, and regulatory traceability.' },
    { rule: 'Rule 6(1)(da)', title: 'Maximum Retail Price (MRP inclusive of all taxes)', desc: 'Prevents unfair trade practices and illegal overcharging.' },
    { rule: 'Rule 6(1)(e)', title: 'Country of Origin for Imported / Domestic Goods', desc: 'Mandatory origin traceability for market transparency.' },
    { rule: 'Rule 6(1)(g)', title: 'Consumer Care / Grievance Redressal Cell Details', desc: 'Designated telephone helpline, email, and address for consumer complaints.' }
  ];

  const futureEnhancements = [
    'Real-time OCR integration with Google Cloud Vision & AWS Textract APIs',
    'Multilingual label recognition supporting Hindi, Tamil, Telugu, Kannada, Bengali and other regional scripts',
    'Computer vision bounding-box detection to physically highlight declaration positions on packaging',
    'Geo-tagged mobile inspection logs for field compliance officers with offline SQLite sync',
    'Role-based inspector authentication, audit signing, and digital notice generation'
  ];

  return (
    <div className="about-page container">
      {/* Header */}
      <div className="about-header">
        <div className="about-badge">
          <Scale size={16} />
          <span>STATUTORY FRAMEWORK & ARCHITECTURE</span>
        </div>
        <h1 className="about-title">About LegalScan</h1>
        <p className="about-subtitle">
          An AI-powered packaged commodity compliance assistant engineered to support public enforcement officers, consumer advocates, and quality compliance managers.
        </p>
      </div>

      {/* Problem & Solution Grid */}
      <div className="about-grid">
        <div className="card about-card problem-card">
          <div className="about-card-badge problem">THE CHALLENGE</div>
          <h3 className="about-card-title">Manual Verification Bottleneck</h3>
          <p className="about-card-text">
            Millions of packaged commodities circulate across retail and e-commerce supply chains. Field inspectors and quality auditors manually inspect tiny, curved, or stylized packaging text to verify 10+ mandatory declarations. This manual process is time-consuming, prone to oversights, and lacks centralized digitized audit trails.
          </p>
        </div>

        <div className="card about-card solution-card">
          <div className="about-card-badge solution">THE SOLUTION</div>
          <h3 className="about-card-title">Automated Rule Engine & Intelligence</h3>
          <p className="about-card-text">
            LegalScan automates preliminary inspection by combining optical character recognition (OCR) with a configurable compliance engine based on the Legal Metrology (Packaged Commodities) Rules, 2011. It delivers rapid declaration extraction, weighted scoring, and explainable guidance in seconds.
          </p>
        </div>
      </div>

      {/* Statutory Rules Table */}
      <section className="about-section">
        <div className="section-head">
          <FileText size={20} className="section-icon" />
          <h2 className="section-title">The Legal Metrology (Packaged Commodities) Rules, 2011</h2>
        </div>
        <p className="section-intro">
          Under Indian consumer protection laws, every pre-packaged commodity is subject to strict statutory labeling standards. LegalScan audits packages against these core provisions:
        </p>

        <div className="rules-list-grid">
          {mandatoryRules.map((r, i) => (
            <div key={i} className="card rule-item-card">
              <div className="rule-item-top">
                <span className="rule-item-code">{r.rule}</span>
              </div>
              <h4 className="rule-item-title">{r.title}</h4>
              <p className="rule-item-desc">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Architecture */}
      <section className="about-section">
        <div className="section-head">
          <Cpu size={20} className="section-icon" />
          <h2 className="section-title">Technical Architecture & Stack</h2>
        </div>

        <div className="arch-card card">
          <div className="arch-flow">
            <div className="arch-step">
              <span className="arch-step-tag">1. CLIENT</span>
              <h4>React + Vite SPA</h4>
              <p>Responsive, mobile-friendly PWA UI with camera-ready upload.</p>
            </div>
            <div className="arch-arrow">&rarr;</div>
            <div className="arch-step">
              <span className="arch-step-tag">2. API</span>
              <h4>Node.js Express</h4>
              <p>REST endpoints for scanning, validation, and analytics.</p>
            </div>
            <div className="arch-arrow">&rarr;</div>
            <div className="arch-step">
              <span className="arch-step-tag">3. ENGINE</span>
              <h4>Rule Evaluator</h4>
              <p>Weighted scoring algorithm & explainability generator.</p>
            </div>
            <div className="arch-arrow">&rarr;</div>
            <div className="arch-step">
              <span className="arch-step-tag">4. PERSISTENCE</span>
              <h4>MongoDB Atlas</h4>
              <p>Mongoose models for scans, rules, and users.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Future Roadmap */}
      <section className="about-section">
        <div className="section-head">
          <Sparkles size={20} className="section-icon" />
          <h2 className="section-title">Future Enhancements & Roadmap</h2>
        </div>

        <div className="card roadmap-card">
          <ul className="roadmap-list">
            {futureEnhancements.map((item, idx) => (
              <li key={idx} className="roadmap-item">
                <CheckCircle2 size={18} className="roadmap-icon" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Mandatory Statutory Notice */}
      <div className="about-disclaimer-wrap">
        <Disclaimer />
      </div>
    </div>
  );
}
