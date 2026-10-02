import React from 'react';
import StatusBadge from './StatusBadge';
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import './ComplianceScore.css';

export default function ComplianceScore({
  score = null,
  scoreAvailable = true,
  status = 'NEEDS_REVIEW',
  passedRules = 0,
  warningRules = 0,
  failedRules = 0,
  totalRules = 10,
  productDetectionConfidence = null,
  productDetectionLevel = null,
}) {
  const isScoreAvailable = scoreAvailable !== false && score !== null && score !== undefined;
  const normScore = isScoreAvailable ? Math.max(0, Math.min(100, Math.round(score))) : 0;

  let strokeColor = '#94a3b8'; // neutral
  if (isScoreAvailable) {
    if (normScore < 70) {
      strokeColor = '#dc2626'; // danger
    } else if (normScore < 90) {
      strokeColor = '#d97706'; // warning
    } else {
      strokeColor = '#059669'; // success
    }
  }

  // SVG Gauge computation
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isScoreAvailable
    ? circumference - (circumference * normScore) / 100
    : circumference;

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
            {isScoreAvailable ? (
              <>
                <span className="score-number">{normScore}</span>
                <span className="score-max">/ 100</span>
              </>
            ) : (
              <>
                <span className="score-number na-score" style={{ fontSize: '2rem', color: '#64748b' }}>N/A</span>
                <span className="score-max" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>NOT PERFORMED</span>
              </>
            )}
          </div>
        </div>

        {/* Breakdown Stats */}
        {isScoreAvailable ? (
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
        ) : (
          <div className="score-breakdown" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569' }}>
              <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Info size={14} color="#64748b" /> Compliance Scoring Gate
              </div>
              {status === 'INVALID_PRODUCT' && 'Compliance scoring not performed: Submitted media does not contain a recognized packaged commodity.'}
              {status === 'PRODUCT_MISMATCH' && 'Compliance scoring blocked: Conflicting product packaging views detected.'}
              {status === 'NEEDS_REVIEW' && 'Compliance scoring pending: Packaging detected but identity confidence is insufficient.'}
              {!['INVALID_PRODUCT', 'PRODUCT_MISMATCH', 'NEEDS_REVIEW'].includes(status) && 'Compliance scoring not performed for this inspection.'}
            </div>
            {productDetectionConfidence !== null && (
              <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
                <span>Detection Confidence:</span>
                <strong style={{ color: '#334155' }}>{productDetectionConfidence}%</strong>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="score-card-footer">
        {isScoreAvailable ? (
          <span>Evaluated against {totalRules} Legal Metrology (Packaged Commodities) rules</span>
        ) : (
          <span>Compliance evaluation requires confirmed packaged commodity identity</span>
        )}
      </div>
    </div>
  );
}
