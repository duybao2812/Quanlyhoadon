import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Download, Upload, FolderArchive, X, FileText, Filter, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useToast } from '../Notifications';
import { SearchResult, SearchResponse } from '../../types/documentTypes';
import { DOCUMENT_FIELDS, SECURITY_LEVELS, URGENCY_LEVELS } from '../../types/documentTypes';

interface SearchFilters {
  type?: string;
  field?: string;
  securityLevel?: string;
  urgencyLevel?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface GlobalSearchProps {
  ownerId: string;
  onSelectResult?: (type: string, id: string) => void;
  className?: string;
}

const DEFAULT_FILTERS: SearchFilters = {
  type: undefined,
  field: undefined,
  securityLevel: undefined,
  urgencyLevel: undefined,
  dateFrom: undefined,
  dateTo: undefined,
};

export function GlobalSearch({ ownerId, onSelectResult, className }: GlobalSearchProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters = filters.type || filters.field || filters.securityLevel || filters.urgencyLevel || filters.dateFrom || filters.dateTo;

  const buildSearchUrl = useCallback((q: string, f: SearchFilters) => {
    const params = new URLSearchParams({ q });
    if (f.type) params.set('type', f.type);
    if (f.field) params.set('field', f.field);
    if (f.securityLevel) params.set('securityLevel', f.securityLevel);
    if (f.urgencyLevel) params.set('urgencyLevel', f.urgencyLevel);
    if (f.dateFrom) params.set('dateFrom', f.dateFrom);
    if (f.dateTo) params.set('dateTo', f.dateTo);
    return `/api/search?${params.toString()}`;
  }, []);

  const search = useCallback(async (q: string, f: SearchFilters) => {
    if (!q || q.trim().length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(buildSearchUrl(q.trim(), f), {
        headers: { 'x-custom-user-id': ownerId }
      });
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      toast('Lỗi tìm kiếm', 'error');
    } finally {
      setLoading(false);
    }
  }, [ownerId, toast, buildSearchUrl]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      search(query, filters);
    }, 300);
    return () => clearTimeout(debounce);
  }, [query, filters, search]);

  const totalResults = results
    ? (results.total || results.incoming.length + results.outgoing.length + results.archives.length)
    : 0;

  const handleSelect = (result: SearchResult) => {
    onSelectResult?.(result.type, result.id);
    setQuery('');
    setResults(null);
    setIsOpen(false);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-text-dim" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Tìm kiếm văn bản, hồ sơ, hợp đồng..."
          className="input-field w-full pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults(null); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded text-text-dim hover:text-white"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {isOpen && query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card-dark border border-border-dark rounded-xl shadow-2xl z-50 max-h-[600px] overflow-hidden flex flex-col"
          >
            {loading ? (
              <div className="p-8 text-center text-text-dim">
                <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-2 text-sm">Đang tìm kiếm...</p>
              </div>
            ) : !results || totalResults === 0 ? (
              <div className="p-8 text-center">
                <Search className="size-10 text-text-dim mx-auto mb-3 opacity-50" />
                <p className="text-text-dim">Không tìm thấy kết quả nào</p>
                <p className="text-text-dim text-xs mt-1">Thử từ khóa khác hoặc bỏ bộ lọc</p>
              </div>
            ) : (
              <>
                {/* Results Summary */}
                <div className="px-4 py-2 bg-white/5 border-b border-border-dark flex items-center justify-between">
                  <span className="text-xs text-text-dim">
                    Tìm thấy <span className="text-white font-medium">{totalResults}</span> kết quả
                  </span>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <X className="size-3" /> Xóa lọc
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto flex-1">
                  {/* Incoming Documents */}
                  {results.incoming.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-white/5 text-xs font-semibold text-text-dim uppercase tracking-wider flex items-center gap-2">
                        <Download className="size-4 text-blue-400" />
                        Văn bản đến ({results.incoming.length})
                      </div>
                      <div className="divide-y divide-border-dark">
                        {results.incoming.map((result) => (
                          <button
                            key={`incoming-${result.id}`}
                            onClick={() => handleSelect(result)}
                            className="w-full px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors text-left"
                          >
                            <FileText className="size-5 text-blue-400 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white truncate">{result.title}</p>
                              <p className="text-sm text-text-dim truncate">{result.subtitle}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Outgoing Documents */}
                  {results.outgoing.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-white/5 text-xs font-semibold text-text-dim uppercase tracking-wider flex items-center gap-2">
                        <Upload className="size-4 text-green-400" />
                        Văn bản đi ({results.outgoing.length})
                      </div>
                      <div className="divide-y divide-border-dark">
                        {results.outgoing.map((result) => (
                          <button
                            key={`outgoing-${result.id}`}
                            onClick={() => handleSelect(result)}
                            className="w-full px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors text-left"
                          >
                            <FileText className="size-5 text-green-400 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white truncate">{result.title}</p>
                              <p className="text-sm text-text-dim truncate">{result.subtitle}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Archives */}
                  {results.archives.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-white/5 text-xs font-semibold text-text-dim uppercase tracking-wider flex items-center gap-2">
                        <FolderArchive className="size-4 text-orange-400" />
                        Hồ sơ ({results.archives.length})
                      </div>
                      <div className="divide-y divide-border-dark">
                        {results.archives.map((result) => (
                          <button
                            key={`archive-${result.id}`}
                            onClick={() => handleSelect(result)}
                            className="w-full px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors text-left"
                          >
                            <FolderArchive className="size-5 text-orange-400 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white truncate">{result.title}</p>
                              <p className="text-sm text-text-dim truncate">{result.subtitle}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Standalone Search Page Component
interface SearchPageProps {
  ownerId: string;
}

export function SearchPage({ ownerId }: SearchPageProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = filters.type || filters.field || filters.securityLevel || filters.urgencyLevel || filters.dateFrom || filters.dateTo;

  const buildSearchUrl = useCallback((q: string, f: SearchFilters) => {
    const params = new URLSearchParams({ q });
    if (f.type) params.set('type', f.type);
    if (f.field) params.set('field', f.field);
    if (f.securityLevel) params.set('securityLevel', f.securityLevel);
    if (f.urgencyLevel) params.set('urgencyLevel', f.urgencyLevel);
    if (f.dateFrom) params.set('dateFrom', f.dateFrom);
    if (f.dateTo) params.set('dateTo', f.dateTo);
    return `/api/search?${params.toString()}`;
  }, []);

  const search = useCallback(async (q: string, f: SearchFilters) => {
    if (!q || q.trim().length < 2) {
      setResults(null);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const response = await fetch(buildSearchUrl(q.trim(), f), {
        headers: { 'x-custom-user-id': ownerId }
      });
      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || 'Search failed');
      }
      setResults({
        incoming: data.incoming || [],
        outgoing: data.outgoing || [],
        archives: data.archives || [],
        total: data.total || 0,
        page: data.page || 1,
        limit: data.limit || 50,
        totalPages: data.totalPages || 1,
      });
    } catch (error) {
      console.error('Search error:', error);
      toast('Lỗi tìm kiếm', 'error');
    } finally {
      setLoading(false);
    }
  }, [ownerId, toast, buildSearchUrl]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(query, filters);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const totalResults = results
    ? (results.total || results.incoming.length + results.outgoing.length + results.archives.length)
    : 0;

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Search className="size-7 text-primary" />
          Tìm kiếm nâng cao
        </h1>
        <p className="text-text-dim text-sm mt-1">
          Tìm kiếm văn bản, hồ sơ, hợp đồng với bộ lọc chi tiết
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-text-dim" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập từ khóa tìm kiếm (tối thiểu 2 ký tự)..."
            className="input-field w-full pl-12 pr-4 py-4 text-lg"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm",
              showFilters || hasActiveFilters
                ? "bg-primary/20 border-primary text-primary"
                : "bg-card-dark border-border-dark text-text-dim hover:text-white hover:border-text-dim"
            )}
          >
            <SlidersHorizontal className="size-4" />
            Bộ lọc nâng cao
            {activeFilterCount > 0 && (
              <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-text-dim hover:text-white flex items-center gap-1"
            >
              <X className="size-3" /> Xóa tất cả lọc
            </button>
          )}

          <button type="submit" className="btn-primary ml-auto px-6">
            Tìm kiếm
          </button>
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="card overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* Document Type Filter */}
                <div>
                  <label className="text-sm text-text-dim mb-2 block">Loại văn bản</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: undefined, label: 'Tất cả' },
                      { value: 'incoming', label: 'Văn bản đến' },
                      { value: 'outgoing', label: 'Văn bản đi' },
                      { value: 'archive', label: 'Hồ sơ lưu trữ' },
                    ].map((opt) => (
                      <button
                        key={opt.value || 'all'}
                        type="button"
                        onClick={() => setFilters({ ...filters, type: opt.value })}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                          filters.type === opt.value
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-white/5 border-border-dark text-text-dim hover:text-white"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Field Filter */}
                <div>
                  <label className="text-sm text-text-dim mb-2 block">Lĩnh vực</label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setFilters({ ...filters, field: undefined })}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                        !filters.field
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-white/5 border-border-dark text-text-dim hover:text-white"
                      )}
                    >
                      Tất cả
                    </button>
                    {DOCUMENT_FIELDS.map((field) => (
                      <button
                        key={field}
                        type="button"
                        onClick={() => setFilters({ ...filters, field })}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                          filters.field === field
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-white/5 border-border-dark text-text-dim hover:text-white"
                        )}
                      >
                        {field}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Security Level Filter */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-text-dim mb-2 block">Độ bảo mật</label>
                    <select
                      value={filters.securityLevel || ''}
                      onChange={(e) => setFilters({ ...filters, securityLevel: e.target.value || undefined })}
                      className="input-field w-full"
                    >
                      <option value="">Tất cả</option>
                      {SECURITY_LEVELS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-text-dim mb-2 block">Độ khẩn</label>
                    <select
                      value={filters.urgencyLevel || ''}
                      onChange={(e) => setFilters({ ...filters, urgencyLevel: e.target.value || undefined })}
                      className="input-field w-full"
                    >
                      <option value="">Tất cả</option>
                      {URGENCY_LEVELS.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-text-dim mb-2 block">Từ ngày</label>
                    <input
                      type="date"
                      value={filters.dateFrom || ''}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-text-dim mb-2 block">Đến ngày</label>
                    <input
                      type="date"
                      value={filters.dateTo || ''}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                      className="input-field w-full"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Results */}
      {loading ? (
        <div className="card p-8 text-center">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-text-dim">Đang tìm kiếm...</p>
        </div>
      ) : results ? (
        <div className="space-y-6">
          {totalResults === 0 ? (
            <div className="card p-12 text-center">
              <Search className="size-12 text-text-dim mx-auto mb-4 opacity-50" />
              <p className="text-lg text-text-dim">Không tìm thấy kết quả nào</p>
              <p className="text-text-dim text-sm mt-2">Hãy thử tìm kiếm với từ khóa khác hoặc bỏ bộ lọc</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-text-dim">
                  Tìm thấy <span className="text-white font-medium">{totalResults}</span> kết quả
                </p>
                {results.totalPages && results.totalPages > 1 && (
                  <p className="text-text-dim text-sm">
                    Trang {results.page} / {results.totalPages}
                  </p>
                )}
              </div>

              {/* Incoming Documents */}
              {results.incoming.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 bg-blue-500/10 text-blue-400 font-medium flex items-center gap-2">
                    <Download className="size-5" />
                    Văn bản đến ({results.incoming.length})
                  </div>
                  <div className="divide-y divide-border-dark">
                    {results.incoming.map((result, idx) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="size-5 text-blue-400 mt-1 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white mb-1">{result.title}</h3>
                            <p className="text-sm text-text-dim mb-2">{result.subtitle}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-text-dim">
                              {Object.entries(result.metadata).map(([key, value]) => (
                                value && value !== '-' && (
                                  <span key={key} className="px-2 py-1 bg-white/5 rounded">
                                    {key}: {value}
                                  </span>
                                )
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outgoing Documents */}
              {results.outgoing.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 bg-green-500/10 text-green-400 font-medium flex items-center gap-2">
                    <Upload className="size-5" />
                    Văn bản đi ({results.outgoing.length})
                  </div>
                  <div className="divide-y divide-border-dark">
                    {results.outgoing.map((result, idx) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="size-5 text-green-400 mt-1 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white mb-1">{result.title}</h3>
                            <p className="text-sm text-text-dim mb-2">{result.subtitle}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-text-dim">
                              {Object.entries(result.metadata).map(([key, value]) => (
                                value && value !== '-' && (
                                  <span key={key} className="px-2 py-1 bg-white/5 rounded">
                                    {key}: {value}
                                  </span>
                                )
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Archives */}
              {results.archives.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 bg-orange-500/10 text-orange-400 font-medium flex items-center gap-2">
                    <FolderArchive className="size-5" />
                    Hồ sơ lưu trữ ({results.archives.length})
                  </div>
                  <div className="divide-y divide-border-dark">
                    {results.archives.map((result, idx) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <FolderArchive className="size-5 text-orange-400 mt-1 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white mb-1">{result.title}</h3>
                            <p className="text-sm text-text-dim mb-2">{result.subtitle}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-text-dim">
                              {Object.entries(result.metadata).map(([key, value]) => (
                                value && value !== '-' && (
                                  <span key={key} className="px-2 py-1 bg-white/5 rounded">
                                    {key}: {value}
                                  </span>
                                )
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
