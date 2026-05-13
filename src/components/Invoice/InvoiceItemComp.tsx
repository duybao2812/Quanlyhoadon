import React from 'react';
import { FileText, FileCode, Trash2 } from 'lucide-react';
import { InvoiceItem as InvoiceItemType } from '../../types/invoiceData';
import { InvoiceHoverCard } from './InvoiceHoverCard';
import { formatDate } from '../../lib/formatter';

interface Props {
  invoice: InvoiceItemType;
  onDelete: (id: string) => void;
  displayName?: string;
  onGenerateDoc?: (invoice: InvoiceItemType) => void;
}

export const InvoiceItemComp: React.FC<Props> = ({ invoice, onDelete, displayName, onGenerateDoc }) => {
  return (
    <InvoiceHoverCard invoice={invoice} onGenerateDoc={onGenerateDoc}>
      <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-gray-200">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${invoice.type === 'PDF' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
            {invoice.type === 'PDF' ? <FileText size={20} /> : <FileCode size={20} />}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{displayName || invoice.invoiceNumber}</p>
            <p className="text-xs text-gray-500">{formatDate(invoice.date)} • {invoice.companyName}</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
           <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
          invoice.classification === 'BB_TC' ? 'bg-orange-100 text-orange-700' : 
          invoice.classification === 'BB_CM' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
        }`}>
          {invoice.classification === 'BB_TC' ? 'Thi công' : 
           invoice.classification === 'BB_CM' ? 'Ca máy' : 
           invoice.classification === 'BB_VT' ? 'Vật tư' : 
           (invoice.classification || 'Vật tư')}
        </span>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(invoice.id); }}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </InvoiceHoverCard>
  );
};
