import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  ExternalLink,
  Calendar,
  SkipForward
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../Notifications';
import { Partner } from '../../types/appTypes';
import { supabase } from '../../services/supabaseClient';

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

interface TaxLookupLogRecord {
  id: string;
  tax_code: string;
  partner_id: string | null;
  partner_name: string | null;
  business_name: string | null;
  address: string | null;
  status: string | null;
  source: string | null;
  looked_up_at: string;
}

// Modal hiển thị MST đã tra cứu rồi (xác nhận tra lại)
interface AlreadyLookedUpItem {
  partner: Partner;
  lastLog: TaxLookupLogRecord;
  selected: boolean;
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

interface TaxLookupViewProps {
  partners?: Partner[];
  onRefreshPartners?: () => Promise<void>;
}

export const TaxLookupView: React.FC<TaxLookupViewProps> = ({
  partners = [],
  onRefreshPartners
}) => {
  const { toast } = useToast();
  const [taxCode, setTaxCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<{ id: string; time: string; type: 'info' | 'success' | 'warning' | 'error' | 'ocr'; msg: string }[]>([]);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Modal xác nhận tra cứu lại
  const [alreadyLookedUpItems, setAlreadyLookedUpItems] = useState<AlreadyLookedUpItem[]>([]);
  const [showRelookupModal, setShowRelookupModal] = useState(false);
  // Queue chờ xử lý (partners sẽ xử lý sau khi modal xác nhận)
  const pendingBulkPartnersRef = useRef<Partner[]>([]);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  const addLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' | 'ocr' = 'info') => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    setConsoleLogs(prev => [...prev, { id: Math.random().toString(36).slice(2, 7) + Date.now(), time, type, msg }]);
  }, []);

  // Hàm thực thi tra cứu hàng loạt (được gọi sau khi xác nhận modal hoặc không cần modal)
  const executeBulkLookup = async (partnersToProcess: Partner[], totalPartners: number) => {
    setConsoleLogs(prev => [...prev,
      { id: Math.random().toString(36).slice(2, 7) + Date.now(), time: new Date().toLocaleTimeString('vi-VN', { hour12: false }), type: 'info', msg: `--- BẮT ĐẦU XỬ LÝ ${partnersToProcess.length} ĐỐI TÁC CẦN TRA CỨU ---` }
    ]);

    let successCount = 0;

    for (let i = 0; i < partnersToProcess.length; i++) {
      const partner = partnersToProcess[i];
      setBulkProgress({ current: i + 1, total: partnersToProcess.length });

      addLog(`[${i + 1}/${partnersToProcess.length}] Đang xử lý: ${partner.name || 'Chưa có tên'} (MST: ${partner.taxCode})`, 'info');

      let success = false;
      const attempts = 3;

      for (let attempt = 1; attempt <= attempts; attempt++) {
        addLog(`-> [Lần thử ${attempt}/${attempts}] Gửi yêu cầu tra cứu tới API nội bộ...`, 'info');
        try {
          const res = await fetch(`/api/tax-lookup/${partner.taxCode}`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
              const data = json.data;
              addLog(`-> [Thành công] Nhận thông tin: ${data.name}`, 'success');
              if (json.source === 'cache') {
                addLog(`-> [Cache Hit] Tìm thấy dữ liệu hợp lệ trong cache Supabase.`, 'success');
              } else {
                addLog(`-> [Crawler] Crawler đã cào dữ liệu mới từ Tổng cục Thuế thành công.`, 'success');
              }
              addLog(`-> Đang đồng bộ thông tin doanh nghiệp vào cơ sở dữ liệu Supabase...`, 'info');
              const { error } = await supabase
                .from('partners')
                .update({ name: data.name, address_post_merger: data.address, updated_at: new Date().toISOString() })
                .eq('id', partner.id);
              if (!error) {
                successCount++;
                addLog(`-> Supabase: Cập nhật thành công thông tin đối tác!`, 'success');
                success = true;
                break;
              } else {
                addLog(`-> Supabase: Lỗi cập nhật: ${error.message}`, 'error');
              }
            } else {
              addLog(`-> Lỗi: API nội bộ không phản hồi dữ liệu hợp lệ.`, 'warning');
            }
          } else {
            addLog(`-> Lỗi kết nối: HTTP ${res.status}`, 'error');
          }
        } catch (err: any) {
          addLog(`-> Thất bại lần thử ${attempt}: ${err.message || 'Lỗi không rõ'}`, 'error');
        }
        if (!success && attempt < attempts) {
          addLog(`Chờ 2 giây trước khi thử lại lần ${attempt + 1}...`, 'warning');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (!success) {
        addLog(`[FAIL] Tra cứu thất bại sau 3 lần thử đối với MST: ${partner.taxCode}`, 'error');
      }

      if (i < partnersToProcess.length - 1) {
        addLog(`Tạm nghỉ 5 giây (5000ms) để giãn cách tần suất truy cập website GDT...`, 'ocr');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    setIsBulkLoading(false);
    setBulkProgress(null);
    addLog(`--- HOÀN TẤT TRA CỨU HÀNG LOẠT: Thành công ${successCount}/${partnersToProcess.length} đối tác ---`, 'success');

    if (onRefreshPartners) await onRefreshPartners();
    toast(`Đã tra cứu xong (${successCount}/${partnersToProcess.length}) đối tác`, 'success');
  };

  // Hàm bắt đầu tra cứu hàng loạt - kiểm tra lịch sử trước
  const handleBulkLookup = async () => {
    const validPartners = partners.filter(p => p.taxCode && p.taxCode.replace(/[^0-9\-]/g, '').length >= 9);

    if (validPartners.length === 0) {
      toast('Không có đối tác nào có mã số thuế hợp lệ để tra cứu', 'info');
      return;
    }

    setConsoleLogs([]);
    addLog('--- BẮT ĐẦU TIẾN TRÌNH TRA CỨU HÀNG LOẠT ---', 'info');
    addLog(`Phát hiện ${validPartners.length} đối tác có mã số thuế hợp lệ.`, 'info');
    addLog('Đang kiểm tra lịch sử tra cứu trong Supabase database...', 'ocr');

    // Lấy danh sách MST cần kiểm tra
    const taxCodes = validPartners.map(p => p.taxCode!.replace(/[^0-9\-]/g, ''));

    // Truy vấn lịch sử tra cứu từ tax_lookup_log
    const { data: logRecords, error: logErr } = await supabase
      .from('tax_lookup_log')
      .select('*')
      .in('tax_code', taxCodes)
      .order('looked_up_at', { ascending: false });

    if (logErr) {
      addLog(`Cảnh báo: Không thể đọc lịch sử tra cứu từ database: ${logErr.message}`, 'warning');
    }

    // Lấy lần tra cứu mới nhất cho mỗi MST
    const latestLogByTaxCode = new Map<string, TaxLookupLogRecord>();
    if (logRecords) {
      for (const record of logRecords) {
        if (!latestLogByTaxCode.has(record.tax_code)) {
          latestLogByTaxCode.set(record.tax_code, record as TaxLookupLogRecord);
        }
      }
    }

    const alreadyDone: AlreadyLookedUpItem[] = [];
    const newPartners: Partner[] = [];

    for (const partner of validPartners) {
      const cleanCode = partner.taxCode!.replace(/[^0-9\-]/g, '');
      const lastLog = latestLogByTaxCode.get(cleanCode);
      if (lastLog) {
        const lookedUpAt = new Date(lastLog.looked_up_at);
        addLog(`[Phát hiện] MST ${cleanCode} (${partner.name}) đã được tra cứu vào lúc ${lookedUpAt.toLocaleString('vi-VN')}.`, 'warning');
        alreadyDone.push({ partner, lastLog, selected: false });
      } else {
        addLog(`[Mới] MST ${cleanCode} (${partner.name}) chưa có lịch sử tra cứu.`, 'info');
        newPartners.push(partner);
      }
    }

    addLog(`Kết quả kiểm tra: ${newPartners.length} mã chưa tra, ${alreadyDone.length} mã đã tra trước đó.`, 'info');

    if (alreadyDone.length > 0) {
      // Hiển thị modal xác nhận
      addLog(`Đang hiển thị bảng xác nhận tra cứu lại cho ${alreadyDone.length} mã số thuế đã tra...`, 'warning');
      pendingBulkPartnersRef.current = newPartners;
      setAlreadyLookedUpItems(alreadyDone);
      setShowRelookupModal(true);
      return; // Dừng tại đây, chờ người dùng xác nhận
    }

    // Không có mã nào đã tra -> tiến hành ngay
    if (newPartners.length === 0) {
      addLog('Tất cả mã số thuế đều đã được tra cứu trước đó. Không có mã mới để xử lý.', 'warning');
      return;
    }

    setIsBulkLoading(true);
    setBulkProgress({ current: 0, total: newPartners.length });
    await executeBulkLookup(newPartners, validPartners.length);
  };

  // Hàm xử lý sau khi người dùng xác nhận modal
  const handleRelookupConfirm = async () => {
    setShowRelookupModal(false);
    const selectedToRelookup = alreadyLookedUpItems.filter(item => item.selected).map(item => item.partner);
    const allToProcess = [...pendingBulkPartnersRef.current, ...selectedToRelookup];

    if (selectedToRelookup.length > 0) {
      addLog(`Người dùng chọn tra cứu lại ${selectedToRelookup.length} mã số thuế đã tra trước đó.`, 'info');
    }
    if (pendingBulkPartnersRef.current.length > 0) {
      addLog(`Sẽ tra cứu ${pendingBulkPartnersRef.current.length} mã số thuế mới.`, 'info');
    }

    if (allToProcess.length === 0) {
      addLog('Không có mã số thuế nào được chọn để xử lý. Kết thúc tiến trình.', 'warning');
      return;
    }

    setIsBulkLoading(true);
    setBulkProgress({ current: 0, total: allToProcess.length });
    await executeBulkLookup(allToProcess, allToProcess.length);
  };
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

  const handleLookup = useCallback(async (code?: string, forceRefresh = false) => {
    const query = (code ?? taxCode).trim().replace(/[^0-9\-]/g, '');
    if (!query) {
      setError('Vui lòng nhập mã số thuế hợp lệ.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setConsoleLogs([]); // Reset logs when starting a lookup

    addLog(`Bắt đầu tiến trình tra cứu mã số thuế: ${query}`, 'info');
    if (forceRefresh) {
      addLog('Đang yêu cầu làm mới dữ liệu (ép buộc cào mới từ Tổng cục Thuế)...', 'ocr');
    }

    try {
      addLog(`-> Gửi yêu cầu tới endpoint nội bộ: /api/tax-lookup/${query}`, 'info');
      const res = await fetch(`/api/tax-lookup/${query}${forceRefresh ? '?refresh=true' : ''}`, {
        headers: { Accept: 'application/json' }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Lỗi kết nối: HTTP ${res.status}`);
      }

      const json = await res.json();
      
      let mappedJson: TaxApiResponse;
      if (json && json.success && json.data) {
        const item = json.data;
        addLog(`-> Tra cứu thành công! Nhận thông tin cho: ${item.name}`, 'success');
        
        if (json.source === 'cache') {
          addLog(`-> [Cache Hit] Tìm thấy dữ liệu hợp lệ trong cache Supabase.`, 'success');
        } else {
          addLog(`-> [Crawler] Crawler đã cào dữ liệu mới từ Tổng cục Thuế thành công.`, 'success');
        }

        mappedJson = {
          code: '00',
          desc: 'Thành công',
          data: {
            id: item.taxCode || query,
            name: item.name || '',
            internationalName: null,
            shortName: item.taxDepartment || null,
            address: item.address || '',
            status: item.status || 'Đang hoạt động'
          },
          metadata: {
            disclaimer: json.warning || 'Thông tin tra cứu trực tiếp từ Tổng cục Thuế.',
            source: 'Tổng cục Thuế',
            updatedAt: new Date().toISOString(),
            contact: 'Nội bộ'
          }
        };
      } else {
        addLog(`-> Không tìm thấy dữ liệu cho mã số thuế: ${query}`, 'warning');
        mappedJson = {
          code: '01',
          desc: 'Không tìm thấy thông tin doanh nghiệp.',
          data: null
        };
      }

      setResult(mappedJson);

      if (mappedJson.code === '00' && mappedJson.data) {
        saveToHistory(query, mappedJson.data.name);
      } else {
        setError('Không tìm thấy thông tin doanh nghiệp với mã số thuế này.');
      }
    } catch (err: any) {
      addLog(`-> Thất bại: ${err.message}`, 'error');
      setError(err.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      addLog('--- KẾT THÚC TIẾN TRÌNH TRA CỨU ---', 'info');
    }
  }, [taxCode, saveToHistory, addLog]);

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
            Nhập mã số thuế để tra cứu thông tin doanh nghiệp qua hệ thống Tổng cục Thuế Việt Nam (xinvoice.vn).
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
              disabled={loading || isBulkLoading || !taxCode.trim()}
              className="px-6 py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 shrink-0"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Search className="size-5" />
              )}
              <span className="hidden sm:inline">{loading ? 'Đang tra...' : 'Tra cứu'}</span>
            </button>

            {partners && partners.length > 0 && (
              <button
                type="button"
                onClick={handleBulkLookup}
                disabled={loading || isBulkLoading}
                className="px-6 py-4 bg-white/5 border border-border-dark hover:bg-white/10 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2 shrink-0"
              >
                <RefreshCw className={cn("size-5", isBulkLoading && "animate-spin")} />
                <span>{isBulkLoading ? `${bulkProgress?.current}/${bulkProgress?.total}` : 'Tra cứu hàng loạt'}</span>
              </button>
            )}
          </div>

          {/* Quick tips */}
          <p className="mt-3 text-[10px] text-text-dim font-medium px-1">
            💡 Mã số thuế thường có 10 hoặc 13 chữ số. Nhấn Enter để tra cứu nhanh.
          </p>
        </motion.div>

        {/* Progress Alert for Bulk Lookup */}
        {isBulkLoading && (
          <div className="p-5 rounded-3xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-between shadow-2xl shadow-primary/5 select-none relative overflow-hidden">
            <div className="absolute top-0 right-0 size-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="size-10 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/5">
                <RefreshCw className="size-5 text-primary animate-spin" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-wider">Đang tra cứu mã số thuế hàng loạt...</p>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">
                  Đang xử lý đối tác {bulkProgress?.current} trên tổng số {bulkProgress?.total}
                </p>
              </div>
            </div>
            <div className="text-xl font-black relative z-10">
              {Math.round((bulkProgress?.current || 0) / (bulkProgress?.total || 1) * 100)}%
            </div>
          </div>
        )}

        {/* Terminal Console Panel */}
        <AnimatePresence>
          {consoleLogs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-[#0b0b0d] rounded-3xl border border-white/5 shadow-2xl p-1 relative overflow-hidden"
            >
              {/* Outer bezel shine */}
              <div className="absolute inset-0 border border-white/10 rounded-3xl pointer-events-none z-10" />
              
              {/* Terminal Header */}
              <div className="flex items-center justify-between px-5 py-3 bg-white/3 border-b border-white/5 rounded-t-[calc(1.5rem-0.125rem)] select-none">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5 shrink-0">
                    <span className="size-3 rounded-full bg-red-500/80 border border-red-600/30" />
                    <span className="size-3 rounded-full bg-yellow-500/80 border border-yellow-600/30" />
                    <span className="size-3 rounded-full bg-green-500/80 border border-green-600/30" />
                  </div>
                  <span className="ml-3 font-mono text-xs font-bold text-text-dim/80">tax_lookup_agent.sh</span>
                  {isBulkLoading && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] font-black bg-primary/20 text-primary border border-primary/30 animate-pulse uppercase tracking-wider">
                      RUNNING
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setConsoleLogs([])}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-black text-text-dim hover:text-white uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer"
                >
                  Xóa Log
                </button>
              </div>

              {/* Terminal Logs Body */}
              <div 
                ref={logsContainerRef}
                className="p-5 font-mono text-[13px] leading-relaxed max-h-96 overflow-y-auto custom-scrollbar space-y-1.5 bg-[#050507]"
              >
                {consoleLogs.map((log) => {
                  let colorClass = 'text-stone-200';
                  let marker = '[INFO]';
                  if (log.type === 'success') {
                    colorClass = 'text-emerald-400 font-bold';
                    marker = '[ OK ]';
                  } else if (log.type === 'error') {
                    colorClass = 'text-red-400 font-black';
                    marker = '[FAIL]';
                  } else if (log.type === 'warning') {
                    colorClass = 'text-amber-400 font-bold';
                    marker = '[WARN]';
                  } else if (log.type === 'ocr') {
                    colorClass = 'text-cyan-400 font-bold';
                    marker = '[CRAWL]';
                  }

                  return (
                    <div key={log.id} className={cn("flex items-start gap-2.5 py-0.5 px-1.5 rounded-lg hover:bg-white/3 transition-colors duration-75", colorClass)}>
                      <span className="text-[11px] text-stone-500 select-none shrink-0 font-light">[{log.time}]</span>
                      <span className="font-semibold select-none shrink-0">{marker}</span>
                      <span className="break-all whitespace-pre-wrap">{log.msg}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                              <button
                                onClick={() => handleLookup(result.data.id, true)}
                                disabled={loading}
                                className="px-2 py-1 bg-primary/10 border border-primary/25 hover:bg-primary/20 text-primary rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50 cursor-pointer"
                                title="Cập nhật lại thông tin mới nhất từ Tổng cục Thuế"
                              >
                                <RefreshCw className={cn("size-3", loading && "animate-spin")} />
                                Làm mới dữ liệu
                              </button>
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
      {/* === Modal xác nhận tra cứu lại MST đã tra === */}
      <AnimatePresence>
        {showRelookupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowRelookupModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-xl bg-[#0e0e10] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                    <Calendar className="size-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-black text-white text-sm">Phát hiện Mã Số Thuế đã tra cứu</p>
                    <p className="text-[10px] text-text-dim font-medium mt-0.5">
                      Chọn các mã bạn muốn tra cứu lại (hoặc bỏ qua tất cả)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRelookupModal(false)}
                  className="size-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-dim hover:text-white transition-all"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Mô tả */}
              <div className="px-6 pt-4 pb-2">
                <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-2.5">
                  <AlertCircle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    {alreadyLookedUpItems.length} mã số thuế dưới đây đã được tra cứu trước đó.
                    Chọn để tra cứu lại hoặc bỏ qua. {pendingBulkPartnersRef.current.length > 0 && `(${pendingBulkPartnersRef.current.length} mã mới sẽ được tra cứu dù chọn gì.)`}
                  </p>
                </div>
              </div>

              {/* Danh sách chọn */}
              <div className="px-6 py-3 max-h-72 overflow-y-auto custom-scrollbar space-y-2">
                {/* Checkbox chọn tất cả */}
                <label className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/4 cursor-pointer group select-none border border-white/5 bg-white/2">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary rounded"
                    checked={alreadyLookedUpItems.every(i => i.selected)}
                    onChange={(e) => {
                      setAlreadyLookedUpItems(prev => prev.map(item => ({ ...item, selected: e.target.checked })));
                    }}
                  />
                  <span className="text-xs font-black text-text-dim uppercase tracking-widest group-hover:text-white transition-colors">
                    Chọn tất cả ({alreadyLookedUpItems.length})
                  </span>
                </label>
                {alreadyLookedUpItems.map((item, idx) => (
                  <label
                    key={item.partner.id}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/4 cursor-pointer group select-none"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary rounded mt-0.5 shrink-0"
                      checked={item.selected}
                      onChange={(e) => {
                        setAlreadyLookedUpItems(prev => prev.map((it, i) => i === idx ? { ...it, selected: e.target.checked } : it));
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                        {item.partner.name || item.partner.taxCode}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] font-mono text-text-dim">{item.partner.taxCode}</span>
                        <span className="text-[10px] text-amber-400/80 flex items-center gap-1">
                          <Clock className="size-3" />
                          Đã tra: {new Date(item.lastLog.looked_up_at).toLocaleString('vi-VN')}
                        </span>
                        {item.lastLog.source && (
                          <span className={cn(
                            'text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider',
                            item.lastLog.source === 'cache' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-cyan-500/15 text-cyan-400'
                          )}>
                            {item.lastLog.source}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Footer buttons */}
              <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between gap-3">
                <p className="text-[10px] text-text-dim">
                  {alreadyLookedUpItems.filter(i => i.selected).length} mã được chọn để tra lại
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowRelookupModal(false);
                      handleRelookupConfirm(); // Chạy với 0 mã tra lại, chỉ tra mới
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-black text-text-dim hover:text-white uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <SkipForward className="size-3.5" />
                    Bỏ qua tất cả
                  </button>
                  <button
                    onClick={handleRelookupConfirm}
                    className="px-5 py-2 bg-primary hover:bg-primary/90 text-xs font-black text-white uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-primary/20"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Xác nhận để bắt đầu tra cứu
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
