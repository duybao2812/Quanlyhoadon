import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Eye, Download, Upload, FileText, ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../Notifications';
import { DocumentTable, DocumentDrawer, ConfirmDialog, DocumentFilter, BadgeSecurity, BadgeUrgency } from './components';
import { 
  OutgoingDocument, 
  OutgoingDocumentRow,
  OutgoingDocumentFormData,
  FilterParams,
  PaginatedResponse,
  DOCUMENT_FIELDS,
  SECURITY_LEVELS,
  URGENCY_LEVELS
} from '../../types/documentTypes';
import { parseValueStandalone } from '../../lib/contractHelpers';
import { motion, AnimatePresence } from 'framer-motion';

interface OutgoingDocumentsViewProps {
  ownerId: string;
}

export function OutgoingDocumentsView({ ownerId }: OutgoingDocumentsViewProps) {
  const { toast } = useToast();
  
  const [documents, setDocuments] = useState<OutgoingDocument[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<OutgoingDocument> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterParams>({});
  const [sortBy, setSortBy] = useState('issue_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<OutgoingDocument | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<OutgoingDocument | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Contracts from contracts table with document_type = 'outgoing'
  const [outgoingContracts, setOutgoingContracts] = useState<any[]>([]);
  const [contractsExpanded, setContractsExpanded] = useState(true);

  // Fetch outgoing documents
  const fetchDocuments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
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

      const response = await fetch(`/api/documents/outgoing?${params}`, {
        headers: { 'x-custom-user-id': ownerId }
      });
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const result = await response.json();
      setDocuments(result.data.map(mapRowToDocument));
      setPagination(result);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast('Không thể tải danh sách văn bản đi', 'error');
    } finally {
      setLoading(false);
    }
  }, [ownerId, filters, sortBy, sortOrder, toast]);

  const fetchOutgoingContracts = useCallback(async () => {
    try {
      const response = await fetch(`/api/contracts?ownerId=${ownerId}&documentType=outgoing`, {
        headers: { 'x-custom-user-id': ownerId }
      });
      if (response.ok) {
        const contracts = await response.json();
        setOutgoingContracts(contracts || []);
      }
    } catch (error) {
      console.error('Error fetching outgoing contracts:', error);
    }
  }, [ownerId]);

  useEffect(() => {
    fetchDocuments();
    fetchOutgoingContracts();
  }, [fetchDocuments, fetchOutgoingContracts]);

  const handleFilterChange = (newFilters: FilterParams) => setFilters(newFilters);
  const handleSort = (key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  };
  const handlePageChange = (page: number) => fetchDocuments(page);

  const openCreateDrawer = () => { setSelectedDoc(null); setDrawerOpen(true); };
  const openEditDrawer = (doc: OutgoingDocument) => { setSelectedDoc(doc); setDrawerOpen(true); };
  const openDetailDrawer = (doc: OutgoingDocument) => { setSelectedDoc(doc); setDetailOpen(true); };

  const handleDelete = async () => {
    if (!docToDelete) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/documents/outgoing/${docToDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-custom-user-id': ownerId }
      });
      if (!response.ok) throw new Error('Failed to delete');
      toast('Xóa văn bản đi thành công', 'success');
      setDeleteDialogOpen(false);
      setDocToDelete(null);
      fetchDocuments(pagination?.page || 1);
    } catch (error) {
      toast('Không thể xóa văn bản', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (data: OutgoingDocumentFormData) => {
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
          // Update outgoing_document via API
          url = `/api/documents/outgoing/${selectedDoc.id}`;
          method = 'PUT';
        }
      } else {
        url = '/api/documents/outgoing';
        method = 'POST';
      }
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-custom-user-id': ownerId 
        },
        body: isContract ? JSON.stringify({ ...data, documentType: 'outgoing' }) : JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[OUTGOING] Error updating:', errorData);
        throw new Error('Failed to save');
      }
      
      toast(selectedDoc ? 'Cập nhật thành công' : 'Tạo mới thành công', 'success');
      setDrawerOpen(false);
      fetchDocuments(pagination?.page || 1);
      fetchOutgoingContracts(); // Refresh contracts too
    } catch (error) {
      toast('Không thể lưu văn bản', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { 
      key: 'outgoing_number', 
      header: 'Số đi',
      sortable: true,
      width: 'w-28',
      render: (doc: any) => {
        const isContract = !!doc.form_data || !!doc.document_type;
        return (
          <div className="flex items-center gap-2">
            {isContract && (
              <span className="shrink-0 size-5 rounded bg-orange-500/20 text-orange-400 flex items-center justify-center" title="Hợp đồng">
                <FileText className="size-3" />
              </span>
            )}
            <span className="font-medium text-primary whitespace-nowrap">{doc.outgoingNumber || doc.file_name || '---'}</span>
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
      key: 'issue_date', 
      header: 'Ngày BH',
      sortable: true,
      width: 'w-24',
      render: (doc: any) => (
        <span className="text-white/80 whitespace-nowrap">{doc.issueDate ? formatDate(doc.issueDate) : '-'}</span>
      )
    },
    { 
      key: 'receiver', 
      header: 'Nơi nhận / Bên B',
      width: 'w-40',
      render: (doc: any) => {
        const formData = doc.form_data ? (typeof doc.form_data === 'string' ? JSON.parse(doc.form_data) : doc.form_data) : {};
        const partyB = formData.partyB?.name || formData.party_b?.name || '';
        const receiver = doc.receiver || partyB || '-';
        return (
          <span className="text-amber-400 break-words" title={receiver}>
            {receiver}
          </span>
        );
      }
    },
    { 
      key: 'party_a', 
      header: 'Bên A',
      width: 'w-40',
      render: (doc: any) => {
        const formData = doc.form_data ? (typeof doc.form_data === 'string' ? JSON.parse(doc.form_data) : doc.form_data) : {};
        const partyA = formData.partyA?.name || formData.party_a?.name || '';
        return (
          <span className="text-orange-400 break-words" title={partyA}>
            {partyA || '-'}
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Upload className="size-7 text-primary" />
            Văn bản đi
          </h1>
          <p className="text-text-dim text-sm mt-1">
            Quản lý văn bản đi
          </p>
        </div>
        <button onClick={openCreateDrawer} className="btn-primary flex items-center gap-2">
          <Plus className="size-5" />
          Thêm mới
        </button>
      </div>

      <DocumentFilter 
        filters={filters} 
        onFilterChange={handleFilterChange}
        showDateFilter
      />

      <DocumentTable
        data={[...outgoingContracts, ...documents]}
        columns={columns}
        loading={loading}
        pagination={pagination ?? undefined}
        onPageChange={handlePageChange}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
        emptyMessage="Chưa có văn bản đi nào"
      />

      <OutgoingDocumentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        document={selectedDoc}
        submitting={submitting}
      />

      {selectedDoc && (
        <OutgoingDocumentDetailDrawer
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          document={selectedDoc}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setDocToDelete(null); }}
        onConfirm={handleDelete}
        title="Xóa văn bản đi"
        message={`Bạn có chắc chắn muốn xóa văn bản "${docToDelete?.outgoingNumber}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        variant="danger"
        loading={submitting}
      />
    </div>
  );
}

// Form Drawer
interface OutgoingDocumentDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: OutgoingDocumentFormData) => void;
  document: OutgoingDocument | null;
  submitting: boolean;
}

function OutgoingDocumentDrawer({ open, onClose, onSubmit, document, submitting }: OutgoingDocumentDrawerProps) {
  const [formData, setFormData] = useState<OutgoingDocumentFormData>({
    outgoingNumber: '',
    documentNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    receiver: '',
    signer: '',
    summary: '',
    field: '',
    securityLevel: 'normal',
    urgencyLevel: 'normal',
    note: ''
  });

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
        outgoingNumber: document.outgoingNumber || document.file_name || '',
        documentNumber: document.documentNumber || parsedFormData.contractNumber || parsedFormData.contract_number || '',
        issueDate: document.issueDate || parsedFormData.issueDate || parsedFormData.startDate || document.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        receiver: document.receiver || parsedFormData.partyB?.name || parsedFormData.party_b?.name || '',
        signer: document.signer || parsedFormData.signer || '',
        summary: document.summary || parsedFormData.description || parsedFormData.summary || '',
        field: document.field || '',
        securityLevel: document.securityLevel || 'normal',
        urgencyLevel: document.urgencyLevel || 'normal',
        note: document.note || parsedFormData.note || ''
      });
    } else {
      setFormData({
        outgoingNumber: '',
        documentNumber: '',
        issueDate: new Date().toISOString().split('T')[0],
        receiver: '',
        signer: '',
        summary: '',
        field: '',
        securityLevel: 'normal',
        urgencyLevel: 'normal',
        note: ''
      });
    }
  }, [document, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <DocumentDrawer
      open={open}
      onClose={onClose}
      title={document ? 'Sửa văn bản đi' : 'Thêm văn bản đi'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1.5">
              Số đi <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.outgoingNumber}
              onChange={(e) => setFormData({ ...formData, outgoingNumber: e.target.value })}
              className="input-field w-full"
              placeholder="VD: 001/2026"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1.5">
              Số văn bản
            </label>
            <input
              type="text"
              value={formData.documentNumber}
              onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
              className="input-field w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1.5">
            Ngày ban hành <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            required
            value={formData.issueDate}
            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
            className="input-field w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1.5">
            Nơi nhận <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.receiver}
            onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
            className="input-field w-full"
            placeholder="Tên địa chỉ nhận văn bản"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1.5">
            Người ký
          </label>
          <input
            type="text"
            value={formData.signer}
            onChange={(e) => setFormData({ ...formData, signer: e.target.value })}
            className="input-field w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1.5">
            Trích yếu
          </label>
          <textarea
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            className="input-field w-full h-24 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1.5">
            Lĩnh vực
          </label>
          <select
            value={formData.field}
            onChange={(e) => setFormData({ ...formData, field: e.target.value })}
            className="input-field w-full"
          >
            <option value="">Chọn lĩnh vực</option>
            {DOCUMENT_FIELDS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1.5">Độ mật</label>
            <select
              value={formData.securityLevel}
              onChange={(e) => setFormData({ ...formData, securityLevel: e.target.value as any })}
              className="input-field w-full"
            >
              {SECURITY_LEVELS.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1.5">Độ khẩn</label>
            <select
              value={formData.urgencyLevel}
              onChange={(e) => setFormData({ ...formData, urgencyLevel: e.target.value as any })}
              className="input-field w-full"
            >
              {URGENCY_LEVELS.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1.5">Ghi chú</label>
          <textarea
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            className="input-field w-full h-20 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">Hủy</button>
          <button type="submit" disabled={submitting} className="flex-1 btn-primary py-3">
            {submitting ? 'Đang lưu...' : (document ? 'Cập nhật' : 'Tạo mới')}
          </button>
        </div>
      </form>
    </DocumentDrawer>
  );
}

// Detail Drawer
interface OutgoingDocumentDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  document: OutgoingDocument;
}

function OutgoingDocumentDetailDrawer({ open, onClose, document }: OutgoingDocumentDetailDrawerProps) {
  const isContract = !!document.form_data || !!document.document_type;
  let formData: Record<string, any> = {};
  if (isContract && document.form_data) {
    try {
      formData = typeof document.form_data === 'string' ? JSON.parse(document.form_data) : document.form_data;
    } catch (e) {}
  }

  const partyA = formData.partyA || formData.party_a || {};
  const partyB = formData.partyB || formData.party_b || {};

  // Lay URL file de xem
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

  const DetailSection = ({ title, children, color = 'emerald' }: { title: string; children: React.ReactNode; color?: string }) => (
    <div className="space-y-3">
      <h4 className={`text-xs font-black text-${color}-400 uppercase tracking-wider flex items-center gap-2`}>
        <span className={`size-1.5 rounded-full bg-${color}-400`} />
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
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
                <div className="size-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Upload className="size-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Chi tiết văn bản đi</h2>
                  <p className="text-[11px] text-text-dim">{document.outgoingNumber || formData.contractNumber || 'Không có số'}</p>
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
                  <DetailSection title="Thông tin văn bản" color="emerald">
                    <DetailRow label="Số đi" value={<span className="text-emerald-400 font-bold">{document.outgoingNumber || '-'}</span>} />
                    <DetailRow label="Số VB" value={document.documentNumber || formData.contractNumber || '-'} />
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
                        <DetailSection title="Giá trị hợp đồng" color="emerald">
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
                        <DetailSection title="Bên A" color="orange">
                          <DetailRow label="Tên công ty" value={partyA.name} />
                          {partyA.taxCode && <DetailRow label="MST" value={partyA.taxCode} mono />}
                          {partyA.address && <DetailRow label="Địa chỉ" value={partyA.address} />}
                          {partyA.representative && <DetailRow label="Người đại diện" value={partyA.representative} />}
                          {partyA.position && <DetailRow label="Chức vụ" value={partyA.position} />}
                          {partyA.accountNumber && <DetailRow label="Số TK" value={partyA.accountNumber} mono />}
                          {partyA.bankName && <DetailRow label="Ngân hàng" value={partyA.bankName} />}
                        </DetailSection>
                      </div>
                    )}
                    {partyB.name && (
                      <div className="bg-gradient-to-br from-amber-500/5 to-yellow-500/5 border border-amber-500/20 rounded-2xl p-4">
                        <DetailSection title="Bên B (Nơi nhận)" color="amber">
                          <DetailRow label="Tên công ty" value={partyB.name} />
                          {partyB.taxCode && <DetailRow label="MST" value={partyB.taxCode} mono />}
                          {partyB.address && <DetailRow label="Địa chỉ" value={partyB.address} />}
                          {partyB.representative && <DetailRow label="Người đại diện" value={partyB.representative} />}
                        </DetailSection>
                      </div>
                    )}
                  </>
                )}

                {(document.summary || formData.description || formData.projectName) && (
                  <div className="bg-card-dark/50 border border-border-dark rounded-2xl p-4">
                    <DetailSection title="Trích yếu / Nội dung" color="emerald">
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

                <div className="space-y-2 pt-2 border-t border-border-dark">
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
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
                  <div className="flex-1 relative">
                    <iframe
                      src={embedUrl!}
                      className="absolute inset-0 w-full h-full border-0"
                      title="Xem truoc tai lieu"
                      allow="autoplay"
                    />
                  </div>
                ) : (
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

function mapRowToDocument(row: OutgoingDocumentRow): OutgoingDocument {
  return {
    id: row.id,
    outgoingNumber: row.outgoing_number,
    documentNumber: row.document_number,
    issueDate: row.issue_date,
    receiver: row.receiver,
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

// Contract Mini Row Component for Outgoing
interface OutgoingContractMiniRowProps {
  contract: any;
}

function OutgoingContractMiniRow({ contract }: OutgoingContractMiniRowProps) {
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
      <div className="size-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
        <FileText className="size-5 text-green-400" />
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
