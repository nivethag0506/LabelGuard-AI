import React from 'react';
import { Link } from 'react-router-dom';
import {
  ScanLine,
  BarChart3,
  ShieldCheck,
  CheckCircle,
  FileSearch,
  Sparkles,
  ArrowRight,
  Scale,
  Cpu,
  Layers,
  FileCheck,
  AlertTriangle,
  Lock
} from 'lucide-react';
import Disclaimer from '../components/Disclaimer';
import './LandingPage.css';

export default function LandingPage() {
  const steps = [
    { number: '01', title: 'Scan Label', desc: 'Capture or upload high-resolution package front/back panel photo with camera or file picker.', icon: ScanLine },
    { number: '02', title: 'Extract Text', desc: 'Advanced OCR extracts declarations including MRP, Net Qty, Batch, Expiry, and Manufacturer.', icon: FileSearch },
    { number: '03', title: 'Validate Rules', desc: 'Configurable compliance engine evaluates declarations against Legal Metrology Rules, 2011.', icon: Scale },
    { number: '04', title: 'Explain Issues', desc: 'Identifies missing declarations and explains statutory implications and recommended remedies.', icon: AlertTriangle },
    { number: '05', title: 'Report & Audit', desc: 'Generates structured preliminary assessment score and persists inspection records to MongoDB.', icon: FileCheck }
  ];

  const features = [
    {
      icon: Scale,
      title: 'Legal Metrology Rules 2011 Engine',
      desc: 'Configured with mandatory declaration weights for Rule 6, Rule 12, SI units, and consumer grievance requirements.'
    },
    {
      icon: ShieldCheck,
      title: 'Preliminary Compliance Scoring',
      desc: 'Transparent scoring logic categorized into Compliant, Needs Review, and High Risk for prioritized inspector audits.'
    },
    {
      icon: Sparkles,
      title: 'Four-View Field Inspection',
      desc: 'Verify statutory continuity across Front, Back, Top, and Bottom physical package surfaces with multi-view OCR.'
    },
    {
      icon: BarChart3,
      title: 'Authority Analytics Dashboard',
      desc: 'Real-time visibility into compliance distribution, common market label defects, and inspection audit logs.'
    },
    {
      icon: Cpu,
      title: 'Extensible OCR Architecture',
      desc: 'Standardized interfaces designed for easy integration with Vision APIs, local Tesseract, or cloud OCR engines.'
    },
    {
      icon: Lock,
      title: 'Audit Trail Persistence',
      desc: 'Every inspection is recorded with timestamps, extracted fields, detected issues, and full image traceability.'
    }
  ];

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-badge">
            <ShieldCheck size={16} />
            <span>LEGAL METROLOGY (PACKAGED COMMODITIES) RULES, 2011 ASSISTANT</span>
          </div>

          <h1 className="hero-headline">
            AI-Powered Packaged Commodity <span className="highlight-text">Compliance Assistant</span>
          </h1>

          <div className="hero-tagline-wrap">
            <span className="hero-tagline">SCAN • VERIFY • PROTECT</span>
          </div>

          <p className="hero-description">
            Transform packaged product labels into actionable compliance insights in seconds. Detect mandatory statutory declarations, identify potential non-compliance, and generate audit-ready preliminary reports.
          </p>

          <div className="hero-cta-group">
            <Link to="/scan" className="btn btn-accent btn-lg">
              <ScanLine size={20} />
              <span>Start Real Inspection</span>
            </Link>

            <Link to="/dashboard" className="btn btn-secondary btn-lg">
              <BarChart3 size={20} />
              <span>View Dashboard</span>
            </Link>
          </div>

          <div className="hero-disclaimer-wrapper">
            <Disclaimer compact />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-kicker">WORKFLOW PIPELINE</span>
            <h2 className="section-title">How LegalScan Works</h2>
            <p className="section-desc">
              From raw product image to structured regulatory compliance assessment in 5 automated stages.
            </p>
          </div>

          <div className="steps-grid">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={idx} className="card step-card">
                  <div className="step-header">
                    <span className="step-num">{s.number}</span>
                    <div className="step-icon-circle">
                      <Icon size={20} />
                    </div>
                  </div>
                  <h3 className="step-title">{s.title}</h3>
                  <p className="step-desc">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-kicker">CORE CAPABILITIES</span>
            <h2 className="section-title">Engineered for Public Sector Rigor</h2>
            <p className="section-desc">
              Built to assist inspectors and consumers with transparent rule evaluation rather than black-box decisions.
            </p>
          </div>

          <div className="features-grid">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx} className="card feature-card">
                  <div className="feature-icon-box">
                    <Icon size={24} />
                  </div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Technology & Compliance Architecture */}
      <section className="tech-section">
        <div className="container tech-container">
          <div className="tech-card card">
            <div className="tech-badge">FULL-STACK ENTERPRISE ARCHITECTURE</div>
            <h3 className="tech-title">Modern, Resilient, Cloud-Ready</h3>
            <p className="tech-desc">
              Designed with modular microservices: React + Vite responsive frontend, Node.js + Express REST API, MongoDB Atlas cloud storage, and an isolated compliance evaluation rule engine.
            </p>

            <div className="tech-badges-grid">
              <span className="tech-tag">React 18</span>
              <span className="tech-tag">Vite</span>
              <span className="tech-tag">Node.js Express</span>
              <span className="tech-tag">MongoDB Atlas</span>
              <span className="tech-tag">Mongoose ODM</span>
              <span className="tech-tag">PWA Ready</span>
              <span className="tech-tag">RESTful API</span>
              <span className="tech-tag">Deterministic Engine</span>
            </div>

            <div className="tech-cta-row">
              <Link to="/about" className="btn btn-outline-primary btn-md">
                <span>Read Full Technical Architecture</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Full Statutory Disclaimer Section */}
      <section className="disclaimer-section">
        <div className="container">
          <Disclaimer />
        </div>
      </section>
    </div>
  );
}
