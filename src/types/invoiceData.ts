export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  invoiceSymbol?: string;
  companyName: string;
  taxCode: string;
  buyerName: string;
  buyerTaxCode?: string;
  address: string;
  date: string;
  status: 'paid' | 'pending' | 'draft';
  type: 'PDF' | 'XML';
  classification?: string;
  total: number;
  vat: number;
  contractNumber?: string;
  contractDate?: string;
  items: Array<{
    id: string;
    description: string;
    unit: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}
