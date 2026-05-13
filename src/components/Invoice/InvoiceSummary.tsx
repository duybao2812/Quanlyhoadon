import React from 'react';
import { formatCurrencyVN } from '../../lib/formatter';

interface Props {
  total: number;
  vat: number;
}

export const InvoiceSummary: React.FC<Props> = ({ total, vat }) => {
  const subtotal = total - vat;
  return (
    <div className="space-y-1 text-sm border-t pt-3">
      <div className="flex justify-between text-gray-500">
        <span>Tạm tính:</span>
        <span>{formatCurrencyVN(subtotal)}</span>
      </div>
      <div className="flex justify-between text-gray-500">
        <span>VAT (10%):</span>
        <span>{formatCurrencyVN(vat)}</span>
      </div>
      <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t mt-2">
        <span>Tổng cộng:</span>
        <span className="text-primary">{formatCurrencyVN(total)}</span>
      </div>
    </div>
  );
};
