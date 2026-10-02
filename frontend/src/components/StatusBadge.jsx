import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

export default function StatusBadge({ status, size = 'md' }) {
  const normStatus = (status || '').toUpperCase().replace(/\s+/g, '_');

  const config = {
    COMPLIANT: {
      label: 'COMPLIANT',
      className: 'badge-compliant',
      icon: CheckCircle2,
      style: { backgroundColor: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }
    },
    NEEDS_REVIEW: {
      label: 'NEEDS REVIEW',
      className: 'badge-needs-review',
      icon: AlertTriangle,
      style: { backgroundColor: '#fffbeb', color: '#92400e', borderColor: '#fde68a' }
    },
    HIGH_RISK: {
      label: 'HIGH RISK',
      className: 'badge-high-risk',
      icon: AlertOctagon,
      style: { backgroundColor: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }
    }
  };

  const current = config[normStatus] || {
    label: normStatus || 'UNKNOWN',
    className: 'badge-neutral',
    icon: HelpCircle,
    style: { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }
  };

  const Icon = current.icon;
  const iconSize = size === 'lg' ? 18 : size === 'sm' ? 12 : 14;

  const sizeStyles = {
    sm: { padding: '0.2rem 0.5rem', fontSize: '0.7rem' },
    md: { padding: '0.3rem 0.75rem', fontSize: '0.8rem' },
    lg: { padding: '0.45rem 1rem', fontSize: '0.9rem' }
  }[size] || {};

  return (
    <span
      className={`badge ${current.className}`}
      style={{ ...current.style, ...sizeStyles }}
    >
      <Icon size={iconSize} />
      <span>{current.label}</span>
    </span>
  );
}
