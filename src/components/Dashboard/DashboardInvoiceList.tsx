import React, { useState, useEffect, useMemo } from 'react';
import { Lightbulb, ChevronUp, ChevronDown } from 'lucide-react';
import { ExtendedInvoiceItem } from './demoData';
import { DashboardInvoiceRow } from './DashboardInvoiceRow';
import { DashboardInvoiceModal } from './DashboardInvoiceModal';
import './DashboardInvoice.css';

type SortField = 'invoiceNumber' | 'date' | 'seller' | 'buyer' | 'category' | 'type' | null;
type SortDirection = 'asc' | 'desc';

interface Props {
  invoices: ExtendedInvoiceItem[];
  accordionMode?: boolean;
  lazyRender?: boolean;
  mobileFallbackThreshold?: number;
  onDelete: (id: string) => void;
  onGenerateDoc?: (invoice: ExtendedInvoiceItem) => void;
  onUpdate?: (id: string, data: any) => void;
  onExtractDraft?: (id: string) => Promise<void>;
  placement?: 'left' | 'right';
}

export const DashboardInvoiceList: React.FC<Props> = ({
  invoices,
  accordionMode = false,
  lazyRender = true,
  mobileFallbackThreshold = 768,
  onDelete,
  onGenerateDoc,
  onUpdate,
  onExtractDraft,
  placement
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<ExtendedInvoiceItem | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Responsive design check
  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < mobileFallbackThreshold);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, [mobileFallbackThreshold]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, start with ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort invoices (default: sort by date descending when first loaded)
  const sortedInvoices = useMemo(() => {
    const sorted = [...invoices].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'invoiceNumber':
          const numA = a.invoiceNumber || '';
          const numB = b.invoiceNumber || '';
          comparison = numA.localeCompare(numB, 'vi', { numeric: true });
          break;
        case 'date':
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          comparison = dateA - dateB;
          break;
        case 'seller':
          comparison = (a.companyName || '').localeCompare(b.companyName || '', 'vi');
          break;
        case 'buyer':
          comparison = (a.buyerName || '').localeCompare(b.buyerName || '', 'vi');
          break;
        case 'category':
          comparison = (a.classification || '').localeCompare(b.classification || '', 'vi');
          break;
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '', 'vi');
          break;
        default:
          // Default sort: by date descending
          const dA = new Date(a.date || 0).getTime();
          const dB = new Date(b.date || 0).getTime();
          comparison = dA - dB;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [invoices, sortField, sortDirection]);

  // Handle toggling of a row
  const handleToggle = (invoice: ExtendedInvoiceItem) => {
    if (isMobile) {
      // Mobile fallback: open full screen details modal
      setSelectedInvoiceForModal(invoice);
      return;
    }

    const id = invoice.id;
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (accordionMode) {
          next.clear(); // Only allow one open at a time under accordion mode
        }
        next.add(id);
      }
      return next;
    });
  };

  const showVirtualizationRecommendation = sortedInvoices.length > 200;

  // Sortable Header Component
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 hover:text-white transition-colors ${
        sortField === field ? 'text-white' : 'text-text-dim'
      }`}
    >
      {children}
      {sortField === field ? (
        sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      ) : (
        <span className="opacity-30"><ChevronUp size={12} /></span>
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* 1. Virtualization Recommendation Banner */}
      {showVirtualizationRecommendation && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-3 shadow-md">
          <Lightbulb className="size-5 text-primary shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h5 className="text-xs font-black uppercase text-white tracking-wider">Khuyến nghị ảo hóa (Virtualization)</h5>
            <p className="text-[11px] text-text-dim mt-1 leading-normal">
              Danh sách hiện có <strong>{invoices.length}</strong> hóa đơn. Để tối ưu hóa tốc độ và giảm thiểu độ trễ khi cuộn trang, hệ thống khuyến cáo áp dụng kỹ thuật <strong>ảo hóa danh sách</strong> (ví dụ: sử dụng <code>react-window</code> hoặc <code>react-virtualized</code>).
            </p>
          </div>
        </div>
      )}

      {/* 2. Unified Header for Desktop Grid */}
      {!isMobile && sortedInvoices.length > 0 && (
        <div className="invoice-table-header invoice-row-grid rounded-2xl border border-border-dark select-none py-3 px-6 text-[10px]">
          <div>STT</div>
          <div><SortableHeader field="invoiceNumber">SỐ HÓA ĐƠN</SortableHeader></div>
          <div className="invoice-col-date-header text-center"><SortableHeader field="date">NGÀY XUẤT</SortableHeader></div>
          <div><SortableHeader field="seller">BÊN BÁN</SortableHeader></div>
          <div className="invoice-col-buyer-header"><SortableHeader field="buyer">BÊN MUA</SortableHeader></div>
          <div className="invoice-col-contract-header">SỐ HỢP ĐỒNG</div>
          <div className="invoice-col-contract-date-header">NGÀY KÝ HĐ</div>
          <div>TỔNG GIÁ TRỊ</div>
          <div><SortableHeader field="category">TRẠNG THÁI</SortableHeader></div>
          <div><SortableHeader field="type">NGUỒN</SortableHeader></div>
          <div className="text-right"></div>
        </div>
      )}

      {/* 3. List of Unified Rows */}
      <div className="space-y-3">
        {sortedInvoices.map((inv, index) => {
          const displayInvoiceNumber = inv.invoiceNumber || '---';
          const displaySymbol = inv.invoiceSymbol || '';
          const localRank = index + 1;
          const displayFullNumber = displaySymbol ? `${displaySymbol}-${displayInvoiceNumber}` : displayInvoiceNumber;
          const displayName = `${localRank}. Hóa đơn số: ${displayFullNumber}`;

          return (
            <DashboardInvoiceRow 
              key={inv.id}
              index={index}
              invoice={inv}
              isOpen={expandedIds.has(inv.id)}
              onToggle={() => handleToggle(inv)}
              onDelete={onDelete}
              onGenerateDoc={onGenerateDoc}
              onUpdate={onUpdate}
              onExtractDraft={onExtractDraft}
              displayName={displayName}
              lazyRender={lazyRender}
            />
          );
        })}
      </div>

      {/* 4. Mobile Responsive Fallback Modal */}
      {selectedInvoiceForModal && (
        <DashboardInvoiceModal 
          invoice={selectedInvoiceForModal}
          isOpen={!!selectedInvoiceForModal}
          onClose={() => setSelectedInvoiceForModal(null)}
          onGenerateDoc={onGenerateDoc}
        />
      )}
    </div>
  );
};
