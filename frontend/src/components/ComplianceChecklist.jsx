import React from 'react';
import { Check, AlertTriangle, X, ShieldAlert, HelpCircle } from 'lucide-react';
import './ComplianceChecklist.css';

export default function ComplianceChecklist({ ruleEvaluations = [], onSelectRule }) {
  if (!ruleEvaluations || ruleEvaluations.length === 0) {
    return null;
  }

  const getStatusIcon = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'PASS' || s === 'PASSED') {
      return (
        <div className="check-status-badge passed" title="Detected & Compliant">
          <Check size={16} />
        </div>
      );
    }
    if (s === 'WARNING') {
      return (
        <div className="check-status-badge warning" title="Detected with Ambiguity / Warning">
          <AlertTriangle size={16} />
        </div>
      );
    }
    if (s === 'NEEDS_REVIEW') {
      return (
        <div className="check-status-badge review" title="Not Confidently Detected / Needs Manual Check">
          <HelpCircle size={16} />
        </div>
      );
    }
    if (s === 'NOT_APPLICABLE') {
      return (
        <div className="check-status-badge not-applicable" title="Not Applicable">
          —
        </div>
      );
    }
    return (
      <div className="check-status-badge failed" title="Confirmed Missing">
        <X size={16} />
      </div>
    );
  };

  const getStatusLabel = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'PASS' || s === 'PASSED') return 'Detected';
    if (s === 'WARNING') return 'Warning';
    if (s === 'NEEDS_REVIEW') return 'Needs Review';
    if (s === 'NOT_APPLICABLE') return 'N/A';
    return 'Not Detected';
  };

  const getItemClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'pass' || s === 'passed') return 'passed';
    if (s === 'warning') return 'warning';
    if (s === 'needs_review') return 'review';
    if (s === 'not_applicable') return 'not-applicable';
    return 'failed';
  };

  return (
    <div className="card compliance-checklist-card">
      <div className="checklist-header">
        <div className="checklist-title">
          <ShieldAlert size={20} className="checklist-header-icon" />
          <h3>Mandatory Declarations Checklist</h3>
        </div>
        <span className="checklist-subtext">Tap any declaration to locate its attested image surface</span>
      </div>

      <div className="checklist-list">
        {ruleEvaluations.map((item, index) => {
          const itemClass = getItemClass(item.status);
          return (
            <div
              key={item.ruleId || index}
              className={`checklist-item ${itemClass}`}
              onClick={() => onSelectRule && onSelectRule(item)}
              style={{ cursor: 'pointer' }}
              title="Click to view surface evidence"
            >
              <div className="checklist-item-left">
                {getStatusIcon(item.status)}
                <div className="checklist-item-text">
                  <span className="checklist-item-label">{item.label}</span>
                  <span className="checklist-item-value">
                    {item.detectedValue && item.detectedValue !== 'Not Detected'
                      ? item.detectedValue
                      : 'Could not be confidently verified'}
                  </span>
                  {item.sourceView && item.sourceView !== 'N/A' && (
                    <span className="checklist-item-source" style={{ fontSize: '0.75rem', color: '#0d9488', marginTop: '2px', display: 'block' }}>
                      📍 Surface: <strong>{item.sourceView}</strong> {item.confidence ? `(${Math.round(item.confidence * 100)}% Conf)` : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="checklist-item-right">
                <span className={`checklist-status-tag ${itemClass}`}>
                  {getStatusLabel(item.status)}
                </span>
                <span className="checklist-weight-tag">{item.weight} pts</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
