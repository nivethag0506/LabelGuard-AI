import React from 'react';
import './DashboardMetric.css';

export default function DashboardMetric({ title, value, subtext, icon: Icon, color = 'blue' }) {
  return (
    <div className={`card dashboard-metric-card color-${color}`}>
      <div className="metric-content">
        <span className="metric-title">{title}</span>
        <div className="metric-value-row">
          <span className="metric-value">{value}</span>
        </div>
        {subtext && <span className="metric-subtext">{subtext}</span>}
      </div>
      {Icon && (
        <div className="metric-icon-wrap">
          <Icon size={24} />
        </div>
      )}
    </div>
  );
}
