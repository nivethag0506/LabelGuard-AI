import React, { useEffect, useState } from 'react';
import {
  Scale,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Info
} from 'lucide-react';
import { LoadingState, ErrorState } from '../components/StateFeedback';
import Disclaimer from '../components/Disclaimer';
import api from '../services/api';
import './AdminRulesPage.css';

export default function AdminRulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState('');

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getRules();
      if (res && res.success && Array.isArray(res.data)) {
        setRules(res.data);
      } else {
        throw new Error(res?.message || 'Failed to load rules.');
      }
    } catch (err) {
      console.error('[AdminRulesPage Error]:', err);
      setError(err.message || 'Error fetching compliance rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleWeightChange = (id, newWeight) => {
    const val = Math.max(1, Math.min(100, Number(newWeight) || 0));
    setRules((prev) =>
      prev.map((r) => (r.ruleId === id || r._id === id ? { ...r, weight: val } : r))
    );
  };

  const handleToggleActive = (id) => {
    setRules((prev) =>
      prev.map((r) =>
        r.ruleId === id || r._id === id ? { ...r, active: !r.active } : r
      )
    );
  };

  const handleSaveRule = async (rule) => {
    const targetId = rule._id || rule.ruleId;
    try {
      setSavingId(targetId);
      const res = await api.updateRule(targetId, {
        weight: rule.weight,
        active: rule.active,
        severity: rule.severity,
      });
      if (res && res.success) {
        showToast(`Rule ${rule.ruleId} updated successfully.`);
      } else {
        throw new Error(res?.message || 'Update failed.');
      }
    } catch (err) {
      console.error('[Save Rule Error]:', err);
      alert('Failed to save rule: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <LoadingState message="Loading Legal Metrology compliance rules from MongoDB..." />;
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '3rem 1rem' }}>
        <ErrorState
          title="Could Not Load Rules"
          message={error}
          onRetry={fetchRules}
        />
      </div>
    );
  }

  const totalActiveWeight = rules
    .filter((r) => r.active !== false)
    .reduce((sum, r) => sum + (Number(r.weight) || 0), 0);

  return (
    <div className="admin-rules-page container">
      {/* Toast */}
      {toast && (
        <div className="rules-toast" role="status">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="rules-header">
        <div className="rules-title-group">
          <div className="rules-badge">
            <Sliders size={16} />
            <span>ADMINISTRATIVE CONFIGURATION</span>
          </div>
          <h1 className="rules-title">Compliance Rule Engine</h1>
          <p className="rules-subtitle">
            Configure scoring weights and active statuses for mandatory packaged commodity rules under the Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
        </div>

        <div className="weight-total-box card">
          <span className="weight-label">Active Weight Total</span>
          <div className="weight-val-row">
            <span className={`weight-val ${totalActiveWeight === 100 ? 'ideal' : 'warning'}`}>
              {totalActiveWeight}
            </span>
            <span className="weight-max">/ 100 pts</span>
          </div>
          {totalActiveWeight !== 100 && (
            <span className="weight-hint">
              {totalActiveWeight > 100 ? 'Weight exceeds 100' : 'Recommended total: 100'}
            </span>
          )}
        </div>
      </div>

      {/* Rules Table / Cards */}
      <div className="card rules-table-card">
        <div className="rules-card-header">
          <div className="rules-card-title-group">
            <Scale size={20} className="rules-scale-icon" />
            <h3>Configured Declaration Rules ({rules.length})</h3>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchRules}
            title="Reload Rules"
          >
            <RotateCcw size={14} />
            <span>Refresh Rules</span>
          </button>
        </div>

        <div className="rules-list">
          {rules.map((rule) => {
            const id = rule._id || rule.ruleId;
            const isSaving = savingId === id;

            return (
              <div
                key={rule.ruleId || id}
                className={`rule-editor-row ${rule.active !== false ? 'active-rule' : 'inactive-rule'}`}
              >
                <div className="rule-info-col">
                  <div className="rule-tag-row">
                    <span className="rule-code-badge">{rule.ruleId}</span>
                    <span className={`rule-category-badge ${rule.category?.toLowerCase() || ''}`}>
                      {rule.category}
                    </span>
                    {rule.required && <span className="rule-required-badge">Mandatory</span>}
                  </div>
                  <h4 className="rule-label-title">{rule.label}</h4>
                  <p className="rule-desc-text">{rule.description}</p>
                </div>

                <div className="rule-controls-col">
                  {/* Active Toggle */}
                  <div className="rule-toggle-group">
                    <label className="switch-label">
                      <input
                        type="checkbox"
                        checked={rule.active !== false}
                        onChange={() => handleToggleActive(rule.ruleId)}
                        className="toggle-checkbox"
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-text">
                        {rule.active !== false ? 'Active' : 'Disabled'}
                      </span>
                    </label>
                  </div>

                  {/* Weight Input */}
                  <div className="rule-weight-group">
                    <span className="weight-input-label">Weight:</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={rule.weight || 10}
                      onChange={(e) => handleWeightChange(rule.ruleId, e.target.value)}
                      className="weight-input"
                    />
                    <span className="weight-unit">pts</span>
                  </div>

                  {/* Save Button */}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm save-rule-btn"
                    onClick={() => handleSaveRule(rule)}
                    disabled={isSaving}
                  >
                    <Save size={14} />
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rules-disclaimer-wrap">
        <Disclaimer compact />
      </div>
    </div>
  );
}
