import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { DOCUMENT_FIELDS, SecurityLevel, UrgencyLevel, SECURITY_LEVELS, URGENCY_LEVELS } from '../../../types/documentTypes';

interface FilterParams {
  search?: string;
  field?: string;
  securityLevel?: SecurityLevel;
  urgencyLevel?: UrgencyLevel;
  dateFrom?: string;
  dateTo?: string;
}

interface DocumentFilterProps {
  filters: FilterParams;
  onFilterChange: (filters: FilterParams) => void;
  showDateFilter?: boolean;
  className?: string;
}

export function DocumentFilter({ 
  filters, 
  onFilterChange, 
  showDateFilter = false,
  className 
}: DocumentFilterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof FilterParams, value: string | undefined) => {
    onFilterChange({ ...filters, [key]: value || undefined });
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = filters.field || filters.securityLevel || filters.urgencyLevel || filters.dateFrom || filters.dateTo;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-dim" />
        <input
          type="text"
          placeholder="Tìm kiếm..."
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="input-field w-full pl-10 pr-4"
        />
      </div>

      {/* Advanced Filter Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className={cn(
          'flex items-center gap-2 text-sm font-medium transition-colors',
          showAdvanced || hasActiveFilters ? 'text-primary' : 'text-text-dim hover:text-white'
        )}
      >
        <Filter className="size-4" />
        Bộ lọc nâng cao
        {hasActiveFilters && (
          <span className="size-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
            {(filters.field ? 1 : 0) + (filters.securityLevel ? 1 : 0) + (filters.urgencyLevel ? 1 : 0) + (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0)}
          </span>
        )}
      </button>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="p-4 bg-card-dark rounded-xl border border-border-dark space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Field */}
            <div>
              <label className="block text-xs font-medium text-text-dim mb-1.5">Lĩnh vực</label>
              <select
                value={filters.field || ''}
                onChange={(e) => updateFilter('field', e.target.value)}
                className="input-field w-full"
              >
                <option value="">Tất cả</option>
                {DOCUMENT_FIELDS.map(field => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
            </div>

            {/* Security Level */}
            <div>
              <label className="block text-xs font-medium text-text-dim mb-1.5">Độ mật</label>
              <select
                value={filters.securityLevel || ''}
                onChange={(e) => updateFilter('securityLevel', e.target.value)}
                className="input-field w-full"
              >
                <option value="">Tất cả</option>
                {SECURITY_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>

            {/* Urgency Level */}
            <div>
              <label className="block text-xs font-medium text-text-dim mb-1.5">Độ khẩn</label>
              <select
                value={filters.urgencyLevel || ''}
                onChange={(e) => updateFilter('urgencyLevel', e.target.value)}
                className="input-field w-full"
              >
                <option value="">Tất cả</option>
                {URGENCY_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            {showDateFilter && (
              <div>
                <label className="block text-xs font-medium text-text-dim mb-1.5">Từ ngày</label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="input-field w-full"
                />
              </div>
            )}

            {/* Date To */}
            {showDateFilter && (
              <div>
                <label className="block text-xs font-medium text-text-dim mb-1.5">Đến ngày</label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="input-field w-full"
                />
              </div>
            )}
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 text-sm text-text-dim hover:text-white transition-colors"
            >
              <X className="size-4" />
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}
    </div>
  );
}
