import { ChevronLeft, ChevronRight, ChevronsUpDown, FileText } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { PaginatedResponse } from '../../../types/documentTypes';
import { motion } from 'framer-motion';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  width?: string;
}

interface DocumentTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: PaginatedResponse<T>;
  onPageChange?: (page: number) => void;
  onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  emptyMessage?: string;
  className?: string;
}

export function DocumentTable<T extends Record<string, any>>({
  data,
  columns,
  loading,
  pagination,
  onPageChange,
  onSort,
  sortBy,
  sortOrder,
  emptyMessage = 'Không có dữ liệu',
  className
}: DocumentTableProps<T>) {

  const handleSort = (key: string) => {
    if (!onSort) return;
    const col = columns.find(c => c.key === key);
    if (!col?.sortable) return;
    
    const newOrder = sortBy === key && sortOrder === 'desc' ? 'asc' : 'desc';
    onSort(key, newOrder);
  };

  // Helper to check if item is a contract
  const isContract = (item: T) => !!item.form_data || !!item.document_type;

  if (loading) {
    return (
      <div className={cn('bg-card-dark rounded-2xl border border-border-dark overflow-hidden shadow-xl', className)}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-bg-dark to-bg-card">
                {columns.map(col => (
                  <th key={col.key} className={cn('px-4 py-3.5 text-left text-xs font-semibold text-text-dim uppercase tracking-wider', col.className)}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-t border-border-dark/50">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-4">
                      <div className="h-4 bg-white/5 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn('bg-card-dark rounded-2xl border border-border-dark overflow-hidden shadow-xl flex items-center justify-center py-20', className)}>
        <div className="text-center">
          <div className="size-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <FileText className="size-10 text-primary/60" />
          </div>
          <p className="text-text-dim font-medium text-lg">{emptyMessage}</p>
          <p className="text-text-dim/60 text-sm mt-1">Dữ liệu sẽ xuất hiện khi có văn bản mới</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-card-dark rounded-2xl border border-border-dark overflow-hidden shadow-xl', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-bg-dark via-bg-card to-bg-dark">
              {columns.map(col => (
                <th 
                  key={col.key} 
                  className={cn(
                    'px-4 py-4 text-left text-xs font-bold text-text-dim uppercase tracking-wider',
                    'border-b border-border-dark/60',
                    col.sortable && 'cursor-pointer hover:bg-white/5 transition-colors',
                    col.className
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    {col.header}
                    {col.sortable && (
                      <ChevronsUpDown className={cn(
                        'size-3.5 transition-all',
                        sortBy !== col.key ? 'opacity-30' : 'opacity-100 text-primary'
                      )} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <motion.tr 
                key={item.id || idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.025, duration: 0.2 }}
                className={cn(
                  'border-b border-border-dark/40 hover:bg-white/[0.03] transition-all duration-200 group',
                  isContract(item) && 'bg-gradient-to-r from-orange-500/[0.02] to-transparent'
                )}
              >
                {columns.map(col => (
                  <td key={col.key} className={cn('px-4 py-3.5 text-sm', col.className)}>
                    {col.render ? col.render(item) : (
                      <span className="block break-words whitespace-normal">
                        {(item[col.key] as React.ReactNode)?.toString() ?? '-'}
                      </span>
                    )}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-bg-dark to-bg-card border-t border-border-dark/40">
        <div className="flex items-center gap-4 text-xs text-text-dim">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary"></span>
            Tổng cộng: <span className="font-semibold text-white">{data.length}</span> mục
          </span>
          {data.filter(isContract).length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-orange-500"></span>
              Hợp đồng: <span className="font-semibold text-orange-400">{data.filter(isContract).length}</span>
            </span>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-text-dim hover:text-white"
            >
              <ChevronLeft className="size-4" />
            </button>
            
            {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              
              return (
                <button
                  key={i}
                  onClick={() => onPageChange?.(pageNum)}
                  className={cn(
                    'size-8 rounded-lg text-xs font-semibold transition-all duration-200',
                    pagination.page === pageNum
                      ? 'bg-primary text-white shadow-lg shadow-primary/25'
                      : 'hover:bg-white/10 text-text-dim hover:text-white'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-text-dim hover:text-white"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
