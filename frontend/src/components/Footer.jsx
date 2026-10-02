import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ExternalLink, Heart } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer-section">
      <div className="container footer-container">
        <div className="footer-top-grid">
          {/* Brand Col */}
          <div className="footer-brand-col">
            <div className="footer-brand-header">
              <div className="footer-brand-logo">
                <ShieldCheck size={22} className="text-white" />
              </div>
              <span className="footer-brand-name">LegalScan</span>
            </div>
            <p className="footer-brand-tagline">SCAN • VERIFY • PROTECT</p>
            <p className="footer-brand-desc">
              AI-Powered Packaged Commodity Compliance Assistant engineered under the Legal Metrology (Packaged Commodities) Rules, 2011.
            </p>
          </div>

          {/* Quick Links */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Navigation</h4>
            <ul className="footer-links-list">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/scan">Scan Product</Link></li>
              <li><Link to="/history">Inspection History</Link></li>
              <li><Link to="/dashboard">Authority Dashboard</Link></li>
              <li><Link to="/about">About & Rules</Link></li>
            </ul>
          </div>

          {/* Regulatory Context */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Framework</h4>
            <ul className="footer-links-list">
              <li>Legal Metrology Act, 2009</li>
              <li>Packaged Commodities Rules, 2011</li>
              <li>Rule 6: Mandatory Declarations</li>
              <li>Rule 12: Standard Metric Units</li>
              <li>Consumer Grievance Directives</li>
            </ul>
          </div>
        </div>

        {/* Mandatory Statutory Disclaimer */}
        <div className="footer-disclaimer-box">
          <strong>Important Statutory Limitation:</strong> LegalScan provides a preliminary, automated assessment of detectable package declarations for assistance and review. It does not constitute legal certification, enforcement action, or a substitute for verification by the competent authority.
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom-row">
          <span>&copy; {new Date().getFullYear()} LegalScan. Built for Public Safety & Consumer Protection.</span>
          <span className="footer-status-pill">MongoDB Atlas &bull; Express REST &bull; React Vite</span>
        </div>
      </div>
    </footer>
  );
}
