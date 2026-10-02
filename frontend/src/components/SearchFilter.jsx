import React from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import './SearchFilter.css';

export default function SearchFilter({
  search,
  onSearchChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
}) {
  const statusOptions = [
    { value: 'ALL', label: 'All Scans' },
    { value: 'COMPLIANT', label: 'Compliant' },
    { value: 'NEEDS_REVIEW', label: 'Needs Review' },
    { value: 'HIGH_RISK', label: 'High Risk' },
  ];

  return (
    <div className="search-filter-container">
      {/* Search Input */}
      <div className="search-input-box">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search by product, manufacturer, batch number..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
        {search && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onSearchChange('')}
          >
            ×
          </button>
        )}
      </div>

      <div className="filter-controls-row">
        {/* Status Filter Buttons */}
        <div className="status-pills">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`status-pill ${status === opt.value ? 'active' : ''} ${opt.value.toLowerCase()}`}
              onClick={() => onStatusChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="sort-select-box">
          <ArrowUpDown size={14} className="sort-icon" />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="score_high">Highest Score</option>
            <option value="score_low">Lowest Score</option>
          </select>
        </div>
      </div>
    </div>
  );
}
