import type { User } from 'firebase/auth';

export type Tab = 'dashboard' | 'upload' | 'partners' | 'docs' | 'contract' | 'contract_upload' | 'system' | 'agent-hub' | 'dossier' | 'tax-lookup' | 'transactions' | 'quick-contract' | 'quotation';

export interface Partner {
  id: string;
  name: string;
  taxCode: string;
  address: string;
  addressPostMerger?: string;
  accountNumber?: string;
  bankName?: string;
  representative?: string;
  position?: string;
  gender?: string;
}

export interface Invoice {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'xml';
  fileURL?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  contractNumber?: string;
  contractDate?: string;
  sellerName?: string;
  buyerName?: string;
  sellerTaxCode?: string;
  buyerTaxCode?: string;
  type?: string;
  category?: string | null;
  note?: string | null;
  isAdjustment?: boolean;
  totalAmount?: number | string;
  extractedData?: any;
  lineItems?: any[];
  createdAt: any;
}

export interface GeneratedDoc {
  id: string;
  invoiceId: string;
  templateType: string;
  fileName: string;
  downloadUrl?: string;
  createdAt: any;
}

export interface SmartContract {
  id: string;
  templateId: string;
  partyAId: string;
  partyBId: string;
  formData: any;
  fileName: string;
  ownerId: string;
  createdAt: any;
  updatedAt?: any;
  contractType?: 'ocr_pdf' | 'word_docx';
  documentType?: 'incoming' | 'outgoing' | 'contract';
}
