import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { Calendar, AlertCircle, ArrowRight, Package } from 'lucide-react';
import './ScanCard.css';

export default function ScanCard({ scan }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'Recent';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Recent';
    }
  };

  const issuesCount = Array.isArray(scan.issues) ? scan.issues.length : (scan.issuesCount || 0);

  return (
    <div className="card scan-card-item">
      <div className="scan-card-thumb-wrap">
        {scan.productImageUrl ? (
          <img
            src={scan.productImageUrl}
            alt={scan.productName || 'Packaged Commodity'}
            className="scan-card-thumb"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="scan-card-thumb-placeholder">
            <Package size={32} className="thumb-placeholder-icon" />
          </div>
        )}
      </div>

      <div className="scan-card-content">
        <div className="scan-card-top-row">
          <StatusBadge status={scan.status} size="sm" />
          <div className="scan-date">
            <Calendar size={14} />
            <span>{formatDate(scan.createdAt)}</span>
          </div>
        </div>

        <h4 className="scan-product-title">{scan.productName || 'Packaged Commodity'}</h4>
        <p className="scan-manufacturer-name">
          {scan.manufacturer || 'Manufacturer details detected'}
        </p>

        <div className="scan-card-footer">
          <div className="scan-meta-group">
            <div className="scan-score-tag">
              <span className="score-val">{scan.complianceScore || 0}</span>
              <span className="score-max">/100</span>
            </div>
            {issuesCount > 0 ? (
              <span className="scan-issues-tag">
                <AlertCircle size={14} />
                <span>{issuesCount} issues</span>
              </span>
            ) : (
              <span className="scan-issues-tag clean">0 issues</span>
            )}
          </div>

          <Link to={`/result/${scan._id}`} className="btn btn-secondary btn-sm scan-view-btn">
            <span>View Report</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
