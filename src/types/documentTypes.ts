// ==========================================
// Document Management Types
// ==========================================

export type SecurityLevel = 'normal' | 'internal' | 'confidential' | 'secret';
export type UrgencyLevel = 'normal' | 'urgent' | 'very_urgent';
export type DocumentType = 'incoming' | 'outgoing';

// ==========================================
// Incoming Document
// ==========================================

export interface IncomingDocument {
  id: string;
  incomingNumber: string;
  documentNumber?: string | null;
  receivedDate: string;
  issueDate?: string | null;
  sender: string;
  signer?: string | null;
  summary?: string | null;
  field?: string | null;
  securityLevel: SecurityLevel;
  urgencyLevel: UrgencyLevel;
  note?: string | null;
  fileId?: string | null;
  storagePath?: string | null;
  storageProvider?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  form_data?: any;
  document_type?: string;
  file_name?: string;
  created_at?: string;
  pdf_url?: string;
}

export interface IncomingDocumentFormData {
  incomingNumber: string;
  documentNumber?: string;
  receivedDate: string;
  issueDate?: string;
  sender: string;
  signer?: string;
  summary?: string;
  field?: string;
  securityLevel: SecurityLevel;
  urgencyLevel: UrgencyLevel;
  note?: string;
}

export interface IncomingDocumentRow {
  id: string;
  incoming_number: string;
  document_number: string | null;
  received_date: string;
  issue_date: string | null;
  sender: string;
  signer: string | null;
  summary: string | null;
  field: string | null;
  security_level: SecurityLevel;
  urgency_level: UrgencyLevel;
  note: string | null;
  file_id: string | null;
  storage_path: string | null;
  storage_provider: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// Outgoing Document
// ==========================================

export interface OutgoingDocument {
  id: string;
  outgoingNumber: string;
  documentNumber?: string | null;
  issueDate: string;
  receiver: string;
  signer?: string | null;
  summary?: string | null;
  field?: string | null;
  securityLevel: SecurityLevel;
  urgencyLevel: UrgencyLevel;
  note?: string | null;
  fileId?: string | null;
  storagePath?: string | null;
  storageProvider?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  form_data?: any;
  document_type?: string;
  file_name?: string;
  created_at?: string;
  pdf_url?: string;
}

export interface OutgoingDocumentFormData {
  outgoingNumber: string;
  documentNumber?: string;
  issueDate: string;
  receiver: string;
  signer?: string;
  summary?: string;
  field?: string;
  securityLevel: SecurityLevel;
  urgencyLevel: UrgencyLevel;
  note?: string;
}

export interface OutgoingDocumentRow {
  id: string;
  outgoing_number: string;
  document_number: string | null;
  issue_date: string;
  receiver: string;
  signer: string | null;
  summary: string | null;
  field: string | null;
  security_level: SecurityLevel;
  urgency_level: UrgencyLevel;
  note: string | null;
  file_id: string | null;
  storage_path: string | null;
  storage_provider: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// Archive
// ==========================================

export interface Archive {
  id: string;
  archiveCode: string;
  archiveName: string;
  field?: string | null;
  year?: number | null;
  description?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArchiveFormData {
  archiveCode: string;
  archiveName: string;
  field?: string;
  year?: number;
  description?: string;
}

export interface ArchiveRow {
  id: string;
  archive_code: string;
  archive_name: string;
  field: string | null;
  year: number | null;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// Archive Document (Link Table)
// ==========================================

export interface ArchiveDocument {
  id: string;
  archiveId: string;
  documentType: DocumentType;
  documentId: string;
  ownerId: string;
  createdAt: string;
}

export interface ArchiveDocumentRow {
  id: string;
  archive_id: string;
  document_type: DocumentType;
  document_id: string;
  owner_id: string;
  created_at: string;
}

// ==========================================
// Statistics
// ==========================================

export interface DocumentStatistics {
  totalIncoming: number;
  totalOutgoing: number;
  totalArchives: number;
  incomingThisMonth: number;
  outgoingThisMonth: number;
  incomingByMonth: MonthlyCount[];
  outgoingByMonth: MonthlyCount[];
  incomingByField: FieldCount[];
  outgoingByField: FieldCount[];
}

export interface MonthlyCount {
  month: string;
  count: number;
}

export interface FieldCount {
  field: string;
  count: number;
}

// ==========================================
// Search
// ==========================================

export interface SearchResult {
  type: 'incoming' | 'outgoing' | 'archive';
  id: string;
  source?: 'doc' | 'contract';
  title: string;
  subtitle: string;
  metadata: Record<string, string | number>;
}

export interface SearchResponse {
  incoming: SearchResult[];
  outgoing: SearchResult[];
  archives: SearchResult[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

// ==========================================
// Utility Types
// ==========================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  field?: string;
  securityLevel?: SecurityLevel;
  urgencyLevel?: UrgencyLevel;
  dateFrom?: string;
  dateTo?: string;
  year?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// Field Options (for dropdowns)
// ==========================================

export const DOCUMENT_FIELDS = [
  'Hành chính - Tổ chức',
  'Tài chính - Kế toán',
  'Nhân sự',
  'Kinh doanh',
  'Kỹ thuật - Công nghệ',
  'Pháp lý',
  'Đầu tư',
  'Marketing',
  'Vật tư - Thiết bị',
  'Khác'
] as const;

export const SECURITY_LEVELS: { value: SecurityLevel; label: string; color: string }[] = [
  { value: 'normal', label: 'Bình thường', color: 'gray' },
  { value: 'internal', label: 'Nội bộ', color: 'blue' },
  { value: 'confidential', label: ' Bí mật', color: 'orange' },
  { value: 'secret', label: 'Tuyệt mật', color: 'red' }
];

export const URGENCY_LEVELS: { value: UrgencyLevel; label: string; color: string }[] = [
  { value: 'normal', label: 'Bình thường', color: 'gray' },
  { value: 'urgent', label: 'Khẩn', color: 'orange' },
  { value: 'very_urgent', label: 'Rất khẩn', color: 'red' }
];
