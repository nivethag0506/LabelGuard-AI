import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, ScanLine, BarChart3, History, Info, Menu, X, Scale } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Scan Product', path: '/scan', icon: ScanLine },
    { name: 'Inspection History', path: '/history', icon: History },
    { name: 'Authority Dashboard', path: '/dashboard', icon: BarChart3 },
    { name: 'Rule Engine', path: '/rules', icon: Scale },
    { name: 'About & Rules', path: '/about', icon: Info },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar-header">
      <div className="container navbar-container">
        <Link to="/" className="navbar-brand" onClick={() => setMobileMenuOpen(false)}>
          <div className="brand-logo-icon">
            <ShieldCheck size={26} className="text-white" />
          </div>
          <div className="brand-info">
            <div className="brand-title-row">
              <span className="brand-name">LegalScan</span>
              <span className="brand-gov-tag">ASSISTANT</span>
            </div>
            <span className="brand-subtext">Legal Metrology Compliance</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Action Button */}
        <div className="navbar-actions">
          <Link to="/scan" className="btn btn-accent btn-sm header-cta">
            <ScanLine size={16} />
            <span>New Scan</span>
          </Link>
          <button
            type="button"
            className="mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <div className="mobile-nav-list">
            <Link
              to="/"
              className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <ShieldCheck size={20} />
              <span>Home</span>
            </Link>
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`mobile-nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={20} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
          <div className="mobile-drawer-cta">
            <Link
              to="/scan"
              className="btn btn-accent btn-block"
              onClick={() => setMobileMenuOpen(false)}
            >
              <ScanLine size={18} />
              <span>Scan Product Now</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
