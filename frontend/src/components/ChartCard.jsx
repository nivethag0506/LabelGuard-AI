import React from 'react';
import './ChartCard.css';

export default function ChartCard({ title, subtitle, children }) {
  return (
    <div className="card chart-card">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        {subtitle && <span className="chart-subtitle">{subtitle}</span>}
      </div>
      <div className="chart-body">{children}</div>
    </div>
  );
}

export function DistributionChart({ distribution = { compliant: 0, needsReview: 0, highRisk: 0 } }) {
  const total = (distribution.compliant || 0) + (distribution.needsReview || 0) + (distribution.highRisk || 0) || 1;
  const pCompliant = Math.round(((distribution.compliant || 0) / total) * 100);
  const pNeedsReview = Math.round(((distribution.needsReview || 0) / total) * 100);
  const pHighRisk = Math.max(0, 100 - pCompliant - pNeedsReview);

  return (
    <div className="distribution-chart-wrap">
      {/* Visual Stacked Bar */}
      <div className="stacked-bar">
        {pCompliant > 0 && (
          <div
            className="bar-segment compliant"
            style={{ width: `${pCompliant}%` }}
            title={`Compliant: ${pCompliant}%`}
          />
        )}
        {pNeedsReview > 0 && (
          <div
            className="bar-segment needs-review"
            style={{ width: `${pNeedsReview}%` }}
            title={`Needs Review: ${pNeedsReview}%`}
          />
        )}
        {pHighRisk > 0 && (
          <div
            className="bar-segment high-risk"
            style={{ width: `${pHighRisk}%` }}
            title={`High Risk: ${pHighRisk}%`}
          />
        )}
      </div>

      {/* Legend & Breakdown */}
      <div className="distribution-legend">
        <div className="legend-item">
          <span className="legend-dot compliant" />
          <div className="legend-info">
            <span className="legend-label">Compliant</span>
            <span className="legend-val">
              {distribution.compliant || 0} ({pCompliant}%)
            </span>
          </div>
        </div>

        <div className="legend-item">
          <span className="legend-dot needs-review" />
          <div className="legend-info">
            <span className="legend-label">Needs Review</span>
            <span className="legend-val">
              {distribution.needsReview || 0} ({pNeedsReview}%)
            </span>
          </div>
        </div>

        <div className="legend-item">
          <span className="legend-dot high-risk" />
          <div className="legend-info">
            <span className="legend-label">High Risk</span>
            <span className="legend-val">
              {distribution.highRisk || 0} ({pHighRisk}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrendChart({ data = [] }) {
  if (!data || data.length === 0) return <div>No trend data available</div>;

  const maxScore = 100;
  const height = 140;
  const width = 360;
  const padding = 20;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - (d.avgScore / maxScore) * (height - padding * 2);
    return { x, y, score: d.avgScore, label: d.day };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="trend-chart-wrap">
      <svg className="trend-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Horizontal grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeDasharray="3 3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f1f5f9" strokeDasharray="3 3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" />

        {/* Trend Polyline */}
        <polyline
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />

        {/* Data points */}
        {points.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2" />
        ))}
      </svg>

      <div className="trend-labels-row">
        {data.map((d, i) => (
          <div key={i} className="trend-day-label">
            <span>{d.day}</span>
            <strong className="trend-score-val">{d.avgScore}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CommonIssuesList({ issues = [] }) {
  if (!issues || issues.length === 0) {
    return <div className="no-issues-text">No significant non-compliance trends detected.</div>;
  }

  const maxCount = Math.max(...issues.map(i => i.count), 1);

  return (
    <div className="common-issues-list">
      {issues.map((issue, idx) => {
        const pct = Math.round((issue.count / maxCount) * 100);
        return (
          <div key={idx} className="issue-row">
            <div className="issue-row-header">
              <span className="issue-row-title">{issue.title}</span>
              <span className="issue-row-count">{issue.count} occurrences</span>
            </div>
            <div className="issue-progress-bg">
              <div
                className={`issue-progress-bar ${issue.severity?.toLowerCase() || 'medium'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
