import React from 'react';
import { FileText, FileCode, Trash2 } from 'lucide-react';
import { InvoiceItem as InvoiceItemType } from '../../types/invoiceData';
import { InvoiceResponsiveCard } from './InvoiceResponsiveCard';
import { formatDate } from '../../lib/formatter';

interface Props {
  invoice: InvoiceItemType;
  onDelete: (id: string) => void;
  displayName?: string;
  onGenerateDoc?: (invoice: InvoiceItemType) => void;
  onUpdate?: (data: any) => Promise<void> | void;
  placement?: 'left' | 'right' | 'top' | 'bottom';
}

export const InvoiceItemComp: React.FC<Props> = ({ invoice, onDelete, displayName, onGenerateDoc, onUpdate, placement }) => {
  return (
    <InvoiceResponsiveCard invoice={invoice} onGenerateDoc={onGenerateDoc} placement={placement}>
      <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-border-dark group">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${invoice.type === 'PDF' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
            {invoice.type === 'PDF' ? <FileText size={20} /> : <FileCode size={20} />}
          </div>
          <div>
            <p className="text-sm font-medium text-white truncate max-w-[200px]">{displayName || invoice.invoiceNumber}</p>
            <p className="text-xs text-text-dim">{formatDate(invoice.date)} • {invoice.companyName}</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
           <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase border ${
          invoice.classification === 'BB_TC' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
          invoice.classification === 'BB_CM' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
          'bg-green-500/10 text-green-400 border-green-500/20'
        }`}>
          {invoice.classification === 'BB_TC' ? 'Thi công' : 
           invoice.classification === 'BB_CM' ? 'Ca máy' : 
           invoice.classification === 'BB_VT' ? 'Vật tư' : 
           (invoice.classification || 'Vật tư')}
        </span>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(invoice.id); }}
            className="p-1.5 text-text-dim hover:text-red-400 rounded-md hover:bg-red-500/10"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </InvoiceResponsiveCard>
  );
};
