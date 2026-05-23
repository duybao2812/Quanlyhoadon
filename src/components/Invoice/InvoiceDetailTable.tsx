import React from 'react';
import { formatCurrencyVN } from '../../lib/formatter';

interface Props {
  items: Array<{
    description: string;
    unit: string;
    quantity: number;
    price: number;
    total?: number;
  }>;
}

export const InvoiceDetailTable: React.FC<Props> = ({ items }) => {
  const filteredItems = items.filter(item => {
    const total = item.total ?? (item.quantity * item.price);
    const isZero = (item.quantity === 0) && (item.price === 0) && (total === 0);
    const isEmptyUnit = !item.unit || item.unit.trim() === '' || item.unit.trim() === '-' || item.unit.trim() === '.';
    if (isZero && isEmptyUnit) return false;
    return true;
  });

  if (filteredItems.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-[10px] text-stone-500 uppercase bg-white/5 tracking-wider">
          <tr>
            <th className="px-3 py-2">Tên</th>
            <th className="px-3 py-2">ĐVT</th>
            <th className="px-3 py-2">SL</th>
            <th className="px-3 py-2">Giá</th>
            <th className="px-3 py-2">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item, i) => {
            const total = item.total ?? (item.quantity * item.price);
            return (
              <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                <td className="px-3 py-2 font-medium text-white">{item.description}</td>
                <td className="px-3 py-2 text-stone-400">
                  {(item.unit && !item.unit.match(/^[. -]+$/)) ? item.unit : ""}
                </td>
                <td className="px-3 py-2 text-stone-400">
                  {item.quantity !== 0 ? item.quantity : ""}
                </td>
                <td className="px-3 py-2 text-stone-400">
                  {item.price > 0 ? formatCurrencyVN(item.price) : ""}
                </td>
                <td className="px-3 py-2 font-semibold text-emerald-400">
                  {total > 0 ? formatCurrencyVN(total) : "0 đ"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
