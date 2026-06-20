import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Box,
  Package,
  PlusSquare,
  Check,
  Trash2,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, formatVNNumber } from '../../lib/utils';
import { useToast } from '../Notifications';

export interface InvoiceItemProps {
  inv: any;
  onSelectInvoice: (i: any) => void;
  onDeleteInvoice: (id: string) => void;
  displayName?: string;
  displayDate?: string;
}

export const formatDisplayDate = (dateStr: string) => {
  if (!dateStr || dateStr === '---' || dateStr === '') return '---';

  let cleanStr = dateStr.trim().replace(/\./g, '-').replace(/\//g, '-');

  if (cleanStr.toLowerCase().includes('ngày') || cleanStr.toLowerCase().includes('tháng')) {
    const numbers = cleanStr.match(/\d+/g);
    if (numbers && numbers.length >= 3) {
      const d = numbers[0].padStart(2, '0');
      const m = numbers[1].padStart(2, '0');
      const y = numbers[2].length === 2 ? `20${numbers[2]}` : numbers[2];
      return `${d}-${m}-${y}`;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    const [y, m, d] = cleanStr.split('-');
    return `${d}-${m}-${y}`;
  }

  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(cleanStr)) {
    const [d, m, y] = cleanStr.split('-');
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }

  const d = new Date(cleanStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return cleanStr;
};

export const parseInvoiceDate = (dateStr: string) => {
  if (!dateStr) return 0;
  let cleanStr = dateStr.trim().replace(/\./g, '-').replace(/\//g, '-');

  if (cleanStr.toLowerCase().includes('ngày') || cleanStr.toLowerCase().includes('tháng')) {
    const numbers = cleanStr.match(/\d+/g);
    if (numbers && numbers.length >= 3) {
      const d = numbers[0].padStart(2, '0');
      const m = numbers[1].padStart(2, '0');
      const y = numbers[2].length === 2 ? `20${numbers[2]}` : numbers[2];
      cleanStr = `${y}-${m}-${d}`;
    }
  } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(cleanStr)) {
    const [d, m, y] = cleanStr.split('-');
    cleanStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const d = new Date(cleanStr);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

export const getEnrichedInvoice = (inv: any, rankMap: Map<string, number>) => {
  const rank = rankMap.get(inv.id);
  let invoiceNumber = inv.extractedData?.invoice?.number || inv.extractedData?.soHoaDon || '';
  let invoiceSymbol = inv.extractedData?.invoice?.serial || inv.extractedData?.kyHieuHoaDon || '';

  if (!invoiceNumber) {
    const match = inv.fileName?.match(/(\d+)(?=\.(pdf|xml)$)/i);
    if (match && match[1]) {
      invoiceNumber = match[1];
    }
  }
  const displayInvoiceNumber = invoiceNumber ? (invoiceNumber.toString().replace(/^0+/, '') || invoiceNumber.toString()) : '';
  const displaySymbol = invoiceSymbol ? `${invoiceSymbol}-` : '';

  let displayName = inv.fileName || '';
  if (rank && displayInvoiceNumber) {
    displayName = `${rank}. Hóa đơn số: ${displaySymbol}${displayInvoiceNumber}`;
  } else if (displayInvoiceNumber) {
    displayName = `Hóa đơn số: ${displaySymbol}${displayInvoiceNumber}`;
  }

  let extractedContractNumber = inv.contractNumber || '';
  let extractedContractDate = inv.contractDate || '';

  if (!extractedContractNumber || !extractedContractDate) {
    const lineItems = inv.extractedData?.items || [];
    const fullText = lineItems.map((item: any) => item.description || item.name || '').join(' ');

    if (!extractedContractNumber) {
      const numMatch = fullText.match(/(?:Hợp\s*đồng|HĐ)(?:\s*Số)?\s*:?\s*([^\s,;]+)/i);
      if (numMatch && numMatch[1]) {
        extractedContractNumber = numMatch[1].trim();
        if (extractedContractNumber.endsWith('.')) {
          extractedContractNumber = extractedContractNumber.slice(0, -1);
        }
      }
    }

    if (!extractedContractDate) {
      const dateMatch = fullText.match(/ngày\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i);
      if (dateMatch && dateMatch[1]) {
        extractedContractDate = dateMatch[1].trim();
      }
    }
  }

  return {
    ...inv,
    computedRank: rank,
    computedInvoiceNumber: displayInvoiceNumber,
    computedInvoiceSymbol: invoiceSymbol,
    computedDisplayName: displayName,
    contractNumber: extractedContractNumber,
    contractDate: extractedContractDate
  };
};

export const Skeleton = (props: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={cn("animate-pulse bg-white/5 rounded-xl", props.className)} />
);

interface ReviewModalProps {
  data: any;
  onClose: () => void;
  onSave: (updated: any) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  data,
  onClose,
  onSave
}) => {
  const [edited, setEdited] = useState(data);
  const { clearToasts } = useToast();

  useEffect(() => {
    clearToasts();
  }, [clearToasts]);

  const handleChange = (path: string, value: any) => {
    const keys = path.split('.');
    const next = { ...edited };
    let current = next;
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setEdited(next);
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
  };

  useEffect(() => {
    autoResize(document.querySelector('textarea[placeholder*="điều chỉnh"], textarea[placeholder*="Thay thế"]') as HTMLTextAreaElement);
  }, [edited]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-bg-dark/80 backdrop-blur-md p-0 md:p-4">
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 250 }}
        className="bg-card-dark rounded-t-[32px] md:rounded-[32px] border border-border-dark shadow-2xl w-full max-w-5xl h-[91vh] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-4 sm:p-5 md:p-8 pt-[calc(1rem+env(safe-area-inset-top,0px))] md:pt-8 border-b border-border-dark flex justify-between items-center bg-white/5 shrink-0 select-none">
          <div>
            <h2 className="text-lg md:text-2xl font-black text-white tracking-tighter uppercase">Kiểm tra kết quả bóc tách</h2>
            <p className="text-text-dim text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1">Vui lòng rà soát lại thông tin trước khi lưu vào hệ thống</p>
          </div>
          <button onClick={onClose} className="size-8 md:size-12 flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-white rounded-2xl transition-all group">
            <X className="size-4 md:size-6 group-hover:text-red-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-8 space-y-5 sm:space-y-6 md:space-y-10 custom-scrollbar pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] md:pb-8">
          {/* Thông tin hóa đơn */}
          <section className="space-y-8">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-border-dark">
              <div className="flex items-center gap-3 text-primary">
                <FileText className="size-6" />
                <h3 className="text-base font-black uppercase tracking-[0.2em]">Thông tin Hóa đơn</h3>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-end">
                {edited.invoice?.isAdjustment && (
                  <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10 animate-pulse">
                    ĐIỀU CHỈNH
                  </span>
                )}
                <div className="flex items-center gap-3 bg-primary/10 px-6 py-2.5 rounded-2xl border border-primary/20 shadow-lg shadow-primary/5">
                  <Box className="size-4 text-primary" />
                  <span className="text-xs font-black text-primary uppercase tracking-widest">
                    Phân loại: {(() => {
                      const raw = edited.classification;
                      const type = typeof raw === 'object' ? raw.type : (raw || 'BB_VT');
                      switch (type) {
                        case 'BB_VT': return 'Vật tư';
                        case 'BB_CM': return 'Ca máy';
                        case 'BB_TC': return 'Thi công';
                        default: return type;
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* Adjustment Notice Banner */}
            {edited.invoice?.isAdjustment && edited.invoice?.note && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-lg shadow-amber-500/5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 shrink-0">
                    <FileText className="size-5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Ghi chú hóa đơn</p>
                    <p className="text-sm text-amber-200 font-medium leading-relaxed break-words">{edited.invoice.note}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Số Hóa Đơn</label>
                <input
                  type="text"
                  value={edited.invoice?.number || ''}
                  onChange={(e) => handleChange('invoice.number', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Ký hiệu</label>
                <input
                  type="text"
                  value={edited.invoice?.serial || ''}
                  onChange={(e) => handleChange('invoice.serial', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Ngày lập</label>
                <input
                  type="text"
                  value={edited.invoice?.date || ''}
                  onChange={(e) => handleChange('invoice.date', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">% Thuế GTGT</label>
                <div className="relative">
                  <input
                    type="number"
                    value={edited.invoice?.vatRate || 8}
                    onChange={(e) => handleChange('invoice.vatRate', parseFloat(e.target.value))}
                    className="input-field pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-black">%</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={edited.invoice?.note || edited.note || ''}
                  onChange={(e) => {
                    handleChange('invoice.note', e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = (e.target.scrollHeight) + 'px';
                  }}
                  className="input-field min-h-[80px] resize-y"
                  placeholder="VD: Điều chỉnh cho hóa đơn mẫu số..., Thay thế hóa đơn..."
                />
              </div>
            </div>
          </section>

          {/* Người bán & Người mua */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10">
            <section className="space-y-6">
              <div className="flex items-center gap-3 text-indigo-600">
                <LayoutIcon className="size-6" />
                <h3 className="font-black text-base uppercase tracking-widest">Đơn vị bán hàng</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Tên đơn vị</label>
                  <input
                    type="text"
                    value={edited.seller?.name || ''}
                    onChange={(e) => handleChange('seller.name', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Mã số thuế</label>
                  <input
                    type="text"
                    value={edited.seller?.taxCode || ''}
                    onChange={(e) => handleChange('seller.taxCode', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Địa chỉ</label>
                  <input
                    type="text"
                    value={edited.seller?.address || ''}
                    onChange={(e) => handleChange('seller.address', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Số tài khoản</label>
                    <input
                      type="text"
                      value={edited.seller?.accountNumber || ''}
                      onChange={(e) => handleChange('seller.accountNumber', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Ngân hàng</label>
                    <input
                      type="text"
                      value={edited.seller?.bankName || ''}
                      onChange={(e) => handleChange('seller.bankName', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3 text-emerald-500">
                <Users className="size-6" />
                <h3 className="text-base font-black uppercase tracking-[0.2em]">Khách hàng</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Tên đơn vị</label>
                  <input
                    type="text"
                    value={edited.buyer?.name || ''}
                    onChange={(e) => handleChange('buyer.name', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Mã số thuế</label>
                  <input
                    type="text"
                    value={edited.buyer?.taxCode || ''}
                    onChange={(e) => handleChange('buyer.taxCode', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Địa chỉ</label>
                  <input
                    type="text"
                    value={edited.buyer?.address || ''}
                    onChange={(e) => handleChange('buyer.address', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Số tài khoản</label>
                    <input
                      type="text"
                      value={edited.buyer?.accountNumber || ''}
                      onChange={(e) => handleChange('buyer.accountNumber', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Ngân hàng</label>
                    <input
                      type="text"
                      value={edited.buyer?.bankName || ''}
                      onChange={(e) => handleChange('buyer.bankName', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Danh sách hàng hóa */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-primary mb-2">
                <Package className="size-6" />
                <h3 className="font-black text-base uppercase tracking-[0.2em]">Chi tiết hàng hóa / dịch vụ</h3>
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-border-dark">
                <Box className="size-4 text-primary" />
                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">
                  Phân loại: <span className="text-primary ml-1">{(() => {
                    const raw = edited.classification;
                    const type = typeof raw === 'object' ? raw.type : (raw || 'BB_VT');
                    switch (type) {
                      case 'BB_VT': return 'Vật tư';
                      case 'BB_CM': return 'Ca máy';
                      case 'BB_TC': return 'Thi công';
                      default: return type;
                    }
                  })()}</span>
                </span>
              </div>
            </div>
            <div className="border border-border-dark rounded-[24px] overflow-hidden shadow-2xl bg-sidebar-dark">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-base min-w-[800px]">
                  <thead className="bg-white/5 border-b border-border-dark">
                    <tr className="text-text-dim font-black uppercase tracking-[0.15em]">
                      <th className="p-4 text-center w-12 text-[10px]">Stt</th>
                      <th className="p-4 text-left text-[10px]">Nội dung hàng hóa / dịch vụ</th>
                      <th className="p-4 w-24 text-center text-[10px]">ĐVT</th>
                      <th className="p-4 w-24 text-center text-[10px]">SL</th>
                      <th className="p-4 w-32 text-right text-[10px]">Đơn giá</th>
                      <th className="p-4 w-40 text-right text-[10px]">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark">
                    {(edited.items || []).map((item: any, idx: number) => (
                      <tr key={item.id || `item-${idx}-${item.description || ''}`} className="hover:bg-white/5 transition-colors group">
                        <td className="p-4 text-center text-text-dim font-black opacity-40">{idx + 1}</td>
                        <td className="p-4 whitespace-normal break-words text-white leading-relaxed min-w-[250px] font-bold">
                          {item.description || item.name || ''}
                        </td>
                        <td className="p-4 text-center text-text-dim font-bold">{item.unit || '-'}</td>
                        <td className="p-4 text-center text-text-dim font-black italic">
                          {item.quantity && item.quantity !== 0 ? formatVNNumber(item.quantity) : ''}
                        </td>
                        <td className="p-4 text-right text-text-dim font-bold">
                          {item.unitPrice && item.unitPrice !== 0 ? formatVNNumber(item.unitPrice) : ''}
                        </td>
                        <td className="p-4 text-right font-black text-primary bg-primary/5">
                          {formatVNNumber(item.amount || item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </section>
          <section className="space-y-6 pt-8 border-t border-border-dark">
            <div className="flex items-center gap-3 text-primary mb-2">
              <PlusSquare className="size-7" />
              <h3 className="font-black text-lg uppercase tracking-[0.2em]">Tổng cộng quyết toán</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-8 p-5 sm:p-8 bg-sidebar-dark rounded-[32px] border border-border-dark shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 size-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">Tổng cộng tiền hàng</label>
                <div className="text-lg sm:text-2xl font-black text-white">{formatVNNumber(edited.totals?.subtotal)} đ</div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">
                  Tiền thuế GTGT ({edited.invoice?.vatRate !== undefined ? edited.invoice.vatRate : (edited.totals?.subtotal > 0 ? Math.round((Math.abs((edited.totals?.grandTotal || (edited.totals?.subtotal + (edited.totals?.vatAmount || 0))) - edited.totals?.subtotal) / edited.totals?.subtotal) * 100) : 8)}%)
                </label>
                <div className="text-lg sm:text-2xl font-black text-white">{formatVNNumber(edited.totals?.vatAmount)} đ</div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2 px-3 border-l-2 border-primary">Tổng tiền thanh toán</label>
                <div className="text-2xl sm:text-4xl font-black text-primary tracking-tighter drop-shadow-2xl">{formatVNNumber(edited.totals?.grandTotal)} đ</div>
              </div>
            </div>
          </section>
        </div>

        <div className="p-4 sm:p-5 md:p-8 border-t border-border-dark bg-white/5 flex justify-end gap-3 sm:gap-4 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-8">
          <button onClick={onClose} className="btn-secondary px-6 md:px-8 py-3 md:py-4">
            HỦY BỎ
          </button>
          <button
            onClick={() => onSave(edited)}
            className="btn-primary min-w-[160px] md:min-w-[200px] py-3 md:py-4"
          >
            <Check className="size-4" />
            LƯU VÀO HỆ THỐNG
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const InvoiceItem: React.FC<InvoiceItemProps & { ref?: React.Ref<HTMLDivElement> }> = ({ inv, onSelectInvoice, onDeleteInvoice, displayName, displayDate, ref }) => (
  <div
    ref={ref}
    onClick={() => onSelectInvoice(inv)}
    onContextMenu={(e) => {
      e.preventDefault();
      onDeleteInvoice(inv.id);
    }}
    className="flex items-center justify-between p-4 rounded-2xl border border-border-dark bg-card-dark hover:bg-white/5 transition-all cursor-pointer group shadow-lg"
  >
    <div className="flex items-center gap-4">
      <div className={cn(
        "size-12 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110",
        inv.fileType === 'xml' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
      )}>
        <FileText className="size-6" />
      </div>
      <div className="min-w-0">
        <div className="font-black text-sm text-white group-hover:text-primary transition-colors truncate max-w-[150px] md:max-w-none tracking-tight">{displayName || inv.fileName}</div>
        <div className="text-[10px] font-bold text-text-dim uppercase tracking-widest mt-1 opacity-60" suppressHydrationWarning>
          {displayDate ? displayDate : (inv.createdAt?.toDate ? new Date(inv.createdAt?.toDate()).toLocaleString() : '')}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className={cn(
        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
        inv.status === 'completed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
          inv.status === 'processing' ? "bg-primary/10 text-primary border-primary/20 animate-pulse" :
            "bg-white/5 text-text-dim border-border-dark"
      )}>
        {inv.status === 'completed' ? 'Đã xong' :
          inv.status === 'processing' ? 'Xử lý...' :
            inv.status === 'pending' ? 'Chờ' : 'Lỗi'}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onDeleteInvoice(inv.id);
        }}
        className="size-10 text-text-dim hover:text-red-500 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all flex items-center justify-center shrink-0 active:scale-95"
        title="Xóa hóa đơn"
      >
        <Trash2 className="size-5" />
      </button>
    </div>
  </div>
);

// We need a wrapper to avoid naming collision with Tailwind Layout class
import { Layout as LayoutIcon } from 'lucide-react';
