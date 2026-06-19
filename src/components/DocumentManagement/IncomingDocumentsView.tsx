import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Eye, Download, Upload, FileText, ChevronDown, Save, Loader2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../Notifications';
import { DocumentTable, DocumentDrawer, ConfirmDialog, DocumentFilter, BadgeSecurity, BadgeUrgency } from './components';
import { 
  IncomingDocument, 
  IncomingDocumentRow,
  IncomingDocumentFormData,
  FilterParams,
  PaginatedResponse,
  DOCUMENT_FIELDS,
  SECURITY_LEVELS,
  URGENCY_LEVELS
} from '../../types/documentTypes';
import { parseValueStandalone, extractIncomingNumberFromDocNumber } from '../../lib/contractHelpers';
import { motion, AnimatePresence } from 'framer-motion';

interface IncomingDocumentsViewProps {
  ownerId: string;
}

export function IncomingDocumentsView({ ownerId }: IncomingDocumentsViewProps) {
  const { toast } = useToast();
  
  // State
  const [documents, setDocuments] = useState<IncomingDocument[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<IncomingDocument> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterParams>({});
  const [sortBy, setSortBy] = useState('received_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Contracts from contracts table with document_type = 'incoming'
  const [incomingContracts, setIncomingContracts] = useState<any[]>([]);
  const [contractsExpanded, setContractsExpanded] = useState(true);
  
  // Drawer & Dialog
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<IncomingDocument | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<IncomingDocument | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch documents
  const fetchDocuments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      // Fetch from incoming_documents table
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder
      });
      
      if (filters.search) params.append('search', filters.search);
      if (filters.field) params.append('field', filters.field);
      if (filters.securityLevel) params.append('securityLevel', filters.securityLevel);
      if (filters.urgencyLevel) params.append('urgencyLevel', filters.urgencyLevel);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await fetch(`/api/documents/incoming?${params}`, {
        headers: { 'x-custom-user-id': ownerId }
      });
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const result = await response.json();
      setDocuments(result.data.map(mapRowToDocument));
      setPagination(result);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast('Không thể tải danh sách văn bản đến', 'error');
    } finally {
      setLoading(false);
    }
  }, [ownerId, filters, sortBy, sortOrder, toast]);

  // Fetch contracts with document_type = 'incoming'
  const fetchIncomingContracts = useCallback(async () => {
    try {
      console.log('[DEBUG] Fetching incoming contracts for ownerId:', ownerId);
      const response = await fetch(`/api/contracts?ownerId=${ownerId}&documentType=incoming`, {
        headers: { 'x-custom-user-id': ownerId }
      });
      console.log('[DEBUG] Response status:', response.status);
      if (response.ok) {
        const contracts = await response.json();
        console.log('[DEBUG] Incoming contracts:', contracts);
        setIncomingContracts(contracts || []);
      }
    } catch (error) {
      console.error('Error fetching incoming contracts:', error);
    }
  }, [ownerId]);

  useEffect(() => {
    fetchDocuments();
    fetchIncomingContracts();
  }, [fetchDocuments, fetchIncomingContracts]);

  // Handlers
  const handleFilterChange = (newFilters: FilterParams) => {
    setFilters(newFilters);
  };

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  };

  const handlePageChange = (page: number) => {
    fetchDocuments(page);
  };

  const openCreateDrawer = () => {
    setSelectedDoc(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (doc: IncomingDocument) => {
    setSelectedDoc(doc);
    setDrawerOpen(true);
  };

  const openDetailDrawer = (doc: IncomingDocument) => {
    setSelectedDoc(doc);
    setDetailOpen(true);
  };

  const handleDelete = async () => {
    if (!docToDelete) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/documents/incoming/${docToDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-custom-user-id': ownerId }
      });
      if (!response.ok) throw new Error('Failed to delete');
      toast('Xóa văn bản đến thành công', 'success');
      setDeleteDialogOpen(false);
      setDocToDelete(null);
      fetchDocuments(pagination?.page || 1);
    } catch (error) {
      toast('Không thể xóa văn bản', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (data: IncomingDocumentFormData) => {
    setSubmitting(true);
    try {
      // Check if selectedDoc is a contract (has form_data or document_type)
      const isContract = selectedDoc && (!!selectedDoc.form_data || !!selectedDoc.document_type);
      
      let url: string;
      let method: string;
      
      if (selectedDoc) {
        if (isContract) {
          // Update contract via contracts API
          url = `/api/contracts/${selectedDoc.id}`;
          method = 'PATCH';
        } else {
          // Update incoming_document via API
          url = `/api/documents/incoming/${selectedDoc.id}`;
          method = 'PUT';
        }
      } else {
        url = '/api/documents/incoming';
        method = 'POST';
      }
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-custom-user-id': ownerId 
        },
        body: isContract ? JSON.stringify({ ...data, documentType: 'incoming' }) : JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[INCOMING] Loi cap nhat:', errorData);
        throw new Error('Failed to save');
      }
      
      toast(selectedDoc ? 'Cập nhật thành công' : 'Tạo mới thành công', 'success');
      setDrawerOpen(false);
      fetchDocuments(pagination?.page || 1);
      fetchIncomingContracts(); // Refresh contracts too
    } catch (error) {
      toast('Không thể lưu văn bản', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Columns
  const columns = [
    { 
      key: 'incoming_number', 
      header: 'Số đến',
      sortable: true,
      width: 'w-28',
      render: (doc: any) => {
        const isContract = !!doc.form_data || !!doc.document_type;
        const formData = doc.form_data ? (typeof doc.form_data === 'string' ? JSON.parse(doc.form_data) : doc.form_data) : {};
        const docNumber = doc.documentNumber || formData.contractNumber || formData.contract_number || '';
        const incomingNum = extractIncomingNumberFromDocNumber(docNumber) || doc.incomingNumber || doc.file_name || '';
        return (
          <div className="flex items-center gap-2">
            {isContract && (
              <span className="shrink-0 size-5 rounded bg-orange-500/20 text-orange-400 flex items-center justify-center" title="Hợp đồng">
                <FileText className="size-3" />
              </span>
            )}
            <span className="font-medium text-primary whitespace-nowrap">{incomingNum || '---'}</span>
          </div>
        );
      }
    },
    { 
      key: 'document_number', 
      header: 'Số VB',
      width: 'w-36',
      render: (doc: any) => {
        const formData = doc.form_data ? (typeof doc.form_data === 'string' ? JSON.parse(doc.form_data) : doc.form_data) : {};
        const docNumber = doc.documentNumber || formData.contractNumber || formData.contract_number || '-';
        return (
          <span className="text-white/90 break-words">{docNumber}</span>
        );
      }
    },
    { 
      key: 'received_date', 
      header: 'Ngày đến',
      sortable: true,
      width: 'w-24',
      render: (doc: any) => {
        // Priority: issueDate (date of issue/sign) > receivedDate > created_at
        const date = doc.issueDate || doc.receivedDate || doc.created_at;
        return (
          <span className="text-white/80 whitespace-nowrap">{date ? formatDate(date) : '-'}</span>
        );
      }
    },
    { 
      key: 'sender', 
      header: 'Cơ quan gửi / Bên A',
      width: 'w-40',
      render: (doc: any) => {
        const formData = doc.form_data ? (typeof doc.form_data === 'string' ? JSON.parse(doc.form_data) : doc.form_data) : {};
        const partyA = formData.partyA?.name || formData.party_a?.name || '';
        const sender = doc.sender || partyA || '-';
        return (
          <span className="text-orange-400 break-words" title={sender}>
            {sender}
          </span>
        );
      }
    },
    { 
      key: 'party_b', 
      header: 'Bên B',
      width: 'w-40',
      render: (doc: any) => {
        const formData = doc.form_data ? (typeof doc.form_data === 'string' ? JSON.parse(doc.form_data) : doc.form_data) : {};
        const partyB = formData.partyB?.name || formData.party_b?.name || '';
        return (
          <span className="text-amber-400 break-words" title={partyB}>
            {partyB || '-'}
          </span>
        );
      }
    },
    { 
      key: 'signer', 
      header: 'Người ký',
      width: 'w-32',
      render: (doc: any) => {
        const signer = doc.signer || '-';
        return (
          <span className="text-white/80 break-words">{signer}</span>
        );
      }
    },
    { 
      key: 'summary', 
      header: 'Trích yếu / Nội dung',
      render: (doc: any) => {
        const formData = doc.form_data ? (typeof doc.form_data === 'string' ? JSON.parse(doc.form_data) : doc.form_data) : {};
        const summary = doc.summary || formData.description || formData.summary || formData.projectName || '';
        return (
          <span className="text-text-dim break-words whitespace-normal" title={summary}>
            {summary || '-'}
          </span>
        );
      }
    },
    { 
      key: 'value', 
      header: 'Giá trị',
      width: 'w-32',
      render: (doc: any) => {
        const formData = doc.form_data ? (typeof doc.form_data === 'string' ? JSON.parse(doc.form_data) : doc.form_data) : {};
        const value = formData.value;
        if (!value) return <span className="text-text-dim">-</span>;
        const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''));
        const formatted = isNaN(numValue) ? String(value) : numValue.toLocaleString('vi-VN');
        return (
          <span className="text-emerald-400 font-medium whitespace-nowrap" title={formatted}>
            {formatted}
          </span>
        );
      }
    },
    { 
      key: 'security_level', 
      header: 'Độ mật',
      width: 'w-20',
      render: (doc: any) => <BadgeSecurity level={doc.securityLevel} />
    },
    { 
      key: 'urgency_level', 
      header: 'Độ khẩn',
      width: 'w-20',
      render: (doc: any) => <BadgeUrgency level={doc.urgencyLevel} />
    },
    {
      key: 'actions',
      header: '',
      width: 'w-24',
      render: (doc: any) => (
        <div className="flex items-center gap-1 justify-end">
          <button 
            onClick={() => openDetailDrawer(doc)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-text-dim hover:text-white"
            title="Xem chi tiết"
          >
            <Eye className="size-4" />
          </button>
          <button 
            onClick={() => openEditDrawer(doc)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-text-dim hover:text-white"
            title="Sửa"
          >
            <Edit2 className="size-4" />
          </button>
          <button 
            onClick={() => { setDocToDelete(doc); setDeleteDialogOpen(true); }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-text-dim hover:text-red-400"
            title="Xóa"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Download className="size-7 text-primary" />
            Văn bản đến
          </h1>
          <p className="text-text-dim text-sm mt-1">
            Quản lý văn bản đến
          </p>
        </div>
        <button onClick={openCreateDrawer} className="btn-primary flex items-center gap-2">
          <Plus className="size-5" />
          Thêm mới
        </button>
      </div>

      {/* Filters */}
      <DocumentFilter 
        filters={filters} 
        onFilterChange={handleFilterChange}
        showDateFilter
      />

      {/* Table */}
      <DocumentTable
        data={[...incomingContracts, ...documents]}
        columns={columns}
        loading={loading}
        pagination={pagination ?? undefined}
        onPageChange={handlePageChange}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
        emptyMessage="Chưa có văn bản đến nào"
      />

      {/* Create/Edit Drawer */}
      <IncomingDocumentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        document={selectedDoc}
        submitting={submitting}
      />

      {/* Detail Drawer */}
      {selectedDoc && (
        <IncomingDocumentDetailDrawer
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          document={selectedDoc}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setDocToDelete(null); }}
        onConfirm={handleDelete}
        title="Xóa văn bản đến"
        message={`Bạn có chắc chắn muốn xóa văn bản "${docToDelete?.incomingNumber}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        variant="danger"
        loading={submitting}
      />
    </div>
  );
}

// ==========================================
// Form Drawer Component
// ==========================================

interface IncomingDocumentDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: IncomingDocumentFormData) => void;
  document: IncomingDocument | null;
  submitting: boolean;
}

function IncomingDocumentDrawer({ open, onClose, onSubmit, document, submitting }: IncomingDocumentDrawerProps) {
  const [formData, setFormData] = useState<IncomingDocumentFormData>({
    incomingNumber: '',
    documentNumber: '',
    receivedDate: new Date().toISOString().split('T')[0],
    issueDate: '',
    sender: '',
    signer: '',
    summary: '',
    field: '',
    securityLevel: 'normal',
    urgencyLevel: 'normal',
    note: ''
  });

  // Additional fields from contract
  const [partyAInfo, setPartyAInfo] = useState({ name: '', taxCode: '', address: '', representative: '', position: '' });
  const [partyBInfo, setPartyBInfo] = useState({ name: '', taxCode: '', address: '', representative: '', position: '' });
  const [contractValue, setContractValue] = useState('');
  const [contractValueInWords, setContractValueInWords] = useState('');

  useEffect(() => {
    if (document) {
      // Check if document is a contract
      const isContract = !!document.form_data || !!document.document_type;
      let parsedFormData: Record<string, any> = {};
      
      if (isContract && document.form_data) {
        try {
          parsedFormData = typeof document.form_data === 'string' 
            ? JSON.parse(document.form_data) 
            : document.form_data;
        } catch (e) {
          console.error('Error parsing form_data:', e);
        }
      }
      
      setFormData({
        incomingNumber: document.incomingNumber || document.file_name || '',
        documentNumber: document.documentNumber || parsedFormData.contractNumber || parsedFormData.contract_number || '',
        receivedDate: document.receivedDate || document.issueDate || document.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        issueDate: document.issueDate || parsedFormData.issueDate || parsedFormData.contractDate || parsedFormData.startDate || '',
        sender: document.sender || parsedFormData.partyA?.name || parsedFormData.party_a?.name || '',
        signer: document.signer || parsedFormData.signer || parsedFormData.partyA?.representative || '',
        summary: document.summary || parsedFormData.description || parsedFormData.summary || parsedFormData.projectName || '',
        field: document.field || '',
        securityLevel: document.securityLevel || 'normal',
        urgencyLevel: document.urgencyLevel || 'normal',
        note: document.note || parsedFormData.note || ''
      });
      
      // Set party info from contract
      const partyA = parsedFormData.partyA || parsedFormData.party_a || {};
      const partyB = parsedFormData.partyB || parsedFormData.party_b || {};
      
      setPartyAInfo({
        name: partyA.name || '',
        taxCode: partyA.taxCode || partyA.mst || '',
        address: partyA.address || '',
        representative: partyA.representative || '',
        position: partyA.position || ''
      });
      
      setPartyBInfo({
        name: partyB.name || '',
        taxCode: partyB.taxCode || partyB.mst || '',
        address: partyB.address || '',
        representative: partyB.representative || '',
        position: partyB.position || ''
      });
      
      // Format value
      const rawValue = parsedFormData.value;
      if (rawValue) {
        const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue).replace(/[^0-9.]/g, ''));
        setContractValue(isNaN(numValue) ? String(rawValue) : numValue.toLocaleString('vi-VN'));
      } else {
        setContractValue('');
      }
      setContractValueInWords(parsedFormData.valueInWords || '');
      
    } else {
      setFormData({
        incomingNumber: '',
        documentNumber: '',
        receivedDate: new Date().toISOString().split('T')[0],
        issueDate: '',
        sender: '',
        signer: '',
        summary: '',
        field: '',
        securityLevel: 'normal',
        urgencyLevel: 'normal',
        note: ''
      });
      setPartyAInfo({ name: '', taxCode: '', address: '', representative: '', position: '' });
      setPartyBInfo({ name: '', taxCode: '', address: '', representative: '', position: '' });
      setContractValue('');
      setContractValueInWords('');
    }
  }, [document, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isContract = !!document?.form_data || !!document?.document_type;

  return (
    <DocumentDrawer
      open={open}
      onClose={onClose}
      title={document ? 'Sửa văn bản đến' : 'Thêm văn bản đến'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contract indicator */}
        {isContract && (
          <div className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <FileText className="size-5 text-orange-400" />
            <span className="text-sm text-orange-400 font-medium">Hợp đồng - Dữ liệu từ OCR</span>
          </div>
        )}

        {/* Thông tin văn bản */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary" />
            Thông tin văn bản
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-dim mb-1.5">
                Số đến <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.incomingNumber}
                onChange={(e) => setFormData({ ...formData, incomingNumber: e.target.value })}
                className="input-field w-full bg-sidebar-dark border-border-dark focus:border-primary"
                placeholder="VD: 123/2026"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-dim mb-1.5">
                Số văn bản
              </label>
              <input
                type="text"
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                className="input-field w-full bg-sidebar-dark border-border-dark focus:border-primary"
                placeholder="VD: CV-001"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-dim mb-1.5">
                Ngày đến <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.receivedDate}
                onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                className="input-field w-full bg-sidebar-dark border-border-dark focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-dim mb-1.5">
                Ngày ban hành
              </label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="input-field w-full bg-sidebar-dark border-border-dark focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Thông tin hợp đồng (if contract) */}
        {isContract && (
          <div className="space-y-4 p-4 bg-gradient-to-br from-orange-500/5 to-amber-500/5 border border-orange-500/20 rounded-2xl">
            <h4 className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-orange-400" />
              Thông tin hợp đồng
            </h4>
            
            {/* Giá trị */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-dim mb-1.5">
                  Giá trị hợp đồng
                </label>
                <input
                  type="text"
                  value={contractValue}
                  readOnly
                  className="w-full px-4 py-2.5 bg-sidebar-dark/50 border border-border-dark rounded-xl text-emerald-400 font-semibold cursor-not-allowed"
                  placeholder="Giá trị"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dim mb-1.5">
                  Giá trị bằng chữ
                </label>
                <input
                  type="text"
                  value={contractValueInWords}
                  readOnly
                  className="w-full px-4 py-2.5 bg-sidebar-dark/50 border border-border-dark rounded-xl text-amber-400 cursor-not-allowed"
                  placeholder="Bằng chữ"
                />
              </div>
            </div>

            {/* Bên A */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-orange-400/80">Bên A (Cơ quan gửi)</h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-text-dim mb-1">Tên công ty</label>
                  <input type="text" value={partyAInfo.name} readOnly className="w-full px-3 py-2 bg-sidebar-dark/50 border border-border-dark rounded-lg text-sm text-white/80 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-text-dim mb-1">MST</label>
                  <input type="text" value={partyAInfo.taxCode} readOnly className="w-full px-3 py-2 bg-sidebar-dark/50 border border-border-dark rounded-lg text-sm text-white/80 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-text-dim mb-1">Người đại diện</label>
                  <input type="text" value={partyAInfo.representative} readOnly className="w-full px-3 py-2 bg-sidebar-dark/50 border border-border-dark rounded-lg text-sm text-white/80 cursor-not-allowed" />
                </div>
              </div>
            </div>

            {/* Bên B */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-amber-400/80">Bên B</h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-text-dim mb-1">Tên công ty</label>
                  <input type="text" value={partyBInfo.name} readOnly className="w-full px-3 py-2 bg-sidebar-dark/50 border border-border-dark rounded-lg text-sm text-white/80 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-text-dim mb-1">MST</label>
                  <input type="text" value={partyBInfo.taxCode} readOnly className="w-full px-3 py-2 bg-sidebar-dark/50 border border-border-dark rounded-lg text-sm text-white/80 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-text-dim mb-1">Người đại diện</label>
                  <input type="text" value={partyBInfo.representative} readOnly className="w-full px-3 py-2 bg-sidebar-dark/50 border border-border-dark rounded-lg text-sm text-white/80 cursor-not-allowed" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cơ quan gửi & Người ký */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary" />
            Nguồn gửi & Ký nhận
          </h4>
          <div>
            <label className="block text-xs font-medium text-text-dim mb-1.5">
              Cơ quan gửi <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.sender}
              onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
              className="input-field w-full bg-sidebar-dark border-border-dark focus:border-primary"
              placeholder="Tên cơ quan gửi văn bản"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-dim mb-1.5">
              Người ký
            </label>
            <input
              type="text"
              value={formData.signer}
              onChange={(e) => setFormData({ ...formData, signer: e.target.value })}
              className="input-field w-full bg-sidebar-dark border-border-dark focus:border-primary"
              placeholder="Tên người ký văn bản"
            />
          </div>
        </div>

        {/* Trích yếu & Lĩnh vực */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary" />
            Nội dung & Phân loại
          </h4>
          <div>
            <label className="block text-xs font-medium text-text-dim mb-1.5">
              Trích yếu
            </label>
            <textarea
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              className="input-field w-full h-24 resize-none bg-sidebar-dark border-border-dark focus:border-primary"
              placeholder="Tóm tắt nội dung văn bản"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-dim mb-1.5">
              Lĩnh vực
            </label>
            <select
              value={formData.field}
              onChange={(e) => setFormData({ ...formData, field: e.target.value })}
              className="input-field w-full bg-sidebar-dark border-border-dark focus:border-primary"
            >
              <option value="">Chọn lĩnh vực</option>
              {DOCUMENT_FIELDS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Độ mật & Độ khẩn */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-dim mb-1.5">
              Độ mật
            </label>
            <select
              value={formData.securityLevel}
              onChange={(e) => setFormData({ ...formData, securityLevel: e.target.value as any })}
              className="input-field w-full bg-sidebar-dark border-border-dark focus:border-primary"
            >
              {SECURITY_LEVELS.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-dim mb-1.5">
              Độ khẩn
            </label>
            <select
              value={formData.urgencyLevel}
              onChange={(e) => setFormData({ ...formData, urgencyLevel: e.target.value as any })}
              className="input-field w-full bg-sidebar-dark border-border-dark focus:border-primary"
            >
              {URGENCY_LEVELS.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Ghi chú */}
        <div>
          <label className="block text-xs font-medium text-text-dim mb-1.5">
            Ghi chú
          </label>
          <textarea
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            className="input-field w-full h-20 resize-none bg-sidebar-dark border-border-dark focus:border-primary"
            placeholder="Ghi chú bổ sung"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4 border-t border-border-dark">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-sidebar-dark border border-border-dark rounded-xl text-text-dim hover:text-white hover:border-white/20 transition-all"
          >
            Hủy
          </button>
        </div>
      </form>
    </DocumentDrawer>
  );
}

// ==========================================
// Detail Drawer Component
// ==========================================

interface IncomingDocumentDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  document: IncomingDocument;
}

function IncomingDocumentDetailDrawer({ open, onClose, document }: IncomingDocumentDetailDrawerProps) {
  const isContract = !!document.form_data || !!document.document_type;
  let formData: Record<string, any> = {};
  if (isContract && document.form_data) {
    try {
      formData = typeof document.form_data === 'string' ? JSON.parse(document.form_data) : document.form_data;
    } catch (e) {}
  }

  const partyA = formData.partyA || formData.party_a || {};
  const partyB = formData.partyB || formData.party_b || {};

  // Lay URL file de xem (uu tien Google Drive > storagePath > pdf_url)
  const pdfUrl = formData._pdfUrl || document.pdf_url || document.storagePath || null;
  const googleDriveFileId = (() => {
    if (!pdfUrl) return null;
    const m = pdfUrl.match(/\/file\/d\/([^/]+)/);
    return m ? m[1] : null;
  })();
  const embedUrl = googleDriveFileId
    ? `https://drive.google.com/file/d/${googleDriveFileId}/preview`
    : pdfUrl || null;
  const hasFile = !!embedUrl;

  const DetailSection = ({ title, children, color = 'primary' }: { title: string; children: React.ReactNode; color?: string }) => (
    <div className="space-y-3">
      <h4 className={`text-xs font-black text-${color} uppercase tracking-wider flex items-center gap-2`}>
        <span className={`size-1.5 rounded-full bg-${color}`} />
        {title}
      </h4>
      <div className="space-y-1">{children}</div>
    </div>
  );

  const DetailRow = ({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-border-dark/50 last:border-0">
      <span className="text-xs text-text-dim shrink-0">{label}</span>
      <span className={`text-xs text-white font-medium text-right break-words whitespace-normal max-w-[60%] ${mono ? 'font-mono' : ''}`}>
        {value || '-'}
      </span>
    </div>
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal 2 cot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-4 md:inset-6 lg:inset-8 z-50 bg-card-dark border border-border-dark rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-dark shrink-0 bg-sidebar-dark/70">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <FileText className="size-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Chi tiết văn bản đến</h2>
                  <p className="text-[11px] text-text-dim">{document.incomingNumber || formData.contractNumber || 'Không có số'}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-text-dim hover:text-white">
                <X className="size-5" />
              </button>
            </div>

            {/* Body 2 cot */}
            <div className="flex-1 overflow-hidden flex flex-row">

              {/* Cot trai: Chi tiet */}
              <div className="w-[360px] xl:w-[400px] shrink-0 overflow-y-auto p-4 space-y-4 border-r border-border-dark">
                {isContract && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                    <FileText className="size-4 text-orange-400" />
                    <span className="text-xs text-orange-400 font-medium">Hợp đồng - Dữ liệu từ OCR</span>
                  </div>
                )}

                <div className="bg-card-dark/50 border border-border-dark rounded-2xl p-4">
                  <DetailSection title="Thông tin văn bản" color="blue-400">
                    <DetailRow label="Số đến" value={<span className="text-primary font-bold">{document.incomingNumber || formData.contractNumber || formData.contract_number || '-'}</span>} />
                    <DetailRow label="Số VB" value={document.documentNumber || formData.contractNumber || '-'} />
                    <DetailRow label="Ngày đến" value={document.receivedDate ? formatDate(document.receivedDate) : '-'} />
                    <DetailRow label="Ngày ban hành" value={document.issueDate ? formatDate(document.issueDate) : '-'} />
                    <DetailRow label="Lĩnh vực" value={document.field || '-'} />
                    <div className="flex justify-between items-center py-2">
                      <span className="text-xs text-text-dim shrink-0">Độ mật</span>
                      <BadgeSecurity level={document.securityLevel} />
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-xs text-text-dim shrink-0">Độ khẩn</span>
                      <BadgeUrgency level={document.urgencyLevel} />
                    </div>
                  </DetailSection>
                </div>

                {isContract && (
                  <>
                    {formData.value && (
                      <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-4">
                        <DetailSection title="Giá trị hợp đồng" color="emerald-400">
                          <div className="py-2 border-b border-border-dark/50">
                            <span className="text-xs text-text-dim">Số tiền</span>
                            <div className="text-base font-bold text-emerald-400">
                              {typeof formData.value === 'number' ? formData.value.toLocaleString('vi-VN') : parseFloat(String(formData.value).replace(/[^0-9.]/g, '')).toLocaleString('vi-VN')} VNĐ
                            </div>
                          </div>
                          {formData.valueInWords && (
                            <div className="py-2">
                              <span className="text-xs text-text-dim">Bằng chữ</span>
                              <div className="text-xs text-amber-400 leading-relaxed">{formData.valueInWords}</div>
                            </div>
                          )}
                        </DetailSection>
                      </div>
                    )}
                    {partyA.name && (
                      <div className="bg-gradient-to-br from-orange-500/5 to-amber-500/5 border border-orange-500/20 rounded-2xl p-4">
                        <DetailSection title="Bên A (Cơ quan gửi)" color="orange-400">
                          <DetailRow label="Tên công ty" value={partyA.name} />
                          {partyA.taxCode && <DetailRow label="MST" value={partyA.taxCode} mono />}
                          {partyA.address && <DetailRow label="Địa chỉ" value={partyA.address} />}
                          {partyA.representative && <DetailRow label="Người đại diện" value={partyA.representative} />}
                          {partyA.position && <DetailRow label="Chức vụ" value={partyA.position} />}
                          {partyA.accountNumber && <DetailRow label="Số TK" value={partyA.accountNumber} mono />}
                          {partyA.bankName && <DetailRow label="Ngân hàng" value={partyA.bankName} />}
                          {partyA.phone && <DetailRow label="Điện thoại" value={partyA.phone} mono />}
                          {partyA.email && <DetailRow label="Email" value={partyA.email} mono />}
                        </DetailSection>
                      </div>
                    )}
                    {partyB.name && (
                      <div className="bg-gradient-to-br from-amber-500/5 to-yellow-500/5 border border-amber-500/20 rounded-2xl p-4">
                        <DetailSection title="Bên B" color="amber-400">
                          <DetailRow label="Tên công ty" value={partyB.name} />
                          {partyB.taxCode && <DetailRow label="MST" value={partyB.taxCode} mono />}
                          {partyB.address && <DetailRow label="Địa chỉ" value={partyB.address} />}
                          {partyB.representative && <DetailRow label="Người đại diện" value={partyB.representative} />}
                          {partyB.position && <DetailRow label="Chức vụ" value={partyB.position} />}
                        </DetailSection>
                      </div>
                    )}
                    {formData.projectName && (
                      <div className="bg-card-dark/50 border border-border-dark rounded-2xl p-4">
                        <DetailSection title="Dự án / Công trình" color="purple-400">
                          <DetailRow label="Tên dự án" value={formData.projectName} />
                          {formData.projectAddress && <DetailRow label="Địa điểm" value={formData.projectAddress} />}
                          {formData.startDate && <DetailRow label="Ngày bắt đầu" value={formatDate(formData.startDate)} />}
                          {formData.endDate && <DetailRow label="Ngày kết thúc" value={formatDate(formData.endDate)} />}
                        </DetailSection>
                      </div>
                    )}
                  </>
                )}

                {(document.summary || formData.description || formData.projectName) && (
                  <div className="bg-card-dark/50 border border-border-dark rounded-2xl p-4">
                    <DetailSection title="Trích yếu / Nội dung" color="primary">
                      <div className="text-xs text-white leading-relaxed whitespace-pre-wrap break-words">
                        {document.summary || formData.description || formData.projectName || '-'}
                      </div>
                    </DetailSection>
                  </div>
                )}

                {document.note && (
                  <div className="bg-card-dark/50 border border-border-dark rounded-2xl p-4">
                    <DetailSection title="Ghi chú" color="text-dim">
                      <div className="text-xs text-text-dim whitespace-pre-wrap break-words">{document.note}</div>
                    </DetailSection>
                  </div>
                )}

                {/* Nut mo file + metadata */}
                <div className="space-y-2 pt-2 border-t border-border-dark">
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary/10 border border-primary/30 rounded-xl text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Download className="size-3.5" />
                      Mở file gốc trong tab mới
                    </a>
                  )}
                  <p className="text-[10px] text-text-dim/50 text-center">
                    Ngày tạo: {formatDateTime(document.createdAt)} • ID: {document.id.slice(0, 8)}...
                  </p>
                </div>
              </div>

              {/* Cot phai: File Viewer */}
              <div className="flex-1 flex flex-col bg-sidebar-dark/30 overflow-hidden">
                {/* Thanh header viewer */}
                <div className="px-4 py-2.5 border-b border-border-dark bg-sidebar-dark/60 flex items-center gap-2 shrink-0">
                  <Eye className="size-3.5 text-text-dim" />
                  <span className="text-xs text-text-dim font-medium">Xem trước tài liệu</span>
                  {hasFile && (
                    <span className="ml-auto text-[10px] text-text-dim/60 bg-white/5 px-2 py-0.5 rounded-full">
                      {googleDriveFileId ? 'Google Drive' : 'PDF'}
                    </span>
                  )}
                </div>

                {hasFile ? (
                  /* Iframe embed */
                  <div className="flex-1 relative">
                    <iframe
                      src={embedUrl!}
                      className="absolute inset-0 w-full h-full border-0"
                      title="Xem truoc tai lieu"
                      allow="autoplay"
                    />
                  </div>
                ) : (
                  /* Khong co file */
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
                    <div className="size-16 rounded-2xl bg-white/5 border border-border-dark/50 flex items-center justify-center">
                      <FileText className="size-8 text-text-dim/30" />
                    </div>
                    <div>
                      <p className="text-text-dim text-sm font-medium mb-1">Chưa có file đính kèm</p>
                      <p className="text-text-dim/50 text-xs leading-relaxed">
                        File PDF hoặc Word sẽ được hiển thị ở đây.<br />
                        Tải file lên qua tính năng nhập hợp đồng OCR.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ==========================================
// Utility Functions
// ==========================================

function mapRowToDocument(row: IncomingDocumentRow): IncomingDocument {
  return {
    id: row.id,
    incomingNumber: row.incoming_number,
    documentNumber: row.document_number,
    receivedDate: row.received_date,
    issueDate: row.issue_date,
    sender: row.sender,
    signer: row.signer,
    summary: row.summary,
    field: row.field,
    securityLevel: row.security_level,
    urgencyLevel: row.urgency_level,
    note: row.note,
    fileId: row.file_id,
    storagePath: row.storage_path,
    storageProvider: row.storage_provider,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN');
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Contract Mini Row Component - Hiển thị hợp đồng trong danh sách văn bản
interface ContractMiniRowProps {
  contract: any;
}

function ContractMiniRow({ contract }: ContractMiniRowProps) {
  const formData = contract.form_data ? (typeof contract.form_data === 'string' ? JSON.parse(contract.form_data) : contract.form_data) : {};
  const contractValue = formData.value ? parseValueStandalone(formData.value) : '---';
  const contractNumber = formData.contractNumber || formData.contract_number || '---';
  const partyA = formData.partyA?.name || formData.party_a?.name || '---';
  const partyB = formData.partyB?.name || formData.party_b?.name || '---';

  const createdDate = (() => {
    try {
      const date = new Date(contract.created_at);
      return date.toLocaleDateString('vi-VN');
    } catch {
      return '---';
    }
  })();

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
      <div className="size-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
        <FileText className="size-5 text-orange-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-white truncate">{contract.file_name}</div>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-text-dim">
          <span>Bên A: <span className="text-orange-400">{partyA}</span></span>
          <span>Bên B: <span className="text-amber-500">{partyB}</span></span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs font-bold text-amber-400">{contractValue}</div>
        <div className="text-[10px] text-text-dim">Số HĐ: {contractNumber}</div>
      </div>
      <div className="text-[10px] text-text-dim shrink-0">
        {createdDate}
      </div>
    </div>
  );
}
