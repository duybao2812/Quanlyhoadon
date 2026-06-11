// Kieu du lieu cho Hop Dong va Van Ban
export interface ContractParty {
  name: string;
  taxCode: string;
  address: string;
  representative: string;
  position: string;
  gender: string;
  accountNumber: string;
  bankName: string;
  phone?: string;
  email?: string;
}

export interface ContractValueDetail {
  type: string;          // Ví dụ: Tạm ứng, Bảo hành, Phạt vi phạm...
  value: number;         // Số tiền
  valueInWords?: string; // Bằng chữ
  description?: string;  // Nội dung điều khoản
}

export interface ContractFormData {
  contractNumber: string;
  contractDate: string;
  effectiveDate: string;
  expiredDate: string;
  value: number;
  valueInWords: string;
  currency: string;
  paymentMethod: string;
  paymentTerm: string;
  advancePercentage: number;
  vatRate: number;
  partyA: ContractParty;
  partyB: ContractParty;
  projectName: string;
  projectAddress: string;
  workDescription: string;
  startDate: string;
  endDate: string;
  warrantyPeriod: string;
  penaltyClause: string;
  terminationClause: string;
  disputeResolution: string;
  otherTerms: string;
  values?: ContractValueDetail[];
}

export interface ContractItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  specifications?: string;
}

export interface Contract {
  id: string;
  templateId: string;
  partyAId?: string;
  partyBId?: string;
  formData: ContractFormData;
  fileName: string;
  fileUrl?: string;
  status: 'draft' | 'pending' | 'active' | 'completed' | 'cancelled';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  items?: ContractItem[];
  attachments?: string[];
}

export interface ExtractedContractData {
  contract: {
    templateId?: string;  // 'HDCM' | 'HDTC' | 'HDNT'
    number: string;
    date: string;
    effectiveDate?: string;
    expiredDate?: string;
  };
  parties: {
    partyA: ContractParty;
    partyB: ContractParty;
  };
  project: {
    name: string;
    address: string;
    value: number;
    valueInWords: string;
  };
  work: {
    description: string;
    startDate: string;
    endDate: string;
    items: ContractItem[];
  };
  payment: {
    method: string;
    term: string;
    advancePercentage: number;
    vatRate: number;
    values?: ContractValueDetail[];
  };
  terms: {
    warranty: string;
    penalty: string;
    termination: string;
    disputeResolution: string;
    other: string;
  };
  markdownContent?: string;  // Toan bo noi dung hop dong dang Markdown
  rawText?: string;
}

// Du lieu mac dinh cho form
export const defaultContractFormData: ContractFormData = {
  contractNumber: '',
  contractDate: '',
  effectiveDate: '',
  expiredDate: '',
  value: 0,
  valueInWords: '',
  currency: 'VND',
  paymentMethod: '',
  paymentTerm: '',
  advancePercentage: 0,
  vatRate: 10,
  partyA: {
    name: '',
    taxCode: '',
    address: '',
    representative: '',
    position: '',
    gender: '',
    accountNumber: '',
    bankName: '',
    phone: '',
    email: ''
  },
  partyB: {
    name: '',
    taxCode: '',
    address: '',
    representative: '',
    position: '',
    gender: '',
    accountNumber: '',
    bankName: '',
    phone: '',
    email: ''
  },
  projectName: '',
  projectAddress: '',
  workDescription: '',
  startDate: '',
  endDate: '',
  warrantyPeriod: '',
  penaltyClause: '',
  terminationClause: '',
  disputeResolution: '',
  otherTerms: '',
  values: []
};
