import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Building2,
  MapPin,
  Hash,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  X,
  RefreshCw,
  FileText,
  Info,
  Clock,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface TaxBusinessData {
  id: string;
  name: string;
  internationalName: string | null;
  shortName: string | null;
  address: string;
  status: string;
}

interface TaxApiResponse {
  code: string;
  desc: string;
  data: TaxBusinessData | null;
  metadata?: {
    disclaimer: string;
    source: string;
    updatedAt: string;
    contact: string;
  };
}

interface LookupHistoryItem {
  taxCode: string;
  name: string;
  timestamp: number;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  active: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    label: 'Đang hoạt động'
  },
  inactive: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    label: 'Ngừng hoạt động'
  },
  default: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    label: ''
  }
};

function getStatusConfig(status: string) {
  if (!status) return STATUS_CONFIG.default;
  const lower = status.toLowerCase();
  if (lower.includes('hoạt động') && !lower.includes('ngừng') && !lower.includes('chấm dứt')) {
    return STATUS_CONFIG.active;
  }
  if (lower.includes('ngừng') || lower.includes('chấm dứt') || lower.includes('giải thể')) {
    return STATUS_CONFIG.inactive;
  }
  return STATUS_CONFIG.default;
}

function formatDate(isoDate: string) {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoDate;
  }
}

const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-text-dim hover:text-primary transition-all active:scale-90 shrink-0"
      title="Sao chép"
    >
      {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
    </button>
  );
};

const InfoRow = ({ icon: Icon, label, value, copyable = false }: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
}) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors group border border-transparent hover:border-border-dark">
      <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
        <Icon className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-bold text-white leading-relaxed break-words">{value}</p>
      </div>
      {copyable && <CopyButton value={value} />}
    </div>
  );
};

export const TaxLookupView = () => {
  const [taxCode, setTaxCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaxApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<LookupHistoryItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('tax_lookup_history') || '[]');
    } catch {
      return [];
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const saveToHistory = useCallback((taxCode: string, name: string) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.taxCode !== taxCode);
      const next = [{ taxCode, name, timestamp: Date.now() }, ...filtered].slice(0, 10);
      localStorage.setItem('tax_lookup_history', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleLookup = useCallback(async (code?: string) => {
    const query = (code ?? taxCode).trim().replace(/[^0-9\-]/g, '');
    if (!query) {
      setError('Vui lòng nhập mã số thuế hợp lệ.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`https://api.vietqr.io/v2/business/${query}`, {
        headers: { Accept: 'application/json' }
      });

      if (!res.ok) {
        throw new Error(`Lỗi kết nối: HTTP ${res.status}`);
      }

      const json: TaxApiResponse = await res.json();
      setResult(json);

      if (json.code === '00' && json.data) {
        saveToHistory(query, json.data.name);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [taxCode, saveToHistory]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleLookup();
  };

  const handleClear = () => {
    setTaxCode('');
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  };

  const handleHistoryClick = (item: LookupHistoryItem) => {
    setTaxCode(item.taxCode);
    handleLookup(item.taxCode);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('tax_lookup_history');
  };

  const statusCfg = result?.data ? getStatusConfig(result.data.status) : null;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-bg-dark">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
            <Search className="size-5 text-primary" />
            <span className="text-xs font-black text-primary uppercase tracking-widest">Tra cứu mã số thuế</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">
            Tra cứu thông tin doanh nghiệp
          </h1>
          <p className="text-text-dim text-sm font-medium max-w-md mx-auto leading-relaxed">
            Nhập mã số thuế để tra cứu thông tin doanh nghiệp qua hệ thống VietQR.io — 
            dữ liệu từ Tổng cục thuế Việt Nam.
          </p>
        </motion.div>

        {/* Search Box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card-dark rounded-3xl border border-border-dark p-6 shadow-2xl"
        >
          <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-3">
            Mã số thuế (MST)
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-text-dim pointer-events-none" />
              <input
                ref={inputRef}
                id="tax-code-input"
                type="text"
                value={taxCode}
                onChange={e => setTaxCode(e.target.value.replace(/[^0-9\-]/g, ''))}
                onKeyDown={handleKeyDown}
                placeholder="Nhập mã số thuế, ví dụ: 0309892034"
                maxLength={20}
                className="w-full bg-bg-dark border border-border-dark rounded-2xl pl-12 pr-12 py-4 text-white font-bold text-base placeholder:text-text-dim/50 outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.15)] transition-all"
              />
              {taxCode && (
                <button
                  onClick={handleClear}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 text-text-dim hover:text-white transition-all"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <button
              id="tax-lookup-btn"
              onClick={() => handleLookup()}
              disabled={loading || !taxCode.trim()}
              className="px-6 py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 shrink-0"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Search className="size-5" />
              )}
              <span className="hidden sm:inline">{loading ? 'Đang tra...' : 'Tra cứu'}</span>
            </button>
          </div>

          {/* Quick tips */}
          <p className="mt-3 text-[10px] text-text-dim font-medium px-1">
            💡 Mã số thuế thường có 10 hoặc 13 chữ số. Nhấn Enter để tra cứu nhanh.
          </p>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-4 p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400"
            >
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-sm">Không tìm thấy kết quả</p>
                <p className="text-xs mt-1 opacity-80">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-4"
            >
              {result.code !== '00' || !result.data ? (
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <AlertCircle className="size-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-sm">Không tìm thấy doanh nghiệp</p>
                    <p className="text-xs mt-1 opacity-80">
                      Mã số thuế <strong>{taxCode}</strong> không có trong cơ sở dữ liệu hoặc chưa được cập nhật.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Result Card */}
                  <div className="bg-card-dark rounded-3xl border border-border-dark shadow-2xl overflow-hidden">
                    {/* Card Header */}
                    <div className="p-6 border-b border-border-dark bg-gradient-to-r from-primary/5 to-transparent">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="size-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10 shrink-0">
                            <Building2 className="size-7 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h2 className="text-lg font-black text-white leading-tight tracking-tight break-words">
                              {result.data.name}
                            </h2>
                            {result.data.shortName && (
                              <p className="text-xs text-text-dim font-bold mt-1">({result.data.shortName})</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs font-black text-text-dim bg-white/5 px-2.5 py-1 rounded-lg border border-border-dark">
                                MST: {result.data.id}
                              </span>
                              <CopyButton value={result.data.id} />
                            </div>
                          </div>
                        </div>

                        {/* Status badge */}
                        {statusCfg && (
                          <div className={cn(
                            'shrink-0 px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center gap-1.5',
                            statusCfg.color, statusCfg.bg, statusCfg.border
                          )}>
                            <div className={cn('size-1.5 rounded-full', statusCfg.color === 'text-emerald-400' ? 'bg-emerald-400 animate-pulse' : 'bg-current')} />
                            {statusCfg.label || 'Trạng thái'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-6 space-y-2">
                      <InfoRow
                        icon={Hash}
                        label="Mã số thuế"
                        value={result.data.id}
                        copyable
                      />
                      <InfoRow
                        icon={Building2}
                        label="Tên doanh nghiệp"
                        value={result.data.name}
                        copyable
                      />
                      {result.data.internationalName && (
                        <InfoRow
                          icon={Globe}
                          label="Tên quốc tế"
                          value={result.data.internationalName}
                          copyable
                        />
                      )}
                      <InfoRow
                        icon={MapPin}
                        label="Địa chỉ"
                        value={result.data.address}
                        copyable
                      />
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors border border-transparent hover:border-border-dark">
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                          <Info className="size-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1">Trạng thái MST</p>
                          <p className={cn('text-sm font-bold leading-relaxed break-words', statusCfg?.color || 'text-white')}>
                            {result.data.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  {result.metadata && (
                    <div className="p-4 rounded-2xl bg-white/3 border border-border-dark space-y-2">
                      <p className="text-[10px] font-black text-text-dim uppercase tracking-widest flex items-center gap-2">
                        <Info className="size-3.5" />
                        Thông tin nguồn dữ liệu
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        <div className="flex items-center gap-2 text-xs text-text-dim">
                          <Clock className="size-3.5 shrink-0" />
                          <span>Cập nhật: <span className="text-white font-bold">{formatDate(result.metadata.updatedAt)}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-dim">
                          <ExternalLink className="size-3.5 shrink-0" />
                          <a
                            href={result.metadata.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-bold"
                          >
                            {result.metadata.source}
                          </a>
                        </div>
                      </div>
                      <p className="text-[10px] text-text-dim/60 leading-relaxed">
                        ⚠️ {result.metadata.disclaimer}
                      </p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* History */}
        {history.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-text-dim uppercase tracking-widest flex items-center gap-2">
                <Clock className="size-3.5" />
                Lịch sử tra cứu gần đây
              </p>
              <button
                onClick={clearHistory}
                className="text-[10px] font-black text-text-dim hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-1"
              >
                <X className="size-3" />
                Xóa tất cả
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {history.map((item) => (
                <button
                  key={item.taxCode + item.timestamp}
                  onClick={() => handleHistoryClick(item)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card-dark border border-border-dark hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-white truncate group-hover:text-primary transition-colors">
                      {item.taxCode}
                    </p>
                    <p className="text-[10px] text-text-dim truncate">{item.name}</p>
                  </div>
                  <RefreshCw className="size-3.5 text-text-dim group-hover:text-primary shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!result && !error && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-16 space-y-4"
          >
            <div className="size-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shadow-2xl shadow-primary/5">
              <Search className="size-10 text-primary/60" />
            </div>
            <div>
              <p className="text-white font-black text-lg tracking-tight">Nhập MST để bắt đầu</p>
              <p className="text-text-dim text-sm mt-1">
                Hỗ trợ tra cứu theo mã số thuế 10 hoặc 13 chữ số
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {['0309892034', '0100109106', '0301521641'].map(sample => (
                <button
                  key={sample}
                  onClick={() => { setTaxCode(sample); handleLookup(sample); }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-primary/10 border border-border-dark hover:border-primary/40 text-xs font-bold text-text-dim hover:text-primary transition-all"
                >
                  {sample}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-text-dim/50">↑ Thử tra cứu với các MST mẫu</p>
          </motion.div>
        )}

      </div>
    </div>
  );
};
