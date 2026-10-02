import React from 'react';
import { ScanLine, RefreshCw, FileText } from 'lucide-react';
import './ImagePreview.css';

export default function ImagePreview({ file, previewUrl, onAnalyze, onReset, isAnalyzing }) {
  const formatSize = (bytes) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="card image-preview-card">
      <div className="preview-container">
        <img src={previewUrl} alt="Product Label Preview" className="preview-img" />
      </div>

      <div className="preview-info-bar">
        <div className="preview-meta">
          <FileText size={18} className="preview-file-icon" />
          <div className="preview-file-details">
            <span className="preview-file-name">{file?.name || 'Selected Label Image'}</span>
            <span className="preview-file-size">{formatSize(file?.size)}</span>
          </div>
        </div>

        <div className="preview-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onReset}
            disabled={isAnalyzing}
          >
            <RefreshCw size={16} />
            <span>Change Image</span>
          </button>

          <button
            type="button"
            className="btn btn-accent btn-md"
            onClick={onAnalyze}
            disabled={isAnalyzing}
          >
            <ScanLine size={18} />
            <span>Analyze Product</span>
          </button>
        </div>
      </div>
    </div>
  );
}
