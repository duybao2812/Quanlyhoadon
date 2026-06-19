import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, Download, FileText, Plus, X, Loader2, Eye, Edit2, ChevronDown, Calendar, Sparkles, Cog, Box, Construction, Share2, Save, Printer, ExternalLink, UploadCloud, Globe, Building, ArrowRight, ArrowLeft, FileCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/Notifications';
import { supabase } from '../../services/supabaseClient';
import { 
  getContractValueStandalone, 
  getContractSignDateStandalone,
  getContractNumberStandalone,
  getProjectNameStandalone,
  getContractNoteStandalone,
  parseValueStandalone,
  formatCurrencyStandalone
} from '../../lib/contractHelpers';

interface Partner {
  id: string;
  name: string;
  taxCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  representative?: string;
}

interface SmartContract {
  id: string;
  templateId: string;
  partyAId: string | null;
  partyBId: string | null;
  formData: Record<string, any>;
  fileName: string;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
  contractType?: 'ocr_pdf' | 'word_docx';
  documentType?: 'incoming' | 'outgoing' | 'contract'; // Phân loại văn bản đến/đi/hợp đồng
}

// Safe string converter
function toString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

// Parse formData (handles both object and JSON string)
function parseFormData(formData: any): Record<string, any> {
  if (!formData) return {};
  if (typeof formData === 'string') {
    try {
      return JSON.parse(formData);
    } catch {
      return {};
    }
  }
  return formData;
}

interface ContractsViewProps {
  ownerId: string;
  partners: Partner[];
  onTabChange?: (tab: 'contract' | 'contract_upload') => void;
  onEditOcr?: (contract: SmartContract) => void;
  onDownload?: (contract: SmartContract) => void;
}

export function ContractsView({ ownerId, partners, onTabChange, onEditOcr, onDownload }: ContractsViewProps) {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<SmartContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'incoming' | 'outgoing' | 'contract'>('all');

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map snake_case từ database sang camelCase cho interface
      const mappedContracts: SmartContract[] = (data || []).map((c: any) => ({
        id: c.id,
        templateId: c.template_id,
        partyAId: c.party_a_id,
        partyBId: c.party_b_id,
        formData: typeof c.form_data === 'string' ? JSON.parse(c.form_data || '{}') : c.form_data,
        fileName: c.file_name,
        ownerId: c.owner_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        contractType: c.contract_type,
        documentType: c.document_type
      }));
      
      setContracts(mappedContracts);
    } catch (error) {
      console.error('Lỗi khi tải hợp đồng:', error);
      toast('Không thể tải danh sách hợp đồng', 'error');
    } finally {
      setLoading(false);
    }
  }, [ownerId, toast]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Get partner name
  const getPartyName = (id: string | null) => {
    if (!id) return 'Chưa cập nhật';
    return partners.find(p => p.id === id)?.name || 'Chưa cập nhật';
  };

  // Get partner info
  const getPartner = (id: string | null): Partner | null => {
    if (!id) return null;
    return partners.find(p => p.id === id) || null;
  };

  // Filter contracts by type and search term
  const filteredContracts = contracts.filter(c => {
    // Filter by document type
    if (filterType !== 'all' && c.documentType !== filterType) return false;
    
    // Search filter
    const search = searchTerm.toLowerCase();
    const formData = parseFormData(c.formData);
    return (
      toString(c.fileName).toLowerCase().includes(search) ||
      toString(c.templateId).toLowerCase().includes(search) ||
      getPartyName(c.partyAId).toLowerCase().includes(search) ||
      getPartyName(c.partyBId).toLowerCase().includes(search) ||
      getProjectNameStandalone(formData).toLowerCase().includes(search) ||
      getContractNumberStandalone(formData).toLowerCase().includes(search)
    );
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredContracts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContracts.map(c => c.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!isDeletingBulk) {
      setIsDeletingBulk(true);
      setTimeout(() => setIsDeletingBulk(false), 3000);
      return;
    }

    try {
      const { error } = await supabase.from('contracts').delete().in('id', selectedIds);
      if (error) throw error;
      toast(`Đã xóa ${selectedIds.length} hợp đồng thành công`, 'success');
      setSelectedIds([]);
      setIsDeletingBulk(false);
      fetchContracts();
    } catch (error: any) {
      toast('Lỗi khi xóa hàng loạt: ' + error.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('contracts').delete().eq('id', id);
      if (error) throw error;
      toast('Đã xóa hợp đồng thành công', 'success');
      fetchContracts();
    } catch (error: any) {
      toast('Lỗi khi xóa: ' + error.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="size-7 text-primary" />
            Hợp đồng
          </h1>
          <p className="text-text-dim text-sm mt-1">
            Quản lý hợp đồng
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onTabChange?.('contract')}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus className="size-4" />
            Tạo từ mẫu DOCX
          </button>
          <button 
            onClick={() => onTabChange?.('contract_upload')}
            className="btn-primary flex items-center gap-2"
          >
            <FileText className="size-4" />
            Nhập từ PDF/Ảnh
          </button>
        </div>
      </div>

      {/* Contract List */}
      <div className="bg-card-dark rounded-[32px] border border-border-dark overflow-hidden shadow-2xl">
        {/* Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 border-b border-border-dark/60">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h2 className="text-lg font-black uppercase text-white tracking-widest flex items-center gap-2">
              DANH SÁCH HỢP ĐỒNG HỆ THỐNG
            </h2>
            <p className="text-[11px] text-text-dim font-semibold italic uppercase tracking-wider opacity-85">
              Hệ thống đang lưu trữ {contracts.length} Hợp đồng
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 shrink-0">
            {/* Document Type Filter */}
            <div className="flex gap-1 bg-black/40 rounded-xl p-1 border border-border-dark">
              {[
                { value: 'all', label: 'Tất cả' },
                { value: 'incoming', label: 'Văn bản đến', color: 'blue' },
                { value: 'outgoing', label: 'Văn bản đi', color: 'green' },
                { value: 'contract', label: 'Hợp đồng', color: 'orange' }
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => setFilterType(type.value as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    filterType === type.value
                      ? type.value === 'all' 
                        ? "bg-primary text-white shadow-lg"
                        : type.value === 'incoming'
                          ? "bg-blue-500 text-white shadow-lg"
                          : type.value === 'outgoing'
                            ? "bg-green-500 text-white shadow-lg"
                            : "bg-orange-500 text-white shadow-lg"
                      : "text-text-dim hover:text-white hover:bg-white/10"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-64">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-black/40 border border-border-dark rounded-xl text-xs focus:outline-none focus:border-primary/50 transition-all font-bold text-white placeholder:text-text-dim/60 shadow-inner"
              />
            </div>

            {/* Bulk Delete */}
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border transition-all shadow-lg shrink-0",
                  isDeletingBulk 
                    ? "bg-red-500 text-white border-red-500 animate-pulse shadow-red-500/20" 
                    : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                )}
              >
                <Trash2 className="size-3.5" />
                {isDeletingBulk ? "Xác nhận xóa" : `Xóa ${selectedIds.length} HĐ`}
              </button>
            )}

            {/* Select All */}
            <label className="flex items-center gap-2.5 cursor-pointer text-text-dim hover:text-white transition-colors group select-none">
              <input
                type="checkbox"
                checked={filteredContracts.length > 0 && selectedIds.length === filteredContracts.length}
                onChange={toggleSelectAll}
                className="size-5 rounded bg-sidebar-dark border-border-dark text-primary focus:ring-primary cursor-pointer accent-primary"
              />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">CHỌN TẤT CẢ</span>
            </label>
          </div>
        </div>

        {/* Contract List */}
        <div className="divide-y divide-border-dark">
          {filteredContracts.length === 0 ? (
            <div className="p-32 text-center">
              <div className="size-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-border-dark shadow-2xl">
                <FileText className="size-10 text-text-dim" />
              </div>
              <h3 className="text-white font-black mb-2 uppercase text-base tracking-widest">Không có dữ liệu</h3>
              <p className="text-text-dim text-xs font-bold italic">Tạo hợp đồng mới để bắt đầu lưu trữ.</p>
            </div>
          ) : (
            filteredContracts.map((contract) => (
              <ContractListItem
                key={contract.id}
                contract={contract}
                partners={partners}
                ownerId={ownerId}
                isSelected={selectedIds.includes(contract.id)}
                toggleSelect={() => toggleSelect(contract.id)}
                isExpanded={expandedId === contract.id}
                toggleExpand={() => setExpandedId(expandedId === contract.id ? null : contract.id)}
                onDelete={() => handleDelete(contract.id)}
                onEditOcr={onEditOcr}
                onDownload={onDownload}
                getPartyName={getPartyName}
                getPartner={getPartner}
                onRefresh={fetchContracts}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Contract List Item Component
interface ContractListItemProps {
  contract: SmartContract;
  partners: Partner[];
  ownerId: string;
  isSelected: boolean;
  toggleSelect: () => void;
  isExpanded: boolean;
  toggleExpand: () => void;
  onDelete: () => void;
  onEditOcr?: (contract: SmartContract) => void;
  onDownload?: (contract: SmartContract) => void;
  getPartyName: (id: string | null) => string;
  getPartner: (id: string | null) => Partner | null;
  onRefresh?: () => void;
}

function ContractListItem({
  contract,
  partners,
  ownerId,
  isSelected,
  toggleSelect,
  isExpanded,
  toggleExpand,
  onDelete,
  onEditOcr,
  onDownload,
  getPartyName,
  getPartner,
  onRefresh
}: ContractListItemProps) {
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isChangingType, setIsChangingType] = useState(false);
  const [localDocType, setLocalDocType] = useState(contract.documentType || 'contract');

  // Parse formData
  const formData = parseFormData(contract.formData);
  
  // Extract contract info
  const contractValue = getContractValueStandalone(formData);
  const contractNumber = getContractNumberStandalone(formData);
  const signDate = getContractSignDateStandalone(formData, contract.createdAt);
  const projectName = getProjectNameStandalone(formData);
  const contractNote = getContractNoteStandalone(formData);
  
  // Get partner info
  const partnerA = getPartner(contract.partyAId) || {
    name: formData?.partyA?.name || formData?.BENA || 'Chưa cập nhật',
    address: formData?.partyA?.address || '---',
    taxCode: formData?.partyA?.taxCode || '---',
    representative: formData?.partyA?.representative || '---'
  };
  const partnerB = getPartner(contract.partyBId) || {
    name: formData?.partyB?.name || formData?.BENB || 'Chưa cập nhật',
    address: formData?.partyB?.address || '---',
    taxCode: formData?.partyB?.taxCode || '---',
    representative: formData?.partyB?.representative || '---'
  };

  // Safe date formatting
  const createdDate = (() => {
    try {
      if (contract.createdAt?.toDate) return contract.createdAt.toDate().toLocaleDateString('vi-VN');
      return new Date(contract.createdAt).toLocaleDateString('vi-VN');
    } catch {
      return '---';
    }
  })();

  // Get document type badge
  const getDocTypeBadge = () => {
    const type = contract.documentType || 'contract';
    if (type === 'incoming') {
      return (
        <span className="text-[9px] font-black bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-lg uppercase tracking-wider whitespace-nowrap">
          Văn bản đến
        </span>
      );
    } else if (type === 'outgoing') {
      return (
        <span className="text-[9px] font-black bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-lg uppercase tracking-wider whitespace-nowrap">
          Văn bản đi
        </span>
      );
    } else {
      return (
        <span className="text-[9px] font-black bg-orange-500/20 border border-orange-500/30 text-orange-400 px-2 py-0.5 rounded-lg uppercase tracking-wider whitespace-nowrap">
          Hợp đồng
        </span>
      );
    }
  };

  // Get template tag
  const getTemplateTag = () => {
    const templateId = contract.templateId;
    if (templateId === 'HDCM') {
      return (
        <span className="text-[9px] font-black bg-orange-500/20 border border-orange-500/30 text-orange-400 px-2 py-0.5 rounded-lg uppercase tracking-wider whitespace-nowrap">
          HĐ Ca Máy
        </span>
      );
    } else if (templateId === 'HDTC') {
      return (
        <span className="text-[9px] font-black bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-lg uppercase tracking-wider whitespace-nowrap">
          HĐ Thi Công
        </span>
      );
    } else {
      return (
        <span className="text-[9px] font-black bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-lg uppercase tracking-wider whitespace-nowrap">
          HĐ Vật Tư
        </span>
      );
    }
  };

  // Get contract icon
  const getContractIcon = () => {
    const templateId = contract.templateId;
    const isAi = contract.contractType === 'ocr_pdf';
    
    if (templateId === 'HDCM') {
      return (
        <div className="relative size-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0 shadow-inner">
          <FileText className="size-6" />
          <div className={cn(
            "absolute -bottom-1 -right-1 bg-[#1e1e24] size-5 rounded-full border border-orange-500/30 flex items-center justify-center shadow-md",
            isAi && "animate-pulse"
          )}>
            {isAi ? <Sparkles className="size-3 text-orange-400" /> : <Cog className="size-3 text-orange-400" />}
          </div>
        </div>
      );
    } else if (templateId === 'HDTC') {
      return (
        <div className="relative size-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
          <FileText className="size-6" />
          <div className={cn(
            "absolute -bottom-1 -right-1 bg-[#1e1e24] size-5 rounded-full border border-blue-500/30 flex items-center justify-center shadow-md",
            isAi && "animate-pulse"
          )}>
            {isAi ? <Sparkles className="size-3 text-blue-400" /> : <Construction className="size-3 text-blue-400" />}
          </div>
        </div>
      );
    } else {
      return (
        <div className="relative size-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
          <FileText className="size-6" />
          <div className={cn(
            "absolute -bottom-1 -right-1 bg-[#1e1e24] size-5 rounded-full border border-emerald-500/30 flex items-center justify-center shadow-md",
            isAi && "animate-pulse"
          )}>
            {isAi ? <Sparkles className="size-3 text-emerald-400" /> : <Box className="size-3 text-emerald-400" />}
          </div>
        </div>
      );
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  const handleChangeDocType = async (newType: 'incoming' | 'outgoing' | 'contract') => {
    setIsChangingType(true);
    try {
      console.log('[ContractsView] Updating document_type to:', newType, 'for contract:', contract.id);
      
      const response = await fetch(`/api/contracts/${contract.id}/document-type`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-custom-user-id': ownerId
        },
        body: JSON.stringify({ documentType: newType })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to update');
      }

      setLocalDocType(newType);
      toast(`Đã chuyển sang: ${newType === 'incoming' ? 'Văn bản đến' : newType === 'outgoing' ? 'Văn bản đi' : 'Hợp đồng'}`, 'success');

      // Refresh parent list
      onRefresh?.();
    } catch (error: any) {
      console.error('[ContractsView] Error updating document_type:', error);
      toast('Lỗi khi cập nhật: ' + error.message, 'error');
    } finally {
      setIsChangingType(false);
    }
  };

  return (
    <div className={cn(
      "w-full bg-[#18181B] border border-border-dark/60 rounded-[24px] mx-4 my-3 transition-all duration-300 shadow-lg relative overflow-hidden cursor-pointer",
      isSelected ? "ring-2 ring-primary/20 bg-primary/5" : "hover:border-border-dark/80"
    )}>
      <div 
        className="p-6"
        onClick={(e) => {
          if (contract.contractType === 'ocr_pdf') {
            onEditOcr?.(contract);
          } else {
            toggleExpand();
          }
        }}
      >
        <div className="flex items-center gap-6">
          {/* Checkbox */}
          <div className="w-8 shrink-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={toggleSelect}
              className="size-5 rounded bg-sidebar-dark border-border-dark text-primary focus:ring-primary cursor-pointer accent-primary"
            />
          </div>

          {/* Contract Name & Details */}
          <div className="flex-[1.5] min-w-[180px] flex items-center gap-4">
            {getContractIcon()}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-white whitespace-normal break-words leading-tight hover:text-primary transition-colors">
                {contract.fileName}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[10px] text-text-dim font-bold whitespace-nowrap">ID: {contract.id.slice(-6).toUpperCase()}</span>
                {getDocTypeBadge()}
                {getTemplateTag()}
                {contract.contractType === 'ocr_pdf' && (
                  <span className="text-[9px] font-black bg-purple-500/20 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded-lg uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
                    <Sparkles className="size-2.5 text-purple-400 animate-pulse" />
                    Hồ sơ AI
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Partners */}
          <div className="flex-[1.2] min-w-[150px] space-y-2">
            <div className="flex items-start gap-2 text-xs font-semibold">
              <Building className="size-4 text-text-dim/60 shrink-0 mt-0.5" />
              <div className="flex flex-col min-w-0">
                <span className="text-text-dim/80 text-[10px] leading-none mb-0.5">Bên A</span>
                <span className="font-bold text-orange-400 whitespace-normal break-words leading-tight" title={partnerA.name}>
                  {partnerA.name}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs font-semibold">
              <Building className="size-4 text-text-dim/60 shrink-0 mt-0.5" />
              <div className="flex flex-col min-w-0">
                <span className="text-text-dim/80 text-[10px] leading-none mb-0.5">Bên B</span>
                <span className="font-bold text-amber-500/90 whitespace-normal break-words leading-tight" title={partnerB.name}>
                  {partnerB.name}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex-[2] min-w-[220px]">
            <div className="bg-[#202024] border border-border-dark/60 rounded-xl p-3 flex flex-col justify-center min-h-[72px] text-xs font-semibold leading-relaxed shadow-inner">
              {isExpanded ? (
                <div className="space-y-0.5">
                  <div className="text-text-dim whitespace-normal break-words leading-tight" title={projectName}>
                    <span>Tên công trình:</span> <span className="font-bold text-white">{projectName || '---'}</span>
                  </div>
                  <div className="text-text-dim flex items-center gap-1.5">
                    <span>Giá trị HĐ:</span>
                    <span className="font-bold text-[#FF7A00]">{contractValue || '---'}</span>
                  </div>
                  <div className="text-text-dim flex items-center gap-1.5">
                    <span>Số hợp đồng:</span>
                    <span className="font-bold text-white whitespace-normal break-all">{contractNumber || '---'}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="text-text-dim whitespace-normal break-words leading-tight" title={projectName}>
                    <span>Tên công trình:</span> <span className="font-bold text-white">{projectName || '---'}</span>
                  </div>
                  <div className="text-text-dim flex items-center gap-1.5">
                    <span>Giá trị:</span> <span className="font-bold text-[#FF7A00]">{contractValue || '---'}</span>
                  </div>
                  <div className="text-text-dim flex items-center gap-1.5">
                    <span>Số hợp đồng:</span> <span className="font-bold text-white whitespace-normal break-all">{contractNumber || '---'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Created Date */}
          <div className="w-28 shrink-0 flex items-center gap-2 text-xs text-text-dim font-bold pl-2 whitespace-nowrap">
            <Calendar className="size-4 opacity-50 text-orange-400" />
            <span>{createdDate}</span>
          </div>

          {/* Actions */}
          <div className="w-10 shrink-0 flex items-center justify-end" onClick={e => e.stopPropagation()}>
            <button
              onClick={toggleExpand}
              className="p-2.5 text-text-dim hover:text-white hover:bg-white/5 rounded-xl border border-transparent hover:border-border-dark/60 transition-all duration-300"
              title={isExpanded ? "Thu gọn" : "Mở rộng chi tiết"}
            >
              <ChevronDown className={cn(
                "size-5 transition-transform duration-300",
                isExpanded && "rotate-180 text-primary"
              )} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="px-6 pb-5 mx-6 mb-3">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-red-400">Xác nhận xóa hợp đồng này?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-6 pb-6 mx-4 space-y-4">
          {/* Document Type Selector */}
          <div className="bg-[#202024] border border-border-dark/60 rounded-xl p-4">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-wider mb-3">Phân loại văn bản</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleChangeDocType('incoming')}
                disabled={isChangingType}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
                  localDocType === 'incoming'
                    ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
                )}
              >
                <ArrowLeft className="size-3.5" />
                Văn bản đến
              </button>
              <button
                onClick={() => handleChangeDocType('outgoing')}
                disabled={isChangingType}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
                  localDocType === 'outgoing'
                    ? "bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20"
                    : "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20"
                )}
              >
                <ArrowRight className="size-3.5" />
                Văn bản đi
              </button>
              <button
                onClick={() => handleChangeDocType('contract')}
                disabled={isChangingType}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
                  localDocType === 'contract'
                    ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20"
                    : "bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20"
                )}
              >
                <FileCheck className="size-3.5" />
                Hợp đồng
              </button>
            </div>
            <p className="text-[10px] text-text-dim mt-2">
              Chọn loại văn bản phù hợp để sắp xếp vào đúng danh mục trong tab Văn bản đến/đi.
            </p>
          </div>

          {/* Contract Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-[#202024] border border-border-dark/60 rounded-xl p-4">
              <h4 className="text-[10px] font-black text-primary uppercase tracking-wider mb-2">Thông tin hợp đồng</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-dim">Số HĐ:</span>
                  <span className="font-bold text-white">{contractNumber || '---'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dim">Ngày ký:</span>
                  <span className="font-bold text-white">{formData?.contractDate || '---'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dim">Ngày hiệu lực:</span>
                  <span className="font-bold text-white">{formData?.effectiveDate || '---'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dim">Ngày hết hạn:</span>
                  <span className="font-bold text-white">{formData?.expiredDate || '---'}</span>
                </div>
              </div>
            </div>

            {/* Project Info */}
            <div className="bg-[#202024] border border-border-dark/60 rounded-xl p-4">
              <h4 className="text-[10px] font-black text-primary uppercase tracking-wider mb-2">Dự án / Công trình</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-dim">Tên:</span>
                  <span className="font-bold text-white">{projectName || '---'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dim">Địa chỉ:</span>
                  <span className="font-bold text-white">{formData?.projectAddress || '---'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dim">Bắt đầu:</span>
                  <span className="font-bold text-white">{formData?.startDate || '---'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dim">Kết thúc:</span>
                  <span className="font-bold text-white">{formData?.endDate || '---'}</span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-[#202024] border border-border-dark/60 rounded-xl p-4">
              <h4 className="text-[10px] font-black text-primary uppercase tracking-wider mb-2">Thanh toán</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-dim">Phương thức:</span>
                  <span className="font-bold text-white">{formData?.paymentMethod || '---'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dim">Điều khoản:</span>
                  <span className="font-bold text-white">{formData?.paymentTerm || '---'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dim">Thuế VAT:</span>
                  <span className="font-bold text-white">{formData?.vatRate ? `${formData.vatRate}%` : '---'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dim">Giá trị bằng chữ:</span>
                  <span className="font-bold text-white text-[10px]">{formData?.valueInWords || '---'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bảng giá trị hợp đồng / Tạm ứng thanh toán */}
          {formData?.values && formData.values.length > 0 && (
            <div className="bg-[#202024] border border-border-dark/60 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border-dark/60 bg-orange-500/5">
                <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="size-3.5" />
                  Bảng giá trị hợp đồng / Tạm ứng thanh toán
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-dark/60">
                      <th className="px-4 py-2 text-left text-[10px] font-black text-text-dim uppercase tracking-wider">Loại giá trị</th>
                      <th className="px-4 py-2 text-right text-[10px] font-black text-text-dim uppercase tracking-wider">Số tiền (VND)</th>
                      <th className="px-4 py-2 text-left text-[10px] font-black text-text-dim uppercase tracking-wider">Mô tả / Điều khoản</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark/40">
                    {/* Dòng giá trị hợp đồng chính */}
                    <tr className="bg-orange-500/5">
                      <td className="px-4 py-2 font-bold text-orange-400">Giá trị hợp đồng</td>
                      <td className="px-4 py-2 text-right font-bold text-amber-300">
                        {formData.value ? parseValueStandalone(formData.value) : '---'}
                      </td>
                      <td className="px-4 py-2 text-text-dim text-[10px] italic">{formData.valueInWords || '---'}</td>
                    </tr>
                    {/* Các dòng giá trị phụ (tạm ứng, bảo hành, etc.) */}
                    {formData.values.map((val: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 text-white">{val.type || '---'}</td>
                        <td className="px-4 py-2 text-right text-amber-300">
                          {val.value ? parseValueStandalone(val.value) : '---'}
                        </td>
                        <td className="px-4 py-2 text-text-dim text-[10px]">{val.description || '---'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bảng danh sách hàng hóa / Vật tư */}
          {formData?.items && formData.items.length > 0 && (
            <div className="bg-[#202024] border border-border-dark/60 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border-dark/60 bg-emerald-500/5">
                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Box className="size-3.5" />
                  Danh sách hàng hóa / Vật tư
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-dark/60">
                      {Object.keys(formData.items[0] || {}).map((header) => (
                        <th key={header} className="px-4 py-2 text-left text-[10px] font-black text-text-dim uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark/40">
                    {formData.items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        {Object.values(item).map((val: any, cidx: number) => {
                          const isMoney = Object.keys(item)[cidx]?.toLowerCase().match(/đơn giá|thành tiền|giá|vat|thuế/);
                          return (
                            <td key={cidx} className={cn("px-4 py-2", isMoney ? "text-right text-amber-300" : "text-white")}>
                              {isMoney && val ? parseValueStandalone(val) : (val || '---')}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {contractNote && (
            <div className="bg-[#202024] border border-border-dark/60 rounded-xl p-4">
              <h4 className="text-[10px] font-black text-primary uppercase tracking-wider mb-2">Ghi chú</h4>
              <p className="text-xs text-text-dim">{contractNote}</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => onEditOcr?.(contract)}
              className="px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl text-[10px] font-bold text-primary flex items-center gap-1.5 transition-all"
            >
              <Edit2 className="size-3" />
              Chỉnh sửa
            </button>
            <button
              onClick={() => onDownload?.(contract)}
              className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 transition-all"
            >
              <Download className="size-3" />
              Tải xuống
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
