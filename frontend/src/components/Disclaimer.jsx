import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function Disclaimer({ compact = false }) {
  if (compact) {
    return (
      <div className="disclaimer-banner" style={{ fontSize: '0.78rem', padding: '0.65rem 1rem' }}>
        <AlertCircle size={16} className="text-muted" style={{ flexShrink: 0, marginTop: '2px', color: '#64748b' }} />
        <div>
          <strong>Statutory Advisory:</strong> Preliminary automated assessment under Legal Metrology Rules, 2011. Does not constitute legal certification or enforcement action.
        </div>
      </div>
    );
  }

  return (
    <div className="disclaimer-banner" role="note" aria-label="Legal Disclaimer">
      <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#2563eb' }} />
      <div>
        <strong>Legal Metrology Advisory Notice:</strong>
        <p style={{ marginTop: '0.25rem', color: '#475569' }}>
          LegalScan provides a preliminary, automated assessment of detectable package declarations for assistance and review. It does not constitute legal certification, enforcement action, or a substitute for verification by the competent authority under the Legal Metrology (Packaged Commodities) Rules, 2011.
        </p>
      </div>
    </div>
  );
}
