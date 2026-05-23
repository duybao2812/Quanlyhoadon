import React from 'react';
import { formatCurrencyVN } from '../../lib/formatter';

interface Props {
  total: number;
  vat: number;
  vatRate?: number;
}

export const InvoiceSummary: React.FC<Props> = ({ total, vat, vatRate }) => {
  const subtotal = total - vat;
  const displayVatRate = vatRate !== undefined ? vatRate : (subtotal > 0 ? Math.round((vat / subtotal) * 100) : 10);

  return (
    <div className="space-y-1 text-sm border-t border-white/10 pt-3">
      <div className="flex justify-between text-stone-400">
        <span>Tạm tính:</span>
        <span>{formatCurrencyVN(subtotal)}</span>
      </div>
      <div className="flex justify-between text-stone-400">
        <span>VAT ({displayVatRate}%):</span>
        <span>{formatCurrencyVN(vat)}</span>
      </div>
      <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-white/10 mt-2">
        <span>Tổng cộng:</span>
        <span className="text-primary">{formatCurrencyVN(total)}</span>
      </div>
    </div>
  );
};
