import React from 'react';
import { InvoiceItem } from '../../types/invoiceData';
import { InvoiceItemComp } from './InvoiceItemComp';

interface Props {
  type: 'PDF' | 'XML';
  invoices: InvoiceItem[];
  onDelete: (id: string) => void;
}

export const InvoiceList: React.FC<Props> = ({ type, invoices, onDelete }) => {
  return (
    <div className="bg-white rounded-2xl border p-4 shadow-sm h-full overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">{type} List</h2>
      <div className="space-y-1">
        {invoices.filter(i => i.type === type).map((invoice) => (
          <InvoiceItemComp key={invoice.id} invoice={invoice} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
};
