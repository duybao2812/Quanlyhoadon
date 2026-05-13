export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
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
  items: Array<{
    id: string;
    description: string;
    unit: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}
