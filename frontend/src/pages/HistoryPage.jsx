import React, { useEffect, useState } from 'react';
import { History, ScanLine, Filter, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import ScanCard from '../components/ScanCard';
import SearchFilter from '../components/SearchFilter';
import { LoadingState, ErrorState, EmptyState } from '../components/StateFeedback';
import Disclaimer from '../components/Disclaimer';
import api from '../services/api';
import './HistoryPage.css';

export default function HistoryPage() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [sort, setSort] = useState('newest');

  const fetchScans = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getScans({ search, status, sort });
      if (res && res.success && Array.isArray(res.data)) {
        setScans(res.data);
      } else {
        throw new Error(res?.message || 'Failed to load inspections.');
      }
    } catch (err) {
      console.error('[HistoryPage Error]:', err);
      setError(err.message || 'Error fetching inspection records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchScans();
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [search, status, sort]);

  return (
    <div className="history-page container">
      {/* Header */}
      <div className="history-header">
        <div className="history-title-wrap">
          <div className="history-badge">
            <History size={16} />
            <span>AUDIT ARCHIVE</span>
          </div>
          <h1 className="history-title">Inspection History</h1>
          <p className="history-subtitle">
            Search and review past packaged commodity compliance assessments stored in MongoDB.
          </p>
        </div>

        <Link to="/scan" className="btn btn-accent btn-md history-scan-cta">
          <ScanLine size={18} />
          <span>New Inspection</span>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="history-filter-wrapper">
        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          sort={sort}
          onSortChange={setSort}
        />
      </div>

      {/* Scans List / State Feedback */}
      <div className="history-content">
        {loading ? (
          <LoadingState message="Fetching inspection logs from database..." />
        ) : error ? (
          <ErrorState
            title="Failed to Load Inspections"
            message={error}
            onRetry={fetchScans}
          />
        ) : scans.length === 0 ? (
          <EmptyState
            title="No inspections yet."
            message={
              search || status !== 'ALL'
                ? 'Try modifying your search keywords or status filter.'
                : 'Upload or capture a product package to begin inspection.'
            }
            actionText="Start Real Inspection"
            onAction={() => (window.location.href = '/scan')}
          />
        ) : (
          <div className="scans-grid">
            {scans.map((scan) => (
              <ScanCard key={scan._id} scan={scan} />
            ))}
          </div>
        )}
      </div>

      <div className="history-disclaimer-wrap">
        <Disclaimer compact />
      </div>
    </div>
  );
}
