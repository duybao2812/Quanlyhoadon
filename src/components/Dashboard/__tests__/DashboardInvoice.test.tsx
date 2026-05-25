// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { DashboardInvoiceRow } from '../DashboardInvoiceRow';
import { DashboardInvoiceList } from '../DashboardInvoiceList';
import { ExtendedInvoiceItem } from '../demoData';

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });
  window.dispatchEvent(new Event('resize'));
});

afterEach(() => {
  cleanup();
});

// Mock formatting libraries and sub-components to isolate core logic
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

const mockInvoice: ExtendedInvoiceItem = {
  id: "inv-test-1",
  invoiceNumber: "12345",
  invoiceSymbol: "AA/26P",
  companyName: "Công ty Test A",
  taxCode: "0102030405",
  buyerName: "Công ty Test B",
  buyerTaxCode: "0504030201",
  address: "123 Test Street",
  date: "2026-05-23",
  status: "paid",
  type: "PDF",
  classification: "BB_TC",
  total: 1000000,
  vat: 100000,
  notes: "Test notes content",
  attachments: [
    { name: "test.pdf", url: "#", size: "1.2 MB", type: "pdf" }
  ],
  items: []
};

describe('DashboardInvoiceRow Component', () => {
  it('should render the summary row with correct ARIA attributes', () => {
    const onToggle = vi.fn();
    const onDelete = vi.fn();

    render(
      <DashboardInvoiceRow 
        index={0}
        invoice={mockInvoice} 
        isOpen={false} 
        onToggle={onToggle} 
        onDelete={onDelete}
        lazyRender={true}
      />
    );

    const trigger = screen.getAllByRole('button').find(el => el.id.startsWith('row-'))!;
    expect(trigger).toBeDefined();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe('panel-inv-test-1');
    expect(trigger.getAttribute('tabIndex')).toBe('0');
  });

  it('should toggle when clicking the row', () => {
    const onToggle = vi.fn();
    const onDelete = vi.fn();

    render(
      <DashboardInvoiceRow 
        index={0}
        invoice={mockInvoice} 
        isOpen={false} 
        onToggle={onToggle} 
        onDelete={onDelete}
        lazyRender={true}
      />
    );

    const trigger = screen.getAllByRole('button').find(el => el.id.startsWith('row-'))!;
    fireEvent.click(trigger);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('should toggle when pressing Space or Enter keys', () => {
    const onToggle = vi.fn();
    const onDelete = vi.fn();

    render(
      <DashboardInvoiceRow 
        index={0}
        invoice={mockInvoice} 
        isOpen={false} 
        onToggle={onToggle} 
        onDelete={onDelete}
        lazyRender={true}
      />
    );

    const trigger = screen.getAllByRole('button').find(el => el.id.startsWith('row-'))!;
    
    // Press Space
    fireEvent.keyDown(trigger, { key: ' ', code: 'Space' });
    expect(onToggle).toHaveBeenCalledTimes(1);

    // Press Enter
    fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('should lazy-render content only when open is true', () => {
    const onToggle = vi.fn();
    const onDelete = vi.fn();

    const { rerender } = render(
      <DashboardInvoiceRow 
        index={0}
        invoice={mockInvoice} 
        isOpen={false} 
        onToggle={onToggle} 
        onDelete={onDelete}
        lazyRender={true}
      />
    );

    // Should NOT contain the detail contents
    expect(screen.queryByText('MST: 0102030405')).toBeNull();

    // Re-render as open
    rerender(
      <DashboardInvoiceRow 
        index={0}
        invoice={mockInvoice} 
        isOpen={true} 
        onToggle={onToggle} 
        onDelete={onDelete}
        lazyRender={true}
      />
    );

    // Should render detail elements inside DOM
    expect(screen.getByText('MST: 0102030405')).toBeDefined();
    expect(screen.getByText('Test notes content')).toBeDefined();
  });
});

describe('DashboardInvoiceList Component', () => {
  const mockInvoices: ExtendedInvoiceItem[] = [
    { ...mockInvoice, id: "inv-1", invoiceNumber: "1" },
    { ...mockInvoice, id: "inv-2", invoiceNumber: "2" },
  ];

  it('should enforce accordionMode (only one row open at a time)', () => {
    const onDelete = vi.fn();

    render(
      <DashboardInvoiceList 
        invoices={mockInvoices}
        accordionMode={true}
        onDelete={onDelete}
      />
    );

    const triggers = screen.getAllByRole('button').filter(el => el.id.startsWith('row-'));
    
    // Expand row 1
    fireEvent.click(triggers[0]);
    // Expand row 2
    fireEvent.click(triggers[1]);
    
    // Under accordionMode, expandedIds only holds the latest one.
    expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
    expect(triggers[1].getAttribute('aria-expanded')).toBe('true');
  });
});
