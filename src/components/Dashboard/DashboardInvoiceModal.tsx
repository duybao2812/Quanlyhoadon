import React, { useEffect } from 'react';
import { X, FileText, Calendar, Paperclip, Download, Info } from 'lucide-react';
import { ExtendedInvoiceItem } from './demoData';
import { InvoiceDetailTable } from '../Invoice/InvoiceDetailTable';
import { InvoiceSummary } from '../Invoice/InvoiceSummary';
import { formatVietnameseDate } from './DashboardInvoiceRow';

interface Props {
  invoice: ExtendedInvoiceItem;
  isOpen: boolean;
  onClose: () => void;
  onGenerateDoc?: (invoice: ExtendedInvoiceItem) => void;
}

export const DashboardInvoiceModal: React.FC<Props> = ({ invoice, isOpen, onClose, onGenerateDoc }) => {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getPartyNames = () => {
    switch (invoice.classification) {
      case 'BB_TC': return { seller: 'Bên nhận thầu:', buyer: 'Bên giao thầu:' };
      case 'BB_CM': return { seller: 'Bên cho thuê:', buyer: 'Bên thuê:' };
      case 'BB_VT':
      default:
        return { seller: 'Bên bán:', buyer: 'Bên mua:' };
    }
  };

  const getClassificationName = () => {
    switch (invoice.classification) {
      case 'BB_TC': return 'Thi công';
      case 'BB_CM': return 'Ca máy';
      case 'BB_VT': return 'Vật tư';
      default: return invoice.classification || 'Vật tư';
    }
  };

  const labels = getPartyNames();

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Background click handler */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full sm:max-w-2xl bg-card-dark border-t sm:border border-border-dark rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] z-10 animate-slide-up">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-border-dark flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${invoice.type === 'PDF' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
              <FileText size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">Hóa đơn {invoice.invoiceNumber}</h3>
              <p className="text-[11px] text-text-dim font-bold uppercase tracking-wider mt-0.5">{getClassificationName()}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-dim hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="space-y-1">
              <span className="text-[10px] text-text-dim font-black uppercase tracking-wider">{labels.seller}</span>
              <p className="font-bold text-white leading-snug">{invoice.companyName}</p>
              <p className="text-text-dim">MST: {invoice.taxCode}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-text-dim font-black uppercase tracking-wider">{labels.buyer}</span>
              <p className="font-bold text-white leading-snug">{invoice.buyerName}</p>
              {invoice.buyerTaxCode && <p className="text-text-dim">MST: {invoice.buyerTaxCode}</p>}
            </div>
          </div>

          {/* Quick Date and Contract Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/[0.02] border border-border-dark p-3.5 rounded-xl flex flex-col justify-center">
              <span className="text-[9px] font-black text-text-dim uppercase tracking-wider mb-1">Ngày lập</span>
              <span className="text-white font-bold">{formatVietnameseDate(invoice.date)}</span>
            </div>
            {invoice.contractNumber && (
              <div className="bg-white/[0.02] border border-border-dark p-3.5 rounded-xl flex flex-col justify-center">
                <span className="text-[9px] font-black text-text-dim uppercase tracking-wider mb-1">Số Hợp đồng</span>
                <span className="text-white font-bold">{invoice.contractNumber}</span>
              </div>
            )}
            {invoice.contractDate && (
              <div className="bg-white/[0.02] border border-border-dark p-3.5 rounded-xl flex flex-col justify-center">
                <span className="text-[9px] font-black text-text-dim uppercase tracking-wider mb-1">Ngày Hợp đồng</span>
                <span className="text-white font-bold">{formatVietnameseDate(invoice.contractDate)}</span>
              </div>
            )}
          </div>

          {/* Itemized Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-text-dim px-1">Danh sách hạng mục</h4>
            <div className="border border-border-dark rounded-2xl overflow-hidden bg-white/[0.01]">
              <InvoiceDetailTable items={invoice.items} />
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-white/[0.02] border border-border-dark p-5 rounded-2xl">
            <InvoiceSummary total={invoice.total} vat={invoice.vat} />
          </div>

          {/* Local Notes Section */}
          {invoice.notes && (
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-text-dim px-1">Ghi chú cục bộ</h4>
              <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl text-xs text-stone-300 leading-relaxed">
                {invoice.notes}
              </div>
            </div>
          )}

          {/* Attachments Section */}
          {invoice.attachments && invoice.attachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-text-dim px-1">Tệp đính kèm ({invoice.attachments.length})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {invoice.attachments.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 bg-white/5 border border-border-dark rounded-xl hover:border-white/20 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <Paperclip className="size-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate pr-2">{file.name}</p>
                        <span className="text-[9px] text-text-dim uppercase tracking-wider">{file.size} • {file.type}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); alert(`Tải xuống mô phỏng: ${file.name}`); }}
                      className="p-2 text-text-dim hover:text-white bg-white/5 rounded-lg"
                      title="Tải về"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-6 border-t border-border-dark bg-white/[0.02] flex items-center justify-end gap-3">
          {onGenerateDoc && (
            <button 
              onClick={() => { onGenerateDoc(invoice); onClose(); }}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              TẠO BIÊN BẢN
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider border border-border-dark active:scale-95 transition-all"
          >
            ĐÓNG LẠI
          </button>
        </div>

      </div>
    </div>
  );
};
