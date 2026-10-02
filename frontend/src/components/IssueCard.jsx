import React from 'react';
import { AlertCircle, HelpCircle, ArrowRightCircle, Search } from 'lucide-react';
import './IssueCard.css';

export default function IssueCard({ issue }) {
  const isHighSeverity = issue.severity === 'HIGH';
  const isNeedsReview = issue.status === 'NEEDS_REVIEW';

  const cardClass = isNeedsReview
    ? 'review-severity'
    : isHighSeverity
    ? 'high-severity'
    : 'medium-severity';

  return (
    <div className={`issue-card ${cardClass}`}>
      <div className="issue-card-top">
        <div className="issue-title-group">
          {isNeedsReview ? (
            <Search size={20} className="issue-indicator-icon review-icon" />
          ) : (
            <AlertCircle size={20} className="issue-indicator-icon" />
          )}
          <h4 className="issue-title">{issue.title}</h4>
        </div>
        <div className="issue-tags">
          <span className={`issue-severity-badge ${issue.status?.toLowerCase() || issue.severity?.toLowerCase()}`}>
            {isNeedsReview ? 'NEEDS REVIEW' : issue.status === 'FAIL' ? 'VIOLATION' : (issue.severity || 'POTENTIAL ISSUE')}
          </span>
          {typeof issue.confidence === 'number' && issue.confidence > 0 && (
            <span className="issue-confidence-tag">
              Confidence: {Math.round(issue.confidence * 100)}%
            </span>
          )}
          <span className="issue-detected-badge">
            Detected: <strong>{issue.detectedValue || 'Not Detected'}</strong>
          </span>
        </div>
      </div>

      <div className="issue-details">
        <div className="issue-detail-row">
          <div className="detail-icon-title">
            <HelpCircle size={16} />
            <span>Why this matters:</span>
          </div>
          <p className="detail-text">{issue.explanation}</p>
        </div>

        <div className="issue-detail-row recommendation">
          <div className="detail-icon-title">
            <ArrowRightCircle size={16} />
            <span>Recommended action:</span>
          </div>
          <p className="detail-text">{issue.recommendation}</p>
        </div>
      </div>
    </div>
  );
}
