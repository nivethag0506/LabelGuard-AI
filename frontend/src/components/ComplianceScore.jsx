import React from 'react';
import StatusBadge from './StatusBadge';
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import './ComplianceScore.css';

export default function ComplianceScore({
  score = 0,
  status = 'NEEDS_REVIEW',
  passedRules = 0,
  warningRules = 0,
  failedRules = 0,
  totalRules = 10,
}) {
  const normScore = Math.max(0, Math.min(100, Math.round(score)));

  let strokeColor = '#059669'; // success
  if (normScore < 70) {
    strokeColor = '#dc2626'; // danger
  } else if (normScore < 90) {
    strokeColor = '#d97706'; // warning
  }

  // SVG Gauge computation
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * normScore) / 100;

  return (
    <div className="card compliance-score-card">
      <div className="score-card-header">
        <div className="score-header-title">
          <ShieldCheck size={20} className="score-header-icon" />
          <span>PRELIMINARY COMPLIANCE ASSESSMENT</span>
        </div>
        <StatusBadge status={status} size="lg" />
      </div>

      <div className="score-body">
        {/* Circular Gauge */}
        <div className="score-gauge-container">
          <svg className="score-gauge-svg" viewBox="0 0 160 160">
            <circle
              className="gauge-bg"
              cx="80"
              cy="80"
              r={radius}
              stroke="#e2e8f0"
              strokeWidth="12"
              fill="transparent"
            />
            <circle
              className="gauge-progress"
              cx="80"
              cy="80"
              r={radius}
              stroke={strokeColor}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              transform="rotate(-90 80 80)"
            />
          </svg>
          <div className="score-gauge-text">
            <span className="score-number">{normScore}</span>
            <span className="score-max">/ 100</span>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="score-breakdown">
          <div className="score-rule-stat passed">
            <div className="stat-icon-wrap">
              <CheckCircle2 size={18} />
            </div>
            <div className="stat-content">
              <span className="stat-val">{passedRules}</span>
              <span className="stat-lbl">Detected & Valid</span>
            </div>
          </div>

          <div className="score-rule-stat warning">
            <div className="stat-icon-wrap">
              <AlertTriangle size={18} />
            </div>
            <div className="stat-content">
              <span className="stat-val">{warningRules}</span>
              <span className="stat-lbl">Potential Issues</span>
            </div>
          </div>

          <div className="score-rule-stat failed">
            <div className="stat-icon-wrap">
              <XCircle size={18} />
            </div>
            <div className="stat-content">
              <span className="stat-val">{failedRules}</span>
              <span className="stat-lbl">Not Detected</span>
            </div>
          </div>
        </div>
      </div>

      <div className="score-card-footer">
        <span>Evaluated against {totalRules} Legal Metrology (Packaged Commodities) rules</span>
      </div>
    </div>
  );
}
