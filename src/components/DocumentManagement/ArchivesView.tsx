import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Eye, FolderArchive, ChevronRight, Download, Upload, X, FileText, FolderOpen, Search, Loader2, File, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { cn } from '../../lib/utils';
import { useToast } from '../Notifications';
import { DocumentTable, DocumentDrawer, ConfirmDialog, BadgeSecurity, BadgeUrgency } from './components';
import { 
  Archive, 
  ArchiveRow,
  ArchiveFormData,
  FilterParams,
  PaginatedResponse,
  DOCUMENT_FIELDS,
  IncomingDocument,
  OutgoingDocument
} from '../../types/documentTypes';

interface ArchivesViewProps {
  ownerId: string;
}

export function ArchivesView({ ownerId }: ArchivesViewProps) {
  const { toast } = useToast();
  
  const [archives, setArchives] = useState<Archive[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<Archive> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterParams>({});
  const [activeTab, setActiveTab] = useState<'folders' | 'files'>('folders');
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<Archive | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveToDelete, setArchiveToDelete] = useState<Archive | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchArchives = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
      
      if (filters.search) params.append('search', filters.search);
      if (filters.field) params.append('field', filters.field);
      if (filters.year) params.append('year', filters.year.toString());

      const response = await fetch(`/api/archives?${params}`, {
        headers: { 'x-custom-user-id': ownerId }
      });
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const result = await response.json();
      setArchives(result.data.map(mapRowToArchive));
      setPagination(result);
    } catch (error) {
      console.error('Error fetching archives:', error);
      toast('Không thể tải danh sách hồ sơ', 'error');
    } finally {
      setLoading(false);
    }
  }, [ownerId, filters, toast]);

  useEffect(() => {
    fetchArchives();
  }, [fetchArchives]);

  const handleDelete = async () => {
    if (!archiveToDelete) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/archives/${archiveToDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-custom-user-id': ownerId }
      });
      if (!response.ok) throw new Error('Failed to delete');
      toast('Xóa hồ sơ thành công', 'success');
      setDeleteDialogOpen(false);
      setArchiveToDelete(null);
      fetchArchives(pagination?.page || 1);
    } catch (error) {
      toast('Không thể xóa hồ sơ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (data: ArchiveFormData) => {
    setSubmitting(true);
    try {
      const url = selectedArchive 
        ? `/api/archives/${selectedArchive.id}`
        : '/api/archives';
      const method = selectedArchive ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-custom-user-id': ownerId 
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) throw new Error('Failed to save');
      
      toast(selectedArchive ? 'Cập nhật thành công' : 'Tạo mới thành công', 'success');
      setDrawerOpen(false);
      fetchArchives(pagination?.page || 1);
    } catch (error) {
      toast('Không thể lưu hồ sơ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FolderArchive className="size-7 text-primary" />
            Hồ sơ lưu trữ
          </h1>
          <p className="text-text-dim text-sm mt-1">
            Quản lý hồ sơ lưu trữ văn bản và tệp tin
          </p>
        </div>
        {activeTab === 'folders' && (
          <button onClick={() => { setSelectedArchive(null); setDrawerOpen(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="size-5" />
            Thêm mới
          </button>
        )}
      </div>

      {/* Internal Sub-Tabs */}
      <div className="flex gap-6 border-b border-white/5 pb-px">
        <button
          onClick={() => setActiveTab('folders')}
          className={cn(
            "pb-3 text-sm font-semibold transition-all relative",
            activeTab === 'folders' 
              ? "text-primary border-b-2 border-primary" 
              : "text-text-dim hover:text-white"
          )}
        >
          Thư mục hồ sơ
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={cn(
            "pb-3 text-sm font-semibold transition-all relative",
            activeTab === 'files' 
              ? "text-primary border-b-2 border-primary" 
              : "text-text-dim hover:text-white"
          )}
        >
          Kho tệp tin (MinIO)
        </button>
      </div>

      {activeTab === 'folders' ? (
        <>
          {/* Simple Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Tìm kiếm hồ sơ..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input-field w-full"
              />
            </div>
            <select
              value={filters.field || ''}
              onChange={(e) => setFilters({ ...filters, field: e.target.value || undefined })}
              className="input-field w-48"
            >
              <option value="">Tất cả lĩnh vực</option>
              {DOCUMENT_FIELDS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select
              value={filters.year || ''}
              onChange={(e) => setFilters({ ...filters, year: e.target.value ? parseInt(e.target.value) : undefined })}
              className="input-field w-32"
            >
              <option value="">Tất cả năm</option>
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Archives Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-20 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          ) : archives.length === 0 ? (
            <div className="card flex items-center justify-center py-20">
              <div className="text-center max-w-md">
                <div className="size-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FolderArchive className="size-10 text-primary/60" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">Thư mục hồ sơ lưu trữ</h3>
                <p className="text-text-dim text-sm mb-6 max-w-sm mx-auto">
                  Chưa có thư mục hồ sơ nào được tạo. Hãy nhấn "Thêm mới" ở góc trên bên phải để bắt đầu thiết lập thư mục.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archives.map((archive, idx) => (
                <motion.div
                  key={archive.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="card p-4 hover:border-primary/50 transition-colors cursor-pointer group"
                  onClick={() => { setSelectedArchive(archive); setDetailOpen(true); }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FolderArchive className="size-5 text-primary" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedArchive(archive); setDrawerOpen(true); }}
                        className="p-2 rounded-lg hover:bg-white/10 text-text-dim hover:text-white transition-colors"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setArchiveToDelete(archive); setDeleteDialogOpen(true); }}
                        className="p-2 rounded-lg hover:bg-white/10 text-text-dim hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-white mb-1 truncate">{archive.archiveName}</h3>
                  <p className="text-sm text-primary mb-2">{archive.archiveCode}</p>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    {archive.field && (
                      <span className="px-2 py-0.5 bg-white/5 rounded text-text-dim">{archive.field}</span>
                    )}
                    {archive.year && (
                      <span className="px-2 py-0.5 bg-white/5 rounded text-text-dim">{archive.year}</span>
                    )}
                  </div>
                  
                  <div className="mt-3 flex items-center text-text-dim text-sm">
                    <span>Chi tiết</span>
                    <ChevronRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => fetchArchives(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-4 py-2 rounded-lg bg-white/10 disabled:opacity-30"
              >
                Trước
              </button>
              <span className="text-text-dim">
                Trang {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchArchives(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 rounded-lg bg-white/10 disabled:opacity-30"
              >
                Sau
              </button>
            </div>
          )}
        </>
      ) : (
        <MinioFileManager />
      )}

      {/* Create/Edit Drawer */}
      <ArchiveFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        archive={selectedArchive}
        submitting={submitting}
      />

      {/* Detail Drawer */}
      {selectedArchive && (
        <ArchiveDetailDrawer
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          archive={selectedArchive}
          ownerId={ownerId}
          onRefresh={() => fetchArchives(pagination?.page || 1)}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setArchiveToDelete(null); }}
        onConfirm={handleDelete}
        title="Xóa hồ sơ"
        message={`Bạn có chắc chắn muốn xóa hồ sơ "${archiveToDelete?.archiveName}"? Tất cả liên kết văn bản sẽ bị xóa.`}
        confirmText="Xóa"
        variant="danger"
        loading={submitting}
      />
    </div>
  );
}

// Form Drawer
interface ArchiveFormDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ArchiveFormData) => void;
  archive: Archive | null;
  submitting: boolean;
}

function ArchiveFormDrawer({ open, onClose, onSubmit, archive, submitting }: ArchiveFormDrawerProps) {
  const [formData, setFormData] = useState<ArchiveFormData>({
    archiveCode: '',
    archiveName: '',
    field: '',
    year: new Date().getFullYear(),
    description: ''
  });

  useEffect(() => {
    if (archive) {
      setFormData({
        archiveCode: archive.archiveCode,
        archiveName: archive.archiveName,
        field: archive.field || '',
        year: archive.year || new Date().getFullYear(),
        description: archive.description || ''
      });
    } else {
      setFormData({
        archiveCode: '',
        archiveName: '',
        field: '',
        year: new Date().getFullYear(),
        description: ''
      });
    }
  }, [archive, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <DocumentDrawer
      open={open}
      onClose={onClose}
        title={archive ? 'Sửa hồ sơ' : 'Thêm hồ sơ'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-dim mb-1.5">
            Ma ho so <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.archiveCode}
            onChange={(e) => setFormData({ ...formData, archiveCode: e.target.value })}
            className="input-field w-full"
            placeholder="VD: HS-2026-001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1.5">
            Tên hồ sơ <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.archiveName}
            onChange={(e) => setFormData({ ...formData, archiveName: e.target.value })}
            className="input-field w-full"
            placeholder="Tên mô tả hồ sơ"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1.5">Lĩnh vực</label>
            <select
              value={formData.field || ''}
              onChange={(e) => setFormData({ ...formData, field: e.target.value || undefined })}
              className="input-field w-full"
            >
              <option value="">Chọn lĩnh vực</option>
              {DOCUMENT_FIELDS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1.5">Năm</label>
            <input
              type="number"
              value={formData.year || ''}
              onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : undefined })}
              className="input-field w-full"
              min="1900"
              max="2100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1.5">Mô tả</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input-field w-full h-24 resize-none"
            placeholder="Mô tả nội dung hồ sơ"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">Hủy</button>
          <button type="submit" disabled={submitting} className="flex-1 btn-primary py-3">
            {submitting ? 'Đang lưu...' : (archive ? 'Cập nhật' : 'Tạo mới')}
          </button>
        </div>
      </form>
    </DocumentDrawer>
  );
}

// Detail Drawer with Document Management
interface ArchiveDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  archive: Archive;
  ownerId: string;
  onRefresh: () => void;
}

function ArchiveDetailDrawer({ open, onClose, archive, ownerId, onRefresh }: ArchiveDetailDrawerProps) {
  const { toast } = useToast();
  const [incomingDocs, setIncomingDocs] = useState<(IncomingDocument & { _remove?: boolean })[]>([]);
  const [outgoingDocs, setOutgoingDocs] = useState<(OutgoingDocument & { _remove?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [addDocType, setAddDocType] = useState<'incoming' | 'outgoing'>('incoming');
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/archives/${archive.id}`, {
        headers: { 'x-custom-user-id': ownerId }
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setIncomingDocs(data.incomingDocuments || []);
      setOutgoingDocs(data.outgoingDocuments || []);
    } catch (error) {
      console.error('Error fetching archive detail:', error);
      toast('Không thể tải chi tiết hồ sơ', 'error');
    } finally {
      setLoading(false);
    }
  }, [archive.id, ownerId, toast]);

  useEffect(() => {
    if (open) fetchDetail();
  }, [open, fetchDetail]);

  const fetchAvailableDocs = async (type: 'incoming' | 'outgoing') => {
    setSubmitting(true);
    try {
      const table = type === 'incoming' ? 'incoming_documents' : 'outgoing_documents';
      const response = await fetch(`/api/documents/${table}?limit=100`, {
        headers: { 'x-custom-user-id': ownerId }
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      
      const existingIds = type === 'incoming' 
        ? incomingDocs.map(d => d.id)
        : outgoingDocs.map(d => d.id);
      
      setAvailableDocs(result.data.filter((d: any) => !existingIds.includes(d.id)));
    } catch (error) {
      toast('Không thể tải danh sách văn bản', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAddDoc = (type: 'incoming' | 'outgoing') => {
    setAddDocType(type);
    setSelectedDocId('');
    fetchAvailableDocs(type);
    setAddDocOpen(true);
  };

  const handleAddDoc = async () => {
    if (!selectedDocId) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/archives/${archive.id}/documents`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-custom-user-id': ownerId 
        },
        body: JSON.stringify({ documentType: addDocType, documentId: selectedDocId })
      });
      if (!response.ok) throw new Error('Failed to add');
      toast('Thêm văn bản thành công', 'success');
      setAddDocOpen(false);
      fetchDetail();
      onRefresh();
    } catch (error: any) {
      toast(error.message || 'Không thể thêm văn bản', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveDoc = async (type: 'incoming' | 'outgoing', docId: string) => {
    try {
      const response = await fetch(`/api/archives/${archive.id}/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'x-custom-user-id': ownerId }
      });
      if (!response.ok) throw new Error('Failed to remove');
      toast('Xóa văn bản thành công', 'success');
      fetchDetail();
      onRefresh();
    } catch (error) {
      toast('Không thể xóa văn bản', 'error');
    }
  };

  const docNumberField = addDocType === 'incoming' ? 'incoming_number' : 'outgoing_number';

  return (
    <DocumentDrawer open={open} onClose={onClose} title={`Chi tiet ho so: ${archive.archiveName}`} size="xl">
      {loading ? (
        <div className="space-y-4">
          <div className="h-24 bg-white/5 rounded animate-pulse" />
          <div className="h-24 bg-white/5 rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Archive Info */}
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-dim">Mã hồ sơ:</span>
                <span className="ml-2 text-white font-medium">{archive.archiveCode}</span>
              </div>
              {archive.field && (
                <div>
                  <span className="text-text-dim">Lĩnh vực:</span>
                  <span className="ml-2 text-white">{archive.field}</span>
                </div>
              )}
              {archive.year && (
                <div>
                  <span className="text-text-dim">Năm:</span>
                  <span className="ml-2 text-white">{archive.year}</span>
                </div>
              )}
            </div>
            {archive.description && (
              <p className="mt-3 text-text-dim text-sm">{archive.description}</p>
            )}
          </div>

          {/* Incoming Documents */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Download className="size-4 text-green-400" />
                Văn bản đến ({incomingDocs.length})
              </h3>
              <button 
                onClick={() => handleOpenAddDoc('incoming')}
                className="text-sm text-primary hover:text-primary-hover flex items-center gap-1"
              >
                <Plus className="size-4" />
                Thêm văn bản
              </button>
            </div>
            {incomingDocs.length === 0 ? (
              <p className="text-text-dim text-sm py-4 text-center">Chưa có văn bản đến nào</p>
            ) : (
              <div className="space-y-2">
                {incomingDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg group">
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-green-400" />
                      <div>
                        <p className="text-white font-medium">{doc.incomingNumber}</p>
                        <p className="text-text-dim text-xs">{doc.sender}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveDoc('incoming', doc.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-text-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Documents */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Upload className="size-4 text-blue-400" />
                Văn bản đi ({outgoingDocs.length})
              </h3>
              <button 
                onClick={() => handleOpenAddDoc('outgoing')}
                className="text-sm text-primary hover:text-primary-hover flex items-center gap-1"
              >
                <Plus className="size-4" />
                Thêm văn bản
              </button>
            </div>
            {outgoingDocs.length === 0 ? (
              <p className="text-text-dim text-sm py-4 text-center">Chưa có văn bản đi nào</p>
            ) : (
              <div className="space-y-2">
                {outgoingDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg group">
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-blue-400" />
                      <div>
                        <p className="text-white font-medium">{doc.outgoingNumber}</p>
                        <p className="text-text-dim text-xs">{doc.receiver}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveDoc('outgoing', doc.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-text-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      <AnimatePresence>
        {addDocOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddDocOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div className="bg-card-dark rounded-2xl border border-border-dark p-6 max-w-md w-full shadow-2xl">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Thêm văn bản {addDocType === 'incoming' ? 'đến' : 'đi'}
                </h3>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="input-field w-full mb-4"
                >
                  <option value="">Chọn văn bản</option>
                  {availableDocs.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc[docNumberField]} - {addDocType === 'incoming' ? doc.sender : doc.receiver}
                    </option>
                  ))}
                </select>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAddDocOpen(false)}
                    className="flex-1 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleAddDoc}
                    disabled={!selectedDocId || submitting}
                    className="flex-1 btn-primary py-2 disabled:opacity-50"
                  >
                    {submitting ? 'Đang xử lý...' : 'Thêm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DocumentDrawer>
  );
}

function mapRowToArchive(row: ArchiveRow): Archive {
  return {
    id: row.id,
    archiveCode: row.archive_code,
    archiveName: row.archive_name,
    field: row.field,
    year: row.year,
    description: row.description,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ==========================================
// MinIO File Manager Component
// ==========================================

interface MinioFile {
  key: string;
  originalName: string;
  size: number;
  lastModified: string | Date;
}

function MinioFileManager() {
  const { toast } = useToast();
  const [files, setFiles] = useState<MinioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<MinioFile | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/storage/files');
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      if (result.success) {
        setFiles(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching MinIO files:', error);
      toast('Không thể kết nối đến hệ thống lưu trữ MinIO. Vui lòng kiểm tra cấu hình.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setUploading(true);
    let successCount = 0;
    
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Upload failed');
        }
        successCount++;
      } catch (err: any) {
        console.error(err);
        toast(`Lỗi tải lên tệp ${file.name}: ${err.message}`, 'error');
      }
    }
    
    if (successCount > 0) {
      toast(`Đã tải lên thành công ${successCount} tệp tin`, 'success');
      fetchFiles();
    }
    setUploading(false);
  }, [toast, fetchFiles]);

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/storage/files/${encodeURIComponent(fileToDelete.key)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Delete failed');
      }
      toast('Xóa tệp tin khỏi MinIO thành công', 'success');
      setFileToDelete(null);
      fetchFiles();
    } catch (error: any) {
      toast(`Không thể xóa tệp: ${error.message}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading
  });

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(f => 
    f.originalName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Drag and Drop Zone */}
      <div 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200",
          isDragActive 
            ? "border-primary bg-primary/5 text-primary scale-[1.01]" 
            : "border-white/10 text-text-dim hover:border-primary/50 hover:bg-white/5",
          uploading && "opacity-50 cursor-wait pointer-events-none"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-3">
          {uploading ? (
            <Loader2 className="size-10 text-primary animate-spin" />
          ) : (
            <Upload className={cn("size-10 transition-colors", isDragActive ? "text-primary" : "text-text-dim group-hover:text-primary")} />
          )}
          <div>
            <p className="font-bold text-white text-base">
              {uploading ? "Đang tải tệp tin lên MinIO..." : "Kéo & Thả tệp vào đây, hoặc click để chọn tệp"}
            </p>
            <p className="text-xs text-text-dim mt-1">
              Hỗ trợ tải lên tất cả các loại tài liệu (.pdf, .docx, .xlsx, .png, .jpg...)
            </p>
          </div>
        </div>
      </div>

      {/* Filter and File List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-dim" />
            <input
              type="text"
              placeholder="Tìm kiếm tệp lưu trữ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <div className="text-xs text-text-dim">
            Hiển thị {filteredFiles.length} / {files.length} tệp
          </div>
        </div>

        {loading ? (
          <div className="card p-4 space-y-4 animate-pulse">
            <div className="h-6 bg-white/5 rounded w-1/3" />
            <div className="h-20 bg-white/5 rounded" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
              <File className="size-8 text-text-dim" />
            </div>
            <h4 className="font-bold text-white mb-1">Không tìm thấy tệp tin</h4>
            <p className="text-sm text-text-dim max-w-xs leading-relaxed">
              {search ? "Không tìm thấy tệp nào khớp với từ khóa tìm kiếm của bạn." : "Chưa có tệp tin nào được tải lên kho lưu trữ MinIO."}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-text-dim font-bold">
                    <th className="py-3 px-4">Tên tệp</th>
                    <th className="py-3 px-4 w-28">Kích thước</th>
                    <th className="py-3 px-4 w-44">Ngày tải lên</th>
                    <th className="py-3 px-4 w-24 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  {filteredFiles.map((file) => (
                    <tr key={file.key} className="hover:bg-white/5 transition-colors group">
                      <td className="py-3 px-4 flex items-center gap-3">
                        <FileText className="size-4.5 text-primary shrink-0" />
                        <span 
                          className="truncate font-medium max-w-xs sm:max-w-md md:max-w-xl" 
                          title={file.originalName}
                        >
                          {file.originalName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-dim whitespace-nowrap">
                        {formatBytes(file.size)}
                      </td>
                      <td className="py-3 px-4 text-text-dim whitespace-nowrap">
                        {new Date(file.lastModified).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-1 justify-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                          <a 
                            href={`/api/storage/download/${encodeURIComponent(file.key)}`}
                            download={file.originalName}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-text-dim hover:text-white transition-colors"
                            title="Tải tệp về"
                          >
                            <Download className="size-4" />
                          </a>
                          <button 
                            onClick={() => setFileToDelete(file)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-text-dim hover:text-red-400 transition-colors"
                            title="Xóa tệp"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!fileToDelete}
        onClose={() => setFileToDelete(null)}
        onConfirm={handleDeleteFile}
        title="Xóa tệp tin"
        message={`Bạn có chắc chắn muốn xóa tệp "${fileToDelete?.originalName}" khỏi kho lưu trữ MinIO? Hành động này không thể hoàn tác.`}
        confirmText="Xóa tệp"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

