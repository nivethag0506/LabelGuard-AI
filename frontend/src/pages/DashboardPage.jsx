import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Award,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  ScanLine
} from 'lucide-react';
import DashboardMetric from '../components/DashboardMetric';
import ChartCard, {
  DistributionChart,
  TrendChart,
  CommonIssuesList
} from '../components/ChartCard';
import StatusBadge from '../components/StatusBadge';
import { LoadingState, ErrorState } from '../components/StateFeedback';
import Disclaimer from '../components/Disclaimer';
import api from '../services/api';
import './DashboardPage.css';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboardStats();
      if (res && res.success && res.data) {
        setStats(res.data);
      } else {
        throw new Error(res?.message || 'Failed to load dashboard metrics.');
      }
    } catch (err) {
      console.error('[Dashboard Error]:', err);
      setError(err.message || 'Error connecting to analytics database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <LoadingState message="Aggregating market compliance analytics from MongoDB..." />;
  }

  if (error || !stats) {
    return (
      <div className="container" style={{ padding: '3rem 1rem' }}>
        <ErrorState
          title="Dashboard Unavailable"
          message={error || 'Could not retrieve statistical records.'}
          onRetry={fetchStats}
        />
      </div>
    );
  }

  const {
    totalScans = 0,
    compliantCount = 0,
    needsReviewCount = 0,
    highRiskCount = 0,
    averageScore = 0,
    complianceDistribution = { compliant: 0, needsReview: 0, highRisk: 0 },
    commonIssues = [],
    recentScans = [],
    complianceTrend = []
  } = stats;

  return (
    <div className="dashboard-page container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <div className="dashboard-badge">
            <BarChart3 size={16} />
            <span>REGULATORY OVERSIGHT</span>
          </div>
          <h1 className="dashboard-title">Authority Dashboard</h1>
          <p className="dashboard-subtitle">
            Live compliance monitoring & declaration integrity overview under Legal Metrology Rules, 2011.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchStats}
            title="Refresh Metrics"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <Link to="/scan" className="btn btn-accent btn-sm">
            <ScanLine size={15} />
            <span>Scan Product</span>
          </Link>
        </div>
      </div>

      {/* Empty Database Notice */}
      {totalScans === 0 && (
        <div className="card empty-dashboard-banner" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem', background: 'rgba(30, 41, 59, 0.5)', border: '1px dashed rgba(148, 163, 184, 0.3)', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text)', marginBottom: '0.4rem', fontWeight: 600 }}>No inspections yet.</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            There are currently zero inspections stored in the database. Scan real packaged commodities to generate live regulatory statistics.
          </p>
          <Link to="/scan" className="btn btn-accent btn-md" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <ScanLine size={18} />
            <span>Start Real Inspection</span>
          </Link>
        </div>
      )}

      {/* Top 5 Metric Cards */}
      <div className="metrics-grid">
        <DashboardMetric
          title="Total Inspections"
          value={totalScans.toLocaleString()}
          subtext="Persistent scan logs"
          icon={BarChart3}
          color="blue"
        />
        <DashboardMetric
          title="Compliant"
          value={compliantCount.toLocaleString()}
          subtext={`${totalScans ? Math.round((compliantCount / totalScans) * 100) : 0}% of all samples`}
          icon={ShieldCheck}
          color="green"
        />
        <DashboardMetric
          title="Needs Review"
          value={needsReviewCount.toLocaleString()}
          subtext="Ambiguous or partial"
          icon={AlertTriangle}
          color="amber"
        />
        <DashboardMetric
          title="High Risk"
          value={highRiskCount.toLocaleString()}
          subtext="Major omission flagged"
          icon={AlertOctagon}
          color="red"
        />
        <DashboardMetric
          title="Average Score"
          value={`${averageScore}%`}
          subtext="Weighted metric avg"
          icon={Award}
          color="blue"
        />
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Compliance Distribution */}
        <ChartCard
          title="Compliance Distribution"
          subtitle="Proportion of compliant, needs review, and high risk items"
        >
          <DistributionChart distribution={complianceDistribution} />
        </ChartCard>

        {/* Compliance Trend */}
        <ChartCard
          title="Compliance Performance Trend"
          subtitle="Weighted assessment score trends over time"
        >
          <TrendChart data={complianceTrend} />
        </ChartCard>
      </div>

      {/* Common Issues & Market Vulnerabilities */}
      <div className="dashboard-lower-grid">
        <ChartCard
          title="Most Prevalent Declaration Deficiencies"
          subtitle="Top non-compliance rules flagged across packaged goods"
        >
          <CommonIssuesList issues={commonIssues} />
        </ChartCard>

        {/* Recent Inspections */}
        <div className="card recent-inspections-card">
          <div className="recent-card-header">
            <h3 className="recent-title">Recent Inspections</h3>
            <Link to="/history" className="view-all-link">
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="recent-table-wrapper">
            <table className="recent-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                      <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>No inspections yet.</p>
                      <p style={{ fontSize: '0.85rem' }}>Upload or capture a product package to begin inspection.</p>
                    </td>
                  </tr>
                ) : (
                  recentScans.map((scan) => (
                    <tr key={scan._id}>
                      <td>
                        <div className="recent-prod-cell">
                          <span className="recent-prod-name">{scan.productName}</span>
                          <span className="recent-prod-mfg">{scan.manufacturer || 'Packaged Commodity'}</span>
                        </div>
                      </td>
                      <td>
                        <strong className="recent-score-text">{scan.complianceScore}%</strong>
                      </td>
                      <td>
                        <StatusBadge status={scan.status} size="sm" />
                      </td>
                      <td>
                        <Link to={`/result/${scan._id}`} className="recent-link-btn">
                          Report &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="dashboard-disclaimer-wrap">
        <Disclaimer compact />
      </div>
    </div>
  );
}
