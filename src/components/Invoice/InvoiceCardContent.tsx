import React from 'react';
import { InvoiceItem } from '../../types/invoiceData';
import { InvoiceDetailTable } from './InvoiceDetailTable';
import { InvoiceSummary } from './InvoiceSummary';
import { formatDate } from '../../lib/formatter';
import { Building2, FileText, User } from 'lucide-react';

interface Props {
  invoice: InvoiceItem;
  onGenerateDoc?: (invoice: InvoiceItem) => void;
}

export const InvoiceCardContent: React.FC<Props> = ({ invoice, onGenerateDoc }) => {
  const getPartyNames = () => {
    switch(invoice.classification) {
      case 'BB_TC': return { seller: 'Bên nhận thầu:', buyer: 'Bên giao thầu:' };
      case 'BB_CM': return { seller: 'Bên cho thuê:', buyer: 'Bên thuê:' };
      case 'BB_VT':
      default:
        return { seller: 'Bên bán:', buyer: 'Bên mua:' };
    }
  };

  const getClassificationName = () => {
    switch(invoice.classification) {
      case 'BB_TC': return 'Thi công';
      case 'BB_CM': return 'Ca máy';
      case 'BB_VT': return 'Vật tư';
      default: return invoice.classification || 'Vật tư';
    }
  };

  const labels = getPartyNames();

  return (
    <div className="p-5 w-[550px] space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Hóa đơn {invoice.invoiceNumber}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-stone-400">Ngày lập: {formatDate(invoice.date)}</p>
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-primary/15 text-primary border border-primary/30">
              Phân loại: {getClassificationName()}
            </span>
          </div>
        </div>
        {onGenerateDoc && (
          <button 
            onClick={() => onGenerateDoc(invoice)}
            className="px-3 py-1 bg-primary text-white text-xs font-medium rounded-full hover:bg-primary-hover transition-colors"
          >
            Tạo biên bản
          </button>
        )}
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-4 text-sm bg-white/5 p-3 rounded-lg border border-white/5">
        <div className="space-y-1">
          <p className="text-stone-500 font-medium uppercase text-[10px] tracking-wider">{labels.seller}</p>
          <p className="font-semibold text-white">{invoice.companyName}</p>
          <p className="text-stone-400">MST: {invoice.taxCode}</p>
        </div>
        <div className="space-y-1">
          <p className="text-stone-500 font-medium uppercase text-[10px] tracking-wider">{labels.buyer}</p>
          <p className="font-semibold text-white">{invoice.buyerName}</p>
          <p className="text-stone-400">MST: {invoice.buyerTaxCode}</p>
        </div>
      </div>

      {/* Table & Summary */}
      <InvoiceDetailTable items={invoice.items} />
      <InvoiceSummary total={invoice.total} vat={invoice.vat} />
    </div>
  );
};
