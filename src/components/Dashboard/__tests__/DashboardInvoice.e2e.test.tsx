// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';

import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DashboardInvoiceList } from '../DashboardInvoiceList';
import { ExtendedInvoiceItem } from '../demoData';

afterEach(() => {
  cleanup();
});

vi.mock('../../../lib/formatter', () => ({
  formatDate: (d: string) => d,
  formatCurrencyVN: (n: number) => `${n} VND`,
}));

vi.mock('../../Invoice/InvoiceDetailTable', () => ({
  InvoiceDetailTable: () => <div data-testid="mock-detail-table">Detail Table</div>,
}));

vi.mock('../../Invoice/InvoiceSummary', () => ({
  InvoiceSummary: () => <div data-testid="mock-summary">Invoice Summary</div>,
}));

const mockInvoices: ExtendedInvoiceItem[] = [
  {
    id: "inv-e2e-1",
    invoiceNumber: "E2E-001",
    invoiceSymbol: "AA/26P",
    companyName: "Công ty E2E A",
    taxCode: "1111111111",
    buyerName: "Công ty E2E B",
    buyerTaxCode: "2222222222",
    address: "E2E Road, Hanoi",
    date: "2026-05-23",
    status: "paid",
    type: "PDF",
    classification: "BB_VT",
    total: 1000000,
    vat: 100000,
    notes: "E2E notes description",
    attachments: [
      { name: "e2e.pdf", url: "#", size: "1.0 MB", type: "pdf" }
    ],
    items: []
  }
];

describe('E2E Interaction Test Suite', () => {
  it('should fall back to Modal on mobile viewports', () => {
    const onDelete = vi.fn();
    
    // Simulate mobile viewport width and trigger resize listener using Object.defineProperty
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 480,
    });
    window.dispatchEvent(new Event('resize'));
    
    render(
      <DashboardInvoiceList 
        invoices={mockInvoices}
        accordionMode={false}
        mobileFallbackThreshold={768}
        onDelete={onDelete}
      />
    );

    const trigger = screen.getAllByRole('button').find(el => el.id.startsWith('row-'))!;
    
    // Clicking the row should trigger a Modal instead of inline expansion
    fireEvent.click(trigger);
    
    // In our mobile view, the modal opens. Check if modal is in DOM.
    // The modal displays "Hóa đơn E2E-001" and has a close action.
    expect(screen.getByText('Hóa đơn E2E-001')).toBeDefined();
    expect(screen.getAllByText('Công ty E2E A').length).toBeGreaterThan(0);
    expect(screen.getByText('E2E notes description')).toBeDefined();

    // Click Close Button
    const closeBtn = screen.getByLabelText('Đóng');
    fireEvent.click(closeBtn);

    // Modal should close and no longer be visible
    expect(screen.queryByText('Hóa đơn E2E-001')).toBeNull();
  });
});
