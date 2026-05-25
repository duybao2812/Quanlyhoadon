import React, { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
import { ExtendedInvoiceItem } from './demoData';
import { DashboardInvoiceRow } from './DashboardInvoiceRow';
import { DashboardInvoiceModal } from './DashboardInvoiceModal';
import './DashboardInvoice.css';

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

  // Responsive design check
  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < mobileFallbackThreshold);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, [mobileFallbackThreshold]);

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

  const showVirtualizationRecommendation = invoices.length > 200;

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
      {!isMobile && invoices.length > 0 && (
        <div className="invoice-table-header invoice-row-grid rounded-2xl border border-border-dark select-none py-3 px-6 text-[10px]">
          <div>STT</div>
          <div>Số hóa đơn</div>
          <div className="invoice-col-date-header text-center">Ngày xuất</div>
          <div>Bên Bán</div>
          <div className="invoice-col-buyer-header">Bên Mua</div>
          <div className="invoice-col-contract-header">Số hợp đồng</div>
          <div className="invoice-col-contract-date-header">Ngày ký HĐ</div>
          <div>Tổng giá trị</div>
          <div>Trạng thái</div>
          <div>Nguồn</div>
          <div className="text-right"></div>
        </div>
      )}

      {/* 3. List of Unified Rows */}
      <div className="space-y-3">
        {invoices.map((inv, index) => {
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
