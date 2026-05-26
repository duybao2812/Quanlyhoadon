import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Upload,
  Users,
  FileText,
  Files,
  Search,
  Filter,
  Plus,
  Download,
  MoreVertical,
  AlertCircle,
  Clock,
  Cpu,
  Globe,
  Zap,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Trash2,
  Edit2,
  HardHat,
  Box,
  Construction,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Printer,
  Share2,
  Cog,
  Layout,
  PlusSquare,
  List,
  Code,
  Check,
  X,
  ArrowRight,
  MapPin,
  Settings2,
  ShieldCheck,
  Calendar,
  Database,
  Library,
  Briefcase,
  DollarSign,
  PenTool,
  Info,
  Layers,
  ShoppingBag,
  ExternalLink,
  Building2,
  UserSquare2,
  Sparkles,
  FileCode,
  FileQuestion,
  CreditCard,
  UserCheck,
  Hash,
  History,
  User as UserIcon,
  Edit3,
  Fingerprint,
  Building,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import imageCompression from 'browser-image-compression';
import * as XLSX from 'xlsx';
import { handleFirestoreError, OperationType, auth } from './lib/firebase';
import { supabase, setCustomUserId } from './services/supabaseClient';
import { extractFromInvoice } from './lib/mistral';
import { parseInvoiceXml } from './lib/xmlParser';
import { generateDocxBlob, extractTags } from './lib/docxGenerator';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { smartConvertAddress } from './lib/addressConverter';
import { cn, formatVNNumber } from './lib/utils';
import { useToast } from './components/Notifications';
import { loadTemplates, saveTemplate, deleteStoredTemplate, StoredTemplate } from './lib/storage';
import { AIChatBox } from './components/AIChatBox';
import { InvoiceItemComp } from './components/Invoice/InvoiceItemComp';
import { InvoiceResponsiveCard } from './components/Invoice/InvoiceResponsiveCard';
import { InvoiceItem as MappedInvoiceItem } from './types/invoiceData';
import { DashboardInvoiceList } from './components/Dashboard/DashboardInvoiceList';
import { ExtendedInvoiceItem } from './components/Dashboard/demoData';
import { SystemMonitorView } from './components/SystemMonitorView';


// --- Types ---
type Tab = 'dashboard' | 'upload' | 'partners' | 'docs' | 'contract' | 'system';

interface Partner {
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

interface Invoice {
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
  totalAmount?: number | string;
  extractedData?: any;
  lineItems?: any[];
  createdAt: any;
}

interface GeneratedDoc {
  id: string;
  invoiceId: string;
  templateType: string;
  fileName: string;
  downloadUrl?: string;
  createdAt: any;
}

interface SmartContract {
  id: string;
  templateId: string;
  partyAId: string;
  partyBId: string;
  formData: Record<string, string>;
  fileName: string;
  ownerId: string;
  createdAt: any;
}

// --- Components ---

import {
  formatThousands,
  numberToVietnameseWords
} from './lib/contractUtils';

const Sidebar = ({
  activeTab,
  setActiveTab,
  user,
  isPinned,
  setIsPinned
}: {
  activeTab: Tab,
  setActiveTab: (t: Tab) => void,
  user: User | null,
  isPinned: boolean,
  setIsPinned: (v: boolean) => void
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const isExpanded = isPinned || isHovered;

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        if (!isPinned && isHovered) {
          setIsHovered(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPinned, isHovered]);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Bảng điều khiển' },
    { id: 'upload', icon: UploadCloud, label: 'Tải lên hóa đơn' },
    { id: 'partners', icon: Users, label: 'Đối tác' },
    { id: 'contract', icon: PlusSquare, label: 'Tạo hợp đồng' },
    { id: 'docs', icon: Files, label: 'Tài liệu đã tạo' },
    { id: 'system', icon: Database, label: 'Theo dõi hệ thống' },
  ];

  const { toast } = useToast();

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    // Force standard login flow
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      console.log("Starting Google login...");
      await signInWithRedirect(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      toast(`Lỗi đăng nhập: ${error.message}`, "error");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <motion.aside
      ref={sidebarRef}
      animate={{ width: isExpanded ? 256 : 80 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onMouseEnter={() => !isPinned && setIsHovered(true)}
      onMouseLeave={() => !isPinned && setIsHovered(false)}
      className="bg-sidebar-dark text-text-dim flex flex-col h-full shrink-0 relative z-50 shadow-2xl transition-width duration-150 border-r border-border-dark"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsPinned(!isPinned);
        }}
        className="absolute -right-3 top-20 size-6 bg-primary text-white rounded-full flex items-center justify-center shadow-lg z-10 hover:bg-primary-hover transition-colors"
      >
        {isPinned ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
      </button>

      <div className={cn(
        "border-b border-border-dark flex items-center transition-all duration-300",
        !isExpanded ? "p-4 justify-center" : "p-6 justify-between"
      )}>
        <div className="flex items-center gap-3 overflow-hidden shrink-0">
          <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black text-xl shadow-inner border border-primary/20 shrink-0 aspect-square">AX</div>
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-black text-white tracking-tighter text-xl whitespace-nowrap"
            >
              DocuForge AI
            </motion.span>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => (
          <div key={item.id} className="relative group/item">
            <button
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                "sidebar-link w-full flex items-center transition-all duration-200 relative",
                !isExpanded ? "justify-center p-3" : "justify-start p-3",
                activeTab === item.id && "sidebar-link-active"
              )}
            >
              <item.icon className={cn("size-5 shrink-0 transition-transform", activeTab === item.id && "scale-110")} />
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="ml-3 font-bold text-base whitespace-nowrap tracking-tight"
                >
                  {item.label}
                </motion.span>
              )}
            </button>

            {/* Tooltip when collapsed */}
            {!isExpanded && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-card-dark text-white text-xs font-black rounded-xl shadow-2xl opacity-0 group-hover/item:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/item:translate-x-0 z-[100] whitespace-nowrap border border-border-dark uppercase tracking-widest">
                {item.label}
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 size-2 bg-card-dark rotate-45 border-l border-b border-border-dark" />
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className={cn(
        "border-t border-border-dark transition-all duration-300",
        !isExpanded ? "p-2 flex flex-col items-center" : "p-4"
      )}>
        {user ? (
          <div className={cn(
            "flex items-center gap-3 mb-4 rounded-2xl bg-white/5 transition-all duration-300",
            !isExpanded ? "flex-col p-1" : "flex-row p-2"
          )}>
            <div className="relative group/avatar">
              <img
                src={user.photoURL || ''}
                alt=""
                className="size-10 rounded-xl border border-border-dark hover:border-primary transition-all cursor-pointer shadow-lg shrink-0 object-cover aspect-square"
                referrerPolicy="no-referrer"
              />
              {!isExpanded && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-sidebar-dark text-white text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover/avatar:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/avatar:translate-x-0 z-[100] whitespace-nowrap border border-border-dark">
                  {user.displayName}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 size-2 bg-sidebar-dark rotate-45 border-l border-b border-border-dark" />
                </div>
              )}
            </div>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 min-w-0"
              >
                <div className="text-xs font-bold text-white truncate">{user.displayName}</div>
                <button onClick={handleLogout} className="text-[10px] text-text-dim hover:text-red-400 font-bold uppercase transition-colors">Đăng xuất</button>
              </motion.div>
            )}
            {!isExpanded && (
              <button onClick={handleLogout} className="p-2 hover:text-red-400 text-text-dim transition-colors" title="Đăng xuất">
                <X className="size-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative group/login">
            <button
              onClick={handleLogin}
              className={cn(
                "w-full bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20 transition-all mb-4 flex items-center justify-center shadow-lg active:scale-95",
                !isExpanded ? "p-3" : "py-3 px-4"
              )}
            >
              <Users className="size-5 shrink-0" />
              {isExpanded && <span className="ml-2">Đăng nhập</span>}
            </button>
            {!isExpanded && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-sidebar-dark text-white text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover/login:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/login:translate-x-0 z-[100] whitespace-nowrap border border-border-dark">
                Đăng nhập Google
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 size-2 bg-sidebar-dark rotate-45 border-l border-b border-border-dark" />
              </div>
            )}
          </div>
        )}

        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2"
          >
            <div className="text-[10px] text-text-dim uppercase font-bold mb-2 tracking-widest px-1">Hệ thống</div>
            <div className="flex items-center gap-2 text-xs text-white bg-sidebar-dark p-2 rounded-lg border border-border-dark">
              <div className={cn("size-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]", user ? "bg-green-500" : "bg-yellow-500")}></div>
              <span>{user ? "AI: Sẵn sàng" : "Đang chờ user"}</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.aside>
  );
};

// --- Helper Components ---
interface InvoiceItemProps {
  inv: any;
  onSelectInvoice: (i: any) => void;
  onDeleteInvoice: (id: string) => void;
  displayName?: string;
  displayDate?: string;
}

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr || dateStr === '---' || dateStr === '') return '---';

  // Clean string
  let cleanStr = dateStr.trim().replace(/\./g, '-').replace(/\//g, '-');

  // Handing common Vietnamese OCR formats like "Ngày 20 tháng 12 năm 2023"
  if (cleanStr.toLowerCase().includes('ngày') || cleanStr.toLowerCase().includes('tháng')) {
    const numbers = cleanStr.match(/\d+/g);
    if (numbers && numbers.length >= 3) {
      const d = numbers[0].padStart(2, '0');
      const m = numbers[1].padStart(2, '0');
      const y = numbers[2].length === 2 ? `20${numbers[2]}` : numbers[2];
      return `${d}-${m}-${y}`;
    }
  }

  // Pattern YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    const [y, m, d] = cleanStr.split('-');
    return `${d}-${m}-${y}`;
  }

  // Pattern DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(cleanStr)) {
    const [d, m, y] = cleanStr.split('-');
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }

  // Try native parse for other ISO formats
  const d = new Date(cleanStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return cleanStr;
};

const parseInvoiceDate = (dateStr: string) => {
  if (!dateStr) return 0;
  let cleanStr = dateStr.trim().replace(/\./g, '-').replace(/\//g, '-');

  if (cleanStr.toLowerCase().includes('ngày') || cleanStr.toLowerCase().includes('tháng')) {
    const numbers = cleanStr.match(/\d+/g);
    if (numbers && numbers.length >= 3) {
      const d = numbers[0].padStart(2, '0');
      const m = numbers[1].padStart(2, '0');
      const y = numbers[2].length === 2 ? `20${numbers[2]}` : numbers[2];
      cleanStr = `${y}-${m}-${d}`;
    }
  } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(cleanStr)) {
    const [d, m, y] = cleanStr.split('-');
    cleanStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const d = new Date(cleanStr);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

const getEnrichedInvoice = (inv: any, rankMap: Map<string, number>) => {
  const rank = rankMap.get(inv.id);
  let invoiceNumber = inv.extractedData?.invoice?.number || inv.extractedData?.soHoaDon || '';
  let invoiceSymbol = inv.extractedData?.invoice?.serial || inv.extractedData?.kyHieuHoaDon || '';

  if (!invoiceNumber) {
    const match = inv.fileName?.match(/(\d+)(?=\.(pdf|xml)$)/i);
    if (match && match[1]) {
      invoiceNumber = match[1];
    }
  }
  const displayInvoiceNumber = invoiceNumber ? (invoiceNumber.toString().replace(/^0+/, '') || invoiceNumber.toString()) : '';
  const displaySymbol = invoiceSymbol ? `${invoiceSymbol}-` : '';

  let displayName = inv.fileName || '';
  if (rank && displayInvoiceNumber) {
    displayName = `${rank}. Hóa đơn số: ${displaySymbol}${displayInvoiceNumber}`;
  } else if (displayInvoiceNumber) {
    displayName = `Hóa đơn số: ${displaySymbol}${displayInvoiceNumber}`;
  }

  // Auto-extract contract details from line items if not already present in the database
  let extractedContractNumber = inv.contractNumber || '';
  let extractedContractDate = inv.contractDate || '';

  if (!extractedContractNumber || !extractedContractDate) {
    const lineItems = inv.extractedData?.items || [];
    const fullText = lineItems.map((item: any) => item.description || item.name || '').join(' ');

    if (!extractedContractNumber) {
      const numMatch = fullText.match(/(?:Hợp\s*đồng|HĐ)(?:\s*Số)?\s*:?\s*([^\s,;]+)/i);
      if (numMatch && numMatch[1]) {
        extractedContractNumber = numMatch[1].trim();
        if (extractedContractNumber.endsWith('.')) {
          extractedContractNumber = extractedContractNumber.slice(0, -1);
        }
      }
    }

    if (!extractedContractDate) {
      const dateMatch = fullText.match(/ngày\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i);
      if (dateMatch && dateMatch[1]) {
        extractedContractDate = dateMatch[1].trim();
      }
    }
  }

  return {
    ...inv,
    computedRank: rank,
    computedInvoiceNumber: displayInvoiceNumber,
    computedInvoiceSymbol: invoiceSymbol,
    computedDisplayName: displayName,
    contractNumber: extractedContractNumber,
    contractDate: extractedContractDate
  };
};

// --- Helper Components ---
const Skeleton = (props: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={cn("animate-pulse bg-white/5 rounded-xl", props.className)} />
);

const ReviewModal = ({
  data,
  onClose,
  onSave
}: {
  data: any,
  onClose: () => void,
  onSave: (updated: any) => void
}) => {
  const [edited, setEdited] = useState(data);

  const { clearToasts } = useToast();

  // Dọn dẹp thông báo xử lý khi modal hiện ra
  useEffect(() => {
    clearToasts();
  }, [clearToasts]);

  const handleChange = (path: string, value: any) => {
    const keys = path.split('.');
    const next = { ...edited };
    let current = next;
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setEdited(next);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-dark/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-card-dark rounded-[32px] border border-border-dark shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-8 border-b border-border-dark flex justify-between items-center bg-white/5">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Kiểm tra kết quả bóc tách</h2>
            <p className="text-text-dim text-xs font-bold uppercase tracking-widest mt-1">Vui lòng rà soát lại thông tin trước khi lưu vào hệ thống</p>
          </div>
          <button onClick={onClose} className="size-12 flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-white rounded-2xl transition-all group">
            <X className="size-6 group-hover:text-red-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {/* Thông tin hóa đơn */}
          <section className="space-y-8">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-border-dark">
              <div className="flex items-center gap-3 text-primary">
                <FileText className="size-6" />
                <h3 className="text-base font-black uppercase tracking-[0.2em]">Thông tin Hóa đơn</h3>
              </div>
              <div className="flex items-center gap-3 bg-primary/10 px-6 py-2.5 rounded-2xl border border-primary/20 shadow-lg shadow-primary/5">
                <Box className="size-4 text-primary" />
                <span className="text-xs font-black text-primary uppercase tracking-widest">
                  Phân loại: {(() => {
                    const raw = edited.classification;
                    const type = typeof raw === 'object' ? raw.type : (raw || 'BB_VT');
                    switch (type) {
                      case 'BB_VT': return 'Vật tư';
                      case 'BB_CM': return 'Ca máy';
                      case 'BB_TC': return 'Thi công';
                      default: return type;
                    }
                  })()}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Số Hóa Đơn</label>
                <input
                  type="text"
                  value={edited.invoice?.number || ''}
                  onChange={(e) => handleChange('invoice.number', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Ký hiệu</label>
                <input
                  type="text"
                  value={edited.invoice?.serial || ''}
                  onChange={(e) => handleChange('invoice.serial', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Ngày lập</label>
                <input
                  type="text"
                  value={edited.invoice?.date || ''}
                  onChange={(e) => handleChange('invoice.date', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">% Thuế GTGT</label>
                <div className="relative">
                  <input
                    type="number"
                    value={edited.invoice?.vatRate || 8}
                    onChange={(e) => handleChange('invoice.vatRate', parseFloat(e.target.value))}
                    className="input-field pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-black">%</span>
                </div>
              </div>
            </div>
          </section>

          {/* Người bán & Người mua */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <section className="space-y-6">
              <div className="flex items-center gap-3 text-indigo-600">
                <Layout className="size-6" />
                <h3 className="font-black text-base uppercase tracking-widest">Đơn vị bán hàng</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Tên đơn vị</label>
                  <input
                    type="text"
                    value={edited.seller?.name || ''}
                    onChange={(e) => handleChange('seller.name', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Mã số thuế</label>
                  <input
                    type="text"
                    value={edited.seller?.taxCode || ''}
                    onChange={(e) => handleChange('seller.taxCode', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Địa chỉ</label>
                  <input
                    type="text"
                    value={edited.seller?.address || ''}
                    onChange={(e) => handleChange('seller.address', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Số tài khoản</label>
                    <input
                      type="text"
                      value={edited.seller?.accountNumber || ''}
                      onChange={(e) => handleChange('seller.accountNumber', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Ngân hàng</label>
                    <input
                      type="text"
                      value={edited.seller?.bankName || ''}
                      onChange={(e) => handleChange('seller.bankName', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3 text-emerald-500">
                <Users className="size-6" />
                <h3 className="text-base font-black uppercase tracking-[0.2em]">Khách hàng</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Tên đơn vị</label>
                  <input
                    type="text"
                    value={edited.buyer?.name || ''}
                    onChange={(e) => handleChange('buyer.name', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Mã số thuế</label>
                  <input
                    type="text"
                    value={edited.buyer?.taxCode || ''}
                    onChange={(e) => handleChange('buyer.taxCode', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Địa chỉ</label>
                  <input
                    type="text"
                    value={edited.buyer?.address || ''}
                    onChange={(e) => handleChange('buyer.address', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Số tài khoản</label>
                    <input
                      type="text"
                      value={edited.buyer?.accountNumber || ''}
                      onChange={(e) => handleChange('buyer.accountNumber', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Ngân hàng</label>
                    <input
                      type="text"
                      value={edited.buyer?.bankName || ''}
                      onChange={(e) => handleChange('buyer.bankName', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Danh sách hàng hóa */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-primary mb-2">
                <Package className="size-6" />
                <h3 className="font-black text-base uppercase tracking-[0.2em]">Chi tiết hàng hóa / dịch vụ</h3>
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-border-dark">
                <Box className="size-4 text-primary" />
                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">
                  Phân loại: <span className="text-primary ml-1">{(() => {
                    const raw = edited.classification;
                    const type = typeof raw === 'object' ? raw.type : (raw || 'BB_VT');
                    switch (type) {
                      case 'BB_VT': return 'Vật tư';
                      case 'BB_CM': return 'Ca máy';
                      case 'BB_TC': return 'Thi công';
                      default: return type;
                    }
                  })()}</span>
                </span>
              </div>
            </div>
            <div className="border border-border-dark rounded-[24px] overflow-hidden shadow-2xl bg-sidebar-dark">
              <table className="w-full text-base">
                <thead className="bg-white/5 border-b border-border-dark">
                  <tr className="text-text-dim font-black uppercase tracking-[0.15em]">
                    <th className="p-4 text-center w-12 text-[10px]">Stt</th>
                    <th className="p-4 text-left text-[10px]">Nội dung hàng hóa / dịch vụ</th>
                    <th className="p-4 w-24 text-center text-[10px]">ĐVT</th>
                    <th className="p-4 w-24 text-center text-[10px]">SL</th>
                    <th className="p-4 w-32 text-right text-[10px]">Đơn giá</th>
                    <th className="p-4 w-40 text-right text-[10px]">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark">
                  {(edited.items || []).map((item: any, idx: number) => (
                    <tr key={item.id || `item-${idx}-${item.description || ''}`} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4 text-center text-text-dim font-black opacity-40">{idx + 1}</td>
                      <td className="p-4 whitespace-normal break-words text-white leading-relaxed min-w-[250px] font-bold">
                        {item.description || item.name || ''}
                      </td>
                      <td className="p-4 text-center text-text-dim font-bold">{item.unit || '-'}</td>
                      <td className="p-4 text-center text-text-dim font-black italic">
                        {item.quantity && item.quantity !== 0 ? formatVNNumber(item.quantity) : ''}
                      </td>
                      <td className="p-4 text-right text-text-dim font-bold">
                        {item.unitPrice && item.unitPrice !== 0 ? formatVNNumber(item.unitPrice) : ''}
                      </td>
                      <td className="p-4 text-right font-black text-primary bg-primary/5">
                        {formatVNNumber(item.amount || item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </section>
          <section className="space-y-6 pt-8 border-t border-border-dark">
            <div className="flex items-center gap-3 text-primary mb-2">
              <PlusSquare className="size-7" />
              <h3 className="font-black text-lg uppercase tracking-[0.2em]">Tổng cộng quyết toán</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-sidebar-dark rounded-[32px] border border-border-dark shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 size-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">Tổng cộng tiền hàng</label>
                <div className="text-2xl font-black text-white">{formatVNNumber(edited.totals?.subtotal)} đ</div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">
                  Tiền thuế GTGT ({edited.invoice?.vatRate !== undefined ? edited.invoice.vatRate : (edited.totals?.subtotal > 0 ? Math.round((Math.abs((edited.totals?.grandTotal || (edited.totals?.subtotal + (edited.totals?.vatAmount || 0))) - edited.totals?.subtotal) / edited.totals?.subtotal) * 100) : 8)}%)
                </label>
                <div className="text-2xl font-black text-white">{formatVNNumber(edited.totals?.vatAmount)} đ</div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2 px-3 border-l-2 border-primary">Tổng tiền thanh toán</label>
                <div className="text-4xl font-black text-primary tracking-tighter drop-shadow-2xl">{formatVNNumber(edited.totals?.grandTotal)} đ</div>
              </div>
            </div>
          </section>
        </div>

        <div className="p-8 border-t border-border-dark bg-white/5 flex justify-end gap-4">
          <button onClick={onClose} className="btn-secondary px-8">
            HỦY BỎ
          </button>
          <button
            onClick={() => onSave(edited)}
            className="btn-primary min-w-[200px]"
          >
            <Check className="size-4" />
            LƯU VÀO HỆ THỐNG
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const InvoiceItem: React.FC<InvoiceItemProps & { ref?: React.Ref<HTMLDivElement> }> = ({ inv, onSelectInvoice, onDeleteInvoice, displayName, displayDate, ref }) => (
  <div
    ref={ref}
    onClick={() => onSelectInvoice(inv)}
    onContextMenu={(e) => {
      e.preventDefault();
      onDeleteInvoice(inv.id);
    }}
    className="flex items-center justify-between p-4 rounded-2xl border border-border-dark bg-card-dark hover:bg-white/5 transition-all cursor-pointer group shadow-lg"
  >
    <div className="flex items-center gap-4">
      <div className={cn(
        "size-12 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110",
        inv.fileType === 'xml' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
      )}>
        <FileText className="size-6" />
      </div>
      <div className="min-w-0">
        <div className="font-black text-sm text-white group-hover:text-primary transition-colors truncate max-w-[150px] md:max-w-none tracking-tight">{displayName || inv.fileName}</div>
        <div className="text-[10px] font-bold text-text-dim uppercase tracking-widest mt-1 opacity-60" suppressHydrationWarning>
          {displayDate ? displayDate : (inv.createdAt?.toDate ? new Date(inv.createdAt?.toDate()).toLocaleString() : '')}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className={cn(
        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
        inv.status === 'completed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
          inv.status === 'processing' ? "bg-primary/10 text-primary border-primary/20 animate-pulse" :
            "bg-white/5 text-text-dim border-border-dark"
      )}>
        {inv.status === 'completed' ? 'Đã xong' :
          inv.status === 'processing' ? 'Xử lý...' :
            inv.status === 'pending' ? 'Chờ' : 'Lỗi'}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onDeleteInvoice(inv.id);
        }}
        className="size-10 text-text-dim hover:text-red-500 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all flex items-center justify-center shrink-0 active:scale-95"
        title="Xóa hóa đơn"
      >
        <Trash2 className="size-5" />
      </button>
    </div>
  </div>
);

// --- Standalone Helper Functions ---
const getContractValueStandalone = (data: Record<string, string>) => {
  if (!data) return '';
  const searchTerms = ['GIATRI', 'GIATRIHOPDONG', 'GIA_TRI', 'SOTIEN', 'SO_TIEN', 'TONG_TIEN', 'THANH_TIEN', 'PHI', 'GIA_TRI_HD', 'PHI_DICH_VU'];
  const cleanData: Record<string, string> = {};
  for (const [key, val] of Object.entries(data)) {
    const cleanKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
    cleanData[cleanKey] = val;
  }

  for (const term of searchTerms) {
    const cleanTerm = term.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanData[cleanTerm] && cleanData[cleanTerm].trim()) {
      return cleanData[cleanTerm].trim();
    }
  }

  for (const [k, val] of Object.entries(cleanData)) {
    if ((k.includes('GIATRI') || k.includes('SOTIEN') || k.includes('THANHTIEN')) && val && val.trim()) {
      return val.trim();
    }
  }

  return '';
};

const getContractSignDateStandalone = (data: Record<string, string>) => {
  if (!data) return '';
  const cleanData: Record<string, string> = {};
  for (const [key, val] of Object.entries(data)) {
    const cleanKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
    cleanData[cleanKey] = val;
  }

  const combinedTerms = [
    'NGAY_BB', 'NGAY_KY_HOP_DONG', 'NGAYKYHOPDONG', 'NGAY_KY_HD', 'NGAY_HD',
    'DATE', 'NGAYKY', 'NGAY_BB_HD', 'NGAYKY_HD', 'NGAY_HD_KY', 'NGAY_KY'
  ];
  for (const term of combinedTerms) {
    const cleanTerm = term.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const val = cleanData[cleanTerm];
    if (val && val.trim() && val.trim().length > 4) {
      const cleanVal = val.trim();
      if (cleanVal.match(/^\d{4}-\d{2}-\d{2}/)) {
        const parts = cleanVal.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return cleanVal;
    }
  }

  const dTerms = ['NGAY', 'NGAYKY', 'NGAYHD'];
  const mTerms = ['THANG', 'THANGKY', 'THANGHD'];
  const yTerms = ['NAM', 'NAMKY', 'NAMHD'];

  const findVal = (list: string[]) => {
    for (const term of list) {
      const cleanTerm = term.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const val = cleanData[cleanTerm];
      if (val && val.trim()) return val.trim();
    }
    return '';
  };

  const d = findVal(dTerms);
  const m = findVal(mTerms);
  const y = findVal(yTerms);

  if (d && m && y) return `${d}/${m}/${y}`;

  for (const [k, val] of Object.entries(cleanData)) {
    if ((k.includes('NGAYKY') || k.includes('NGAYHD') || k.includes('NGAYHDY') || k.includes('DATE')) && val && val.trim() && val.trim().length > 4) {
      const cleanVal = val.trim();
      if (cleanVal.match(/^\d{4}-\d{2}-\d{2}/)) {
        const parts = cleanVal.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return cleanVal;
    }
  }

  return '';
};

const getContractNumberStandalone = (data: Record<string, string>) => {
  if (!data) return '';
  const searchTerms = [
    'SO_HD', 'SO_HOP_DONG', 'MA_HD', 'SOHD', 'SO_HD_CM', 'SO_HD_TC',
    'SO_HD_VT', 'SO_HDCM', 'SO_HDTC', 'SO_HDVT', 'SO_HOPDONG', 'MA_HOPDONG',
    'MAHOPDONG', 'MAHD'
  ];
  const cleanData: Record<string, string> = {};
  for (const [key, val] of Object.entries(data)) {
    const cleanKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
    cleanData[cleanKey] = val;
  }

  for (const term of searchTerms) {
    const cleanTerm = term.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanData[cleanTerm] && cleanData[cleanTerm].trim()) {
      return cleanData[cleanTerm].trim();
    }
  }

  for (const [k, val] of Object.entries(cleanData)) {
    if ((k.includes('SOHD') || k.includes('SOHOPDONG') || k.includes('MAHD')) && val && val.trim()) {
      return val.trim();
    }
  }

  return '';
};

const getProjectNameStandalone = (data: Record<string, string>) => {
  if (!data) return '';
  const searchTerms = ['TEN_CONG_TRINH', 'CONG_TRINH', 'DU_AN', 'TEN_DU_AN', 'PROJECT', 'TENCONGTRINH'];
  const cleanData: Record<string, string> = {};
  for (const [key, val] of Object.entries(data)) {
    const cleanKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
    cleanData[cleanKey] = val;
  }

  for (const term of searchTerms) {
    const cleanTerm = term.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanData[cleanTerm] && cleanData[cleanTerm].trim()) {
      return cleanData[cleanTerm].trim();
    }
  }
  return 'Công trình xây dựng mới';
};

const getContractNoteStandalone = (data: Record<string, string>) => {
  if (!data) return '';
  const keys = ['GHI_CHU', 'NOTE', 'GHI_CHU_PHU', 'GHICHU'];
  for (const k of keys) {
    if (k in data) return data[k] || '';
    const upperK = k.toUpperCase();
    const foundKey = Object.keys(data).find(x => x.toUpperCase() === upperK);
    if (foundKey) return data[foundKey] || '';
  }
  return '';
};

const parseValueStandalone = (valStr: string): number => {
  if (!valStr) return 0;
  const cleaned = valStr.replace(/[^0-9]/g, '');
  return parseFloat(cleaned) || 0;
};

const formatCurrencyStandalone = (val: number) => {
  return val.toLocaleString('vi-VN') + ' đ';
};

// --- View: Contract Management ---
const ContractManagementCard = ({
  contract,
  partners,
  isSelected,
  toggleSelect,
  isExpanded,
  toggleExpand,
  onDownload,
  onDelete,
  onUpdateFormData,
  getContractValue,
  getContractSignDate,
  getContractNumber,
  getProjectName,
  getContractNote,
  parseValue,
  formatCurrency
}: any) => {
  const [localNumber, setLocalNumber] = useState('');
  const [localSignDate, setLocalSignDate] = useState('');
  const [localNote, setLocalNote] = useState('');
  const { toast } = useToast();

  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceDate, setAdvanceDate] = useState('');
  const [advanceNote, setAdvanceNote] = useState('');
  const [advanceDoc, setAdvanceDoc] = useState('');
  const [advanceHistory, setAdvanceHistory] = useState<any[]>([]);

  // Drag and Drop Voucher Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingVoucher, setIsUploadingVoucher] = useState(false);
  const [uploadedVoucherUrl, setUploadedVoucherUrl] = useState('');
  const [uploadedVoucherId, setUploadedVoucherId] = useState('');

  useEffect(() => {
    if (isFinancialModalOpen && contract?.formData) {
      let loadedInvoices = [];
      try {
        if (contract.formData._invoicesList) {
          loadedInvoices = JSON.parse(contract.formData._invoicesList);
        }
      } catch (e) {
        console.error("Error parsing _invoicesList:", e);
      }
      setInvoices(Array.isArray(loadedInvoices) ? loadedInvoices : []);

      let loadedHistory = [];
      try {
        if (contract.formData._advanceHistoryList) {
          loadedHistory = JSON.parse(contract.formData._advanceHistoryList);
        } else if (contract.formData._advanceAmount) {
          const amt = parseInt(contract.formData._advanceAmount, 10) || 0;
          if (amt > 0) {
            loadedHistory = [{
              id: 'migrated-initial',
              amount: amt,
              date: contract.formData._advanceDate || '',
              doc: contract.formData._advanceDoc || '',
              note: contract.formData._advanceNote || 'Đợt tạm ứng ban đầu',
              fileUrl: contract.formData._advanceDocUrl || '',
              fileId: contract.formData._advanceDocFileId || ''
            }];
          }
        }
      } catch (e) {
        console.error("Error parsing _advanceHistoryList:", e);
      }
      setAdvanceHistory(Array.isArray(loadedHistory) ? loadedHistory : []);

      setAdvanceAmount('');
      setAdvanceDate('');
      setAdvanceNote('');
      setAdvanceDoc('');
      setUploadedVoucherUrl('');
      setUploadedVoucherId('');
    }
  }, [isFinancialModalOpen, contract]);

  const handleAddInvoiceRow = () => {
    setInvoices((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        noidung: '',
        donvi: '',
        soluong: '',
        dongia: '',
        amount: 0
      }
    ]);
  };

  const handleDeleteInvoiceRow = (id: string) => {
    setInvoices((prev) => prev.filter((row) => row.id !== id));
  };

  const handleUpdateInvoiceField = (id: string, field: string, value: any) => {
    setInvoices((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };
          if (field === 'soluong' || field === 'dongia') {
            const qtyStr = String(updated.soluong || '0').replace(/[^0-9.]/g, '');
            const qty = parseFloat(qtyStr) || 0;
            const priceStr = String(updated.dongia || '0').replace(/\D/g, '');
            const price = parseFloat(priceStr) || 0;
            updated.amount = Math.round(qty * price);
          }
          return updated;
        }
        return row;
      })
    );
  };

  const handleInvoiceAmountChange = (index: number, valStr: string) => {
    const numericStr = valStr.replace(/\D/g, '');
    const valNum = parseInt(numericStr, 10) || 0;
    setInvoices((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index].amount = valNum;
      }
      return next;
    });
  };

  const handleVoucherUpload = async (file: File) => {
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast("Vui lòng tải tệp định dạng PDF hoặc hình ảnh (PNG, JPG, GIF)!", "error");
      return;
    }

    setIsUploadingVoucher(true);
    toast("Đang tải chứng từ lên Google Drive...", "success");

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const contractFolderName = contract.fileName.replace(/\.docx$/i, '');
      const gasUrl = (import.meta as any).env.VITE_GAS_WEB_APP_URL;

      if (!gasUrl) {
        toast("Vui lòng cấu hình VITE_GAS_WEB_APP_URL!", "error");
        setIsUploadingVoucher(false);
        return;
      }

      const cleanFileName = `Tam_Ung_${advanceDate || new Date().toISOString().split('T')[0]}_${file.name.replace(/\s+/g, '_')}`;

      const gasRes = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'save_advance_voucher',
          base64Data,
          fileName: cleanFileName,
          fileType: file.type,
          contractFolder: contractFolderName
        })
      });

      if (gasRes.ok) {
        const gasJson = await gasRes.json();
        if (gasJson.success) {
          setUploadedVoucherUrl(gasJson.driveUrl);
          setUploadedVoucherId(gasJson.fileId);
          setAdvanceDoc(file.name);
          toast("Tải chứng từ tạm ứng lên Google Drive thành công!", "success");
        } else {
          toast("Lỗi từ Drive: " + (gasJson.error || "Không rõ"), "error");
        }
      } else {
        toast("Lỗi kết nối máy chủ Google Drive", "error");
      }
    } catch (e: any) {
      console.error("Lỗi tải chứng từ:", e);
      toast("Lỗi khi tải chứng từ: " + e.message, "error");
    } finally {
      setIsUploadingVoucher(false);
    }
  };

  const handleAdvanceAmountChange = (valStr: string) => {
    const numericStr = valStr.replace(/\D/g, '');
    const valNum = parseInt(numericStr, 10) || 0;
    setAdvanceAmount(String(valNum));
  };

  const handleAddAdvanceHistory = () => {
    const amt = parseInt(advanceAmount, 10) || 0;
    if (amt <= 0) {
      toast("Vui lòng nhập số tiền tạm ứng hợp lệ lớn hơn 0!", "error");
      return;
    }

    const newEntry = {
      id: Math.random().toString(36).substring(2, 9),
      amount: amt,
      date: advanceDate || new Date().toISOString().split('T')[0],
      doc: advanceDoc.trim(),
      note: advanceNote.trim() || 'Tạm ứng hợp đồng',
      fileUrl: uploadedVoucherUrl,
      fileId: uploadedVoucherId
    };

    setAdvanceHistory(prev => [...prev, newEntry]);

    setAdvanceAmount('');
    setAdvanceDate('');
    setAdvanceDoc('');
    setAdvanceNote('');
    setUploadedVoucherUrl('');
    setUploadedVoucherId('');

    toast("Đã thêm đợt tạm ứng vào lịch sử!", "success");
  };

  const handleKeyDownAdvance = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAdvanceHistory();
    }
  };

  const subtotalSum = useMemo(() => {
    return invoices.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  }, [invoices]);

  const vatSum = useMemo(() => {
    return Math.round(subtotalSum * 0.08);
  }, [subtotalSum]);

  const totalInvoiceSum = useMemo(() => {
    return subtotalSum + vatSum;
  }, [subtotalSum, vatSum]);

  const totalAdvanceSum = useMemo(() => {
    return advanceHistory.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [advanceHistory]);

  const remainingSum = Math.max(0, totalInvoiceSum - totalAdvanceSum);

  const handleSaveFinancials = async () => {
    const nextData = { ...contract.formData };

    nextData._invoicesList = JSON.stringify(invoices);
    nextData._advanceHistoryList = JSON.stringify(advanceHistory);
    nextData._advanceAmount = String(totalAdvanceSum);

    if (advanceHistory.length > 0) {
      const latest = advanceHistory[advanceHistory.length - 1];
      nextData._advanceDate = latest.date;
      nextData._advanceDoc = latest.doc;
      nextData._advanceNote = latest.note;
      nextData._advanceDocUrl = latest.fileUrl || '';
      nextData._advanceDocFileId = latest.fileId || '';
    } else {
      nextData._advanceDate = '';
      nextData._advanceDoc = '';
      nextData._advanceNote = '';
      nextData._advanceDocUrl = '';
      nextData._advanceDocFileId = '';
    }

    const valueKeys = ['GIA_TRI', 'GIA_TRI_HD', 'PHI', 'TONG_PHI', 'SO_TIEN', 'GIATRI', 'SOTIEN', 'GIATRIHOPDONG'];
    const formattedTotalSum = formatThousands(String(totalInvoiceSum));

    let foundValueKey = false;
    for (const key of valueKeys) {
      if (key in nextData) {
        nextData[key] = formattedTotalSum;
        foundValueKey = true;
      } else {
        const idx = Object.keys(nextData).map(x => x.toUpperCase()).indexOf(key.toUpperCase());
        if (idx !== -1) {
          nextData[Object.keys(nextData)[idx]] = formattedTotalSum;
          foundValueKey = true;
        }
      }
    }
    if (!foundValueKey) {
      nextData['GIATRI'] = formattedTotalSum;
      nextData['GIATRIHOPDONG'] = formattedTotalSum;
    }

    const autoWords = numberToVietnameseWords(totalInvoiceSum);
    let foundWordKey = false;
    for (const key of Object.keys(nextData)) {
      const u = key.toUpperCase();
      if ((u.includes('BANG_CHU') || u.includes('BANGCHU')) && !u.includes('LICH')) {
        nextData[key] = autoWords;
        foundWordKey = true;
      }
    }
    if (!foundWordKey) {
      nextData['BANG_CHU'] = autoWords;
      nextData['BANGCHU'] = autoWords;
    }

    if (onUpdateFormData) {
      await onUpdateFormData(contract.id, nextData);
    }
    setIsFinancialModalOpen(false);
    toast("Đã cập nhật thông tin tài chính & hóa đơn thành công!", "success");
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast("Vui lòng chọn tệp định dạng PDF!", "error");
      return;
    }

    toast("Đang tải bản quét PDF lên Google Drive...", "success");
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const contractFolderName = contract.fileName.replace(/\.docx$/i, '');
      const gasUrl = (import.meta as any).env.VITE_GAS_WEB_APP_URL;

      if (!gasUrl) {
        toast("Vui lòng cấu hình VITE_GAS_WEB_APP_URL!", "error");
        return;
      }

      const pdfName = `${contractFolderName}_scan.pdf`;
      const gasRes = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'save_contract_pdf',
          base64Data,
          fileName: pdfName,
          contractFolder: contractFolderName
        })
      });

      if (gasRes.ok) {
        const gasJson = await gasRes.json();
        if (gasJson.success) {
          const nextData = {
            ...contract.formData,
            _pdfUrl: gasJson.driveUrl,
            _pdfFileId: gasJson.fileId
          };
          if (onUpdateFormData) {
            await onUpdateFormData(contract.id, nextData);
          }
          toast("Tải bản quét PDF lên Drive và đồng bộ thành công!", "success");
        } else {
          toast("Lỗi tải tệp lên Drive: " + (gasJson.error || "Không rõ"), "error");
        }
      } else {
        toast("Lỗi kết nối máy chủ Google Drive", "error");
      }
    } catch (e: any) {
      console.error("Lỗi tải PDF quét:", e);
      toast("Lỗi khi tải PDF lên: " + e.message, "error");
    }
  };

  useEffect(() => {
    if (contract && contract.formData) {
      setLocalNumber(getContractNumber(contract.formData));
      setLocalSignDate(getContractSignDate(contract.formData));
      setLocalNote(getContractNote(contract.formData));
    }
  }, [contract]);

  const handleBlur = (field: string, val: string) => {
    const nextData = { ...contract.formData };
    if (field === 'number') {
      if (val === getContractNumber(contract.formData)) return;
      const keys = [
        'SO_HD', 'SO_HOP_DONG', 'MA_HD', 'SOHD', 'SO_HD_CM', 'SO_HD_TC',
        'SO_HD_VT', 'SO_HDCM', 'SO_HDTC', 'SO_HDVT', 'SO_HOPDONG', 'MA_HOPDONG',
        'MAHOPDONG', 'MAHD'
      ];
      let k = 'SO_HD';
      for (const key of keys) {
        if (key in nextData) { k = key; break; }
        const idx = Object.keys(nextData).map(x => x.toUpperCase()).indexOf(key.toUpperCase());
        if (idx !== -1) { k = Object.keys(nextData)[idx]; break; }
      }
      nextData[k] = val;
    } else if (field === 'signDate') {
      if (val === getContractSignDate(contract.formData)) return;

      const combinedKeys = [
        'NGAY_BB', 'NGAY_KY_HOP_DONG', 'NGAYKYHOPDONG', 'NGAY_KY_HD', 'NGAY_HD',
        'DATE', 'NGAYKY', 'NGAY_BB_HD', 'NGAYKY_HD', 'NGAY_HD_KY', 'NGAY_KY'
      ];
      let foundCombined = false;
      for (const k of combinedKeys) {
        let keyToUpdate = '';
        if (k in nextData) { keyToUpdate = k; }
        else {
          const idx = Object.keys(nextData).map(x => x.toUpperCase()).indexOf(k.toUpperCase());
          if (idx !== -1) { keyToUpdate = Object.keys(nextData)[idx]; }
        }
        if (keyToUpdate) {
          nextData[keyToUpdate] = val;
          foundCombined = true;
        }
      }

      if (val.includes('/')) {
        const parts = val.split('/');
        if (parts.length === 3) {
          const dKeys = ['NGAY', 'NGAY_KY', 'NGAY_HD', 'NGAYKY'];
          const mKeys = ['THANG', 'THANG_KY', 'THANG_HD', 'THANGKY'];
          const yKeys = ['NAM', 'NAM_KY', 'NAM_HD', 'NAMKY'];
          let dk = '', mk = '', yk = '';

          for (const key of dKeys) {
            if (key in nextData) { dk = key; break; }
            const idx = Object.keys(nextData).map(x => x.toUpperCase()).indexOf(key.toUpperCase());
            if (idx !== -1) { dk = Object.keys(nextData)[idx]; break; }
          }
          for (const key of mKeys) {
            if (key in nextData) { mk = key; break; }
            const idx = Object.keys(nextData).map(x => x.toUpperCase()).indexOf(key.toUpperCase());
            if (idx !== -1) { mk = Object.keys(nextData)[idx]; break; }
          }
          for (const key of yKeys) {
            if (key in nextData) { yk = key; break; }
            const idx = Object.keys(nextData).map(x => x.toUpperCase()).indexOf(key.toUpperCase());
            if (idx !== -1) { yk = Object.keys(nextData)[idx]; break; }
          }

          if (dk) nextData[dk] = parts[0].trim();
          if (mk) nextData[mk] = parts[1].trim();
          if (yk) nextData[yk] = parts[2].trim();
        }
      } else if (!foundCombined) {
        const keys = ['NGAY_KY', 'NGAY_HD', 'NGAYKY'];
        let k = 'NGAY_KY';
        for (const key of keys) {
          if (key in nextData) { k = key; break; }
          const idx = Object.keys(nextData).map(x => x.toUpperCase()).indexOf(key.toUpperCase());
          if (idx !== -1) { k = Object.keys(nextData)[idx]; break; }
        }
        nextData[k] = val;
      }
    } else if (field === 'note') {
      if (val === getContractNote(contract.formData)) return;
      const keys = ['GHI_CHU', 'NOTE', 'GHI_CHU_PHU', 'GHICHU'];
      let k = 'GHI_CHU';
      for (const key of keys) {
        if (key in nextData) { k = key; break; }
        const idx = Object.keys(nextData).map(x => x.toUpperCase()).indexOf(key.toUpperCase());
        if (idx !== -1) { k = Object.keys(nextData)[idx]; break; }
      }
      nextData[k] = val;
    }
    if (onUpdateFormData) {
      onUpdateFormData(contract.id, nextData);
    }
  };

  const partnerA = partners.find(p => p.id === contract.partyAId) || { name: 'Chưa cập nhật', address: '---', taxCode: '---', representative: '---' };
  const partnerB = partners.find(p => p.id === contract.partyBId) || { name: 'Chưa cập nhật', address: '---', taxCode: '---', representative: '---' };

  const contractValue = getContractValue(contract.formData);
  const contractNumber = getContractNumber(contract.formData);
  const signDate = getContractSignDate(contract.formData);
  const projectName = getProjectName(contract.formData);
  const contractNote = getContractNote(contract.formData);

  const createdDate = useMemo(() => {
    if (contract.createdAt) {
      try {
        if (contract.createdAt.toDate) return contract.createdAt.toDate().toLocaleDateString('vi-VN');
        return new Date(contract.createdAt).toLocaleDateString('vi-VN');
      } catch (e) {
        return '---';
      }
    }
    return '---';
  }, [contract.createdAt]);

  const valNum = parseValue(contractValue);
  const dbAdvanceAmount = contract.formData?._advanceAmount ? Number(contract.formData._advanceAmount) : 0;
  const dbTotalAmount = valNum;
  const dbRemainingAmount = Math.max(0, dbTotalAmount - dbAdvanceAmount);

  const displayTotalVal = dbTotalAmount > 0 ? formatCurrency(dbTotalAmount) : '---';
  const displayAdvanceVal = dbAdvanceAmount > 0 ? formatCurrency(dbAdvanceAmount) : '0 đ';
  const displayRemainingVal = dbTotalAmount > 0 ? formatCurrency(dbRemainingAmount) : '---';

  const nextMilestoneDate = (() => {
    if (signDate && signDate.includes('/')) {
      const parts = signDate.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        const dateObj = new Date(y, m - 1, d);
        dateObj.setDate(dateObj.getDate() + 15);
        return dateObj.toLocaleDateString('vi-VN');
      }
    }
    return '01/06/2026';
  })();

  const taskDate = (() => {
    if (signDate && signDate.includes('/')) {
      const parts = signDate.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        const dateObj = new Date(y, m - 1, d);
        dateObj.setDate(dateObj.getDate() + 30);
        return dateObj.toLocaleDateString('vi-VN');
      }
    }
    return '01/07/2026';
  })();

  const getContractIcon = (templateId: string) => {
    if (templateId === 'HDCM') {
      return (
        <div className="relative size-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0 shadow-inner">
          <FileText className="size-6" />
          <div className="absolute -bottom-1 -right-1 bg-[#1e1e24] size-5 rounded-full border border-orange-500/30 flex items-center justify-center shadow-md">
            <Cog className="size-3 text-orange-400" />
          </div>
        </div>
      );
    } else if (templateId === 'HDTC') {
      return (
        <div className="relative size-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
          <FileText className="size-6" />
          <div className="absolute -bottom-1 -right-1 bg-[#1e1e24] size-5 rounded-full border border-blue-500/30 flex items-center justify-center shadow-md">
            <Construction className="size-3 text-blue-400" />
          </div>
        </div>
      );
    } else {
      return (
        <div className="relative size-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
          <FileText className="size-6" />
          <div className="absolute -bottom-1 -right-1 bg-[#1e1e24] size-5 rounded-full border border-emerald-500/30 flex items-center justify-center shadow-md">
            <Box className="size-3 text-emerald-400" />
          </div>
        </div>
      );
    }
  };

  const getContractTag = (templateId: string) => {
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

  const renderPartnerRow = (label: string, name: string, isA: boolean) => {
    return (
      <div className="flex items-start gap-2 text-xs font-semibold">
        <Building className="size-4 text-text-dim/60 shrink-0 mt-0.5" />
        <div className="flex flex-col min-w-0">
          <span className="text-text-dim/80 text-[10px] leading-none mb-0.5">{label}</span>
          <span className={cn(
            "font-bold whitespace-normal break-words leading-tight",
            isA ? "text-orange-400" : "text-amber-500/90"
          )}>
            {name}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={toggleExpand}
      className={cn(
        "w-full bg-[#18181B] border border-border-dark/60 rounded-[24px] p-6 transition-all duration-300 shadow-lg relative overflow-hidden cursor-pointer",
        isSelected ? "ring-2 ring-primary/20 bg-primary/5" : "hover:border-border-dark/80"
      )}
    >
      <div className="flex items-center gap-6">
        <div className="w-8 shrink-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => { e.stopPropagation(); toggleSelect(); }}
            className="size-5 rounded bg-sidebar-dark border-border-dark text-primary focus:ring-primary cursor-pointer accent-primary"
          />
        </div>

        <div className="flex-[1.5] min-w-[180px] flex items-center gap-4">
          {getContractIcon(contract.templateId)}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-white whitespace-normal break-words break-all leading-tight hover:text-primary transition-colors">
              {contract.fileName}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[10px] text-text-dim font-bold whitespace-nowrap">ID: {contract.id.slice(-6).toUpperCase()}</span>
              {getContractTag(contract.templateId)}
            </div>
          </div>
        </div>

        <div className="flex-[1.2] min-w-[150px] space-y-2">
          {renderPartnerRow("Bên A", partnerA.name, true)}
          {renderPartnerRow("Bên B", partnerB.name, false)}
        </div>

        <div className="flex-[2] min-w-[220px]">
          <div className="bg-[#202024] border border-border-dark/60 rounded-xl p-3 flex flex-col justify-center min-h-[72px] text-xs font-semibold leading-relaxed shadow-inner">
            {isExpanded ? (
              <div className="flex items-center justify-between w-full">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="text-text-dim flex items-center gap-1.5">
                    <span>Giá trị HĐ:</span>
                    <span className="font-bold text-[#FF7A00]">{contractValue || '---'}</span>
                  </div>
                  <div className="text-text-dim flex items-center gap-1.5">
                    <span>Số hợp đồng:</span>
                    <span className="font-bold text-white whitespace-normal break-all">{localNumber || '---'}</span>
                  </div>
                  <div className="text-text-dim flex items-start gap-1.5 min-w-0">
                    <span className="shrink-0">Ghi chú:</span>
                    <span className="font-medium text-white italic whitespace-normal break-words leading-tight" title={localNote}>
                      {localNote || '---'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-text-dim font-bold bg-[#18181b]/50 px-2.5 py-1.5 rounded-lg border border-border-dark/30 ml-2 shrink-0">
                  <Calendar className="size-3.5 text-orange-400 opacity-80" />
                  <span className="text-[10px] whitespace-nowrap">{createdDate}</span>
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

        {!isExpanded && (
          <div className="w-28 shrink-0 flex items-center gap-2 text-xs text-text-dim font-bold pl-2 whitespace-nowrap">
            <Calendar className="size-4 opacity-50 text-orange-400" />
            <span>{createdDate}</span>
          </div>
        )}

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

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            onClick={e => e.stopPropagation()}
            className="overflow-hidden w-full border-t border-border-dark/60 mt-5 pt-5"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-white">
              <div className="bg-[#202024] border border-border-dark/60 rounded-[20px] p-5 flex flex-col justify-between shadow-lg">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-border-dark/40">
                    <h4 className="font-black text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
                      Hợp đồng chi tiết
                    </h4>
                    <div className="flex items-center gap-2.5 text-text-dim" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          onDownload(contract);
                          toast("Đang tải xuống tệp Word (.docx) của hợp đồng...", "success");
                        }}
                        className="p-1 hover:text-white transition-colors"
                        title="Tải tệp Word (.docx) hợp đồng"
                      >
                        <Printer className="size-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (contract.formData?._driveUrl) {
                            navigator.clipboard.writeText(contract.formData._driveUrl);
                            toast("Đã sao chép liên kết chia sẻ Google Drive!", "success");
                          } else {
                            toast("Tài liệu chưa được lưu trên Google Drive!", "error");
                          }
                        }}
                        className="p-1 hover:text-white transition-colors"
                        title="Sao chép liên kết chia sẻ Google Drive"
                      >
                        <Share2 className="size-4" />
                      </button>
                      <button
                        onClick={() => {
                          handleBlur('number', localNumber);
                          handleBlur('signDate', localSignDate);
                          handleBlur('note', localNote);
                          toast("Đã lưu thông tin hợp đồng thành công!", "success");
                        }}
                        className="p-1 hover:text-white text-primary hover:text-primary-light transition-colors"
                        title="Lưu thông tin hợp đồng"
                      >
                        <Save className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-text-dim w-16 shrink-0 font-bold">Mã HĐ:</span>
                      <input
                        type="text"
                        value={localNumber}
                        onChange={(e) => setLocalNumber(e.target.value)}
                        onBlur={() => handleBlur('number', localNumber)}
                        className="flex-1 bg-black/30 border border-border-dark/80 rounded-lg px-2.5 py-1.5 text-white font-bold outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-text-dim w-16 shrink-0 font-bold">Ngày ký:</span>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={localSignDate}
                          onChange={(e) => setLocalSignDate(e.target.value)}
                          onBlur={() => handleBlur('signDate', localSignDate)}
                          className="w-full bg-black/30 border border-border-dark/80 rounded-lg pl-2.5 pr-8 py-1.5 text-white font-bold outline-none focus:border-primary/50 transition-colors"
                          placeholder="DD/MM/YYYY"
                        />
                        <Calendar className="size-4 text-text-dim absolute right-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-text-dim block font-bold">Tài liệu lưu trữ (.docx):</span>
                      {contract.formData?._driveUrl ? (
                        <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl p-2.5 transition-all group/drive">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0 shadow-lg group-hover/drive:bg-emerald-500 group-hover/drive:text-white transition-all duration-300">
                              <Globe className="size-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-white whitespace-normal break-all text-xs block leading-tight group-hover/drive:text-emerald-400 transition-colors" title={contract.fileName}>
                                {contract.fileName}
                              </span>
                              <span className="text-[9px] font-black text-emerald-400/80 uppercase tracking-widest block mt-1">
                                Google Drive Live File
                              </span>
                            </div>
                          </div>
                          <a
                            href={contract.formData._driveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500 rounded-xl border border-emerald-500/20 transition-all duration-300 shrink-0 flex items-center justify-center"
                            title="Mở tài liệu trên Google Drive để chia sẻ"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-black/30 border border-border-dark/80 rounded-lg p-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-8 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 font-black shrink-0 shadow-inner">
                              DOCX
                            </div>
                            <span className="font-bold text-white whitespace-normal break-all text-xs" title={contract.fileName}>
                              {contract.fileName}
                            </span>
                          </div>
                          <button
                            onClick={() => onDownload(contract)}
                            className="p-1.5 text-text-dim hover:text-white hover:bg-white/5 rounded-md border border-border-dark/30 transition-colors shrink-0"
                            title="Tải tệp Word"
                          >
                            <Download className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 mt-3">
                      <span className="text-text-dim block font-bold">Bản quét gốc (PDF Scan):</span>
                      {contract.formData?._pdfUrl ? (
                        <div className="flex items-center justify-between bg-red-500/5 border border-red-500/20 hover:border-red-500/40 rounded-xl p-2.5 transition-all group/pdf">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-400 shrink-0 shadow-lg group-hover/pdf:bg-red-500 group-hover/pdf:text-white transition-all duration-300">
                              <FileText className="size-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-white whitespace-normal break-all text-xs block leading-tight group-hover/pdf:text-red-400 transition-colors">
                                {contract.fileName.replace(/\.docx$/i, '')}_scan.pdf
                              </span>
                              <span className="text-[9px] font-black text-red-400/80 uppercase tracking-widest block mt-1">
                                Google Drive PDF Scan
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <a
                              href={contract.formData._pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 rounded-xl border border-red-500/20 transition-all duration-300 shrink-0 flex items-center justify-center"
                              title="Mở bản quét PDF trên Google Drive"
                            >
                              <ExternalLink className="size-4" />
                            </a>
                            <label className="p-2 text-text-dim hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-border-dark/40 cursor-pointer transition-all shrink-0 flex items-center justify-center">
                              <input
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={handlePdfUpload}
                              />
                              <Upload className="size-4" />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="relative border border-dashed border-border-dark/80 hover:border-primary/50 bg-black/20 rounded-xl p-4 transition-all flex flex-col items-center justify-center gap-2 group/upload-drop" onClick={e => e.stopPropagation()}>
                          <UploadCloud className="size-7 text-text-dim group-hover/upload-drop:text-primary transition-colors animate-pulse" />
                          <label className="text-[11px] text-text-dim text-center leading-normal cursor-pointer hover:text-white font-semibold">
                            Kéo thả hoặc <span className="text-primary hover:underline font-bold">chọn tệp PDF</span> bản quét gốc
                            <input
                              type="file"
                              className="hidden"
                              accept="application/pdf"
                              onChange={handlePdfUpload}
                            />
                          </label>
                          <span className="text-[9px] text-text-dim/60 font-medium">Hỗ trợ tệp PDF tối đa 10MB</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-3">
                  <span className="text-text-dim block font-bold">Ghi chú phụ:</span>
                  <textarea
                    value={localNote}
                    onChange={(e) => setLocalNote(e.target.value)}
                    onBlur={() => handleBlur('note', localNote)}
                    className="w-full h-16 bg-black/30 border border-border-dark/80 rounded-lg p-2 text-white font-medium outline-none focus:border-primary/50 transition-colors resize-none"
                    placeholder="Nhập ghi chú phụ..."
                  />
                </div>
              </div>

              <div className="bg-[#202024] border border-border-dark/60 rounded-[20px] p-5 flex flex-col justify-between shadow-lg">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-border-dark/40">
                    <h4 className="font-black text-xs uppercase tracking-wider text-orange-400 truncate max-w-full" title={`Ghi chú phụ: ${localNote}`}>
                      Ghi chú phụ: {localNote || 'Không có'}
                    </h4>
                  </div>

                  <div className="space-y-4 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                    <div className="space-y-1 bg-black/20 rounded-xl p-3 border border-border-dark/30 shadow-inner">
                      <div className="flex items-center gap-1.5 font-black text-xs text-orange-400">
                        <Building className="size-4 shrink-0" />
                        <span>Bên A: {partnerA.name}</span>
                      </div>
                      <div className="pl-5 space-y-1 mt-1 text-[11px] leading-relaxed text-text-dim">
                        <div>Địa chỉ: <span className="font-semibold text-white whitespace-normal break-words">{partnerA.address}</span></div>
                        <div className="flex gap-4 flex-wrap">
                          <div>MST: <span className="font-semibold text-white">{partnerA.taxCode}</span></div>
                          <div>Đại diện: <span className="font-semibold text-white">{partnerA.representative || 'Đang cập nhật'}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 bg-black/20 rounded-xl p-3 border border-border-dark/30 shadow-inner">
                      <div className="flex items-center gap-1.5 font-black text-xs text-amber-500/90">
                        <Building className="size-4 shrink-0" />
                        <span>Bên B: {partnerB.name}</span>
                      </div>
                      <div className="pl-5 space-y-1 mt-1 text-[11px] leading-relaxed text-text-dim">
                        <div>Địa chỉ: <span className="font-semibold text-white whitespace-normal break-words">{partnerB.address}</span></div>
                        <div className="flex gap-4 flex-wrap">
                          <div>MST: <span className="font-semibold text-white">{partnerB.taxCode}</span></div>
                          <div>Đại diện: <span className="font-semibold text-white">{partnerB.representative || 'Đang cập nhật'}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFinancialModalOpen(true);
                }}
                className="bg-[#202024] border border-border-dark/60 hover:border-primary/40 hover:bg-primary/5 hover:scale-[1.01] transition-all duration-300 rounded-[20px] p-5 flex flex-col justify-between shadow-lg cursor-pointer group"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-border-dark/40">
                    <h4 className="font-black text-sm uppercase tracking-wider text-white group-hover:text-primary transition-colors">Tài chính & Quản lý</h4>
                    <div className="flex items-center gap-2 text-text-dim group-hover:text-primary transition-colors">
                      <DollarSign className="size-4" />
                      <Settings2 className="size-4" />
                    </div>
                  </div>

                  <div className="space-y-2.5 font-semibold text-xs leading-normal">
                    <div className="flex justify-between items-center py-1.5 border-b border-border-dark/20 text-text-dim">
                      <span>Tổng giá trị:</span>
                      <span className="font-bold text-[#FF7A00] text-sm">{displayTotalVal}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-border-dark/20 text-text-dim">
                      <span>Đã tạm ứng:</span>
                      <span className="font-bold text-emerald-400">{displayAdvanceVal}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 text-text-dim">
                      <span>Còn lại:</span>
                      <span className="font-bold text-blue-400">{displayRemainingVal}</span>
                    </div>
                  </div>

                  <div className="mt-2 text-center text-[10px] text-text-dim font-bold bg-[#18181b]/50 py-2 rounded-xl border border-border-dark/30 group-hover:border-primary/20 group-hover:text-primary transition-all">
                    Bấm để Quản lý Tài chính & Hóa đơn
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Financial Management Modal overlay */}
      <AnimatePresence>
        {isFinancialModalOpen && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 md:p-6"
            onClick={(e) => {
              e.stopPropagation();
              setIsFinancialModalOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card-dark rounded-[32px] shadow-[0_50px_100px_rgba(0,0,0,0.6)] w-full max-w-7xl overflow-hidden border border-white/10 flex flex-col h-[95vh] max-h-[95vh]"
            >
              {/* Modern Header */}
              <div className="p-6 md:p-8 border-b border-white/5 bg-white/5 relative overflow-hidden shrink-0">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500/20" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-primary/20 text-primary rounded-2xl flex items-center justify-center border border-primary/30 shadow-2xl">
                      <DollarSign className="size-6 text-[#FF7A00]" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-widest whitespace-normal break-words">Quản lý Tài chính & Hóa đơn</h3>
                      <p className="text-text-dim text-[10px] font-bold uppercase tracking-[0.2em] mt-1 opacity-60">Chuẩn hóa dòng tiền và thanh toán hợp đồng</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFinancialModalOpen(false)}
                    className="size-10 flex items-center justify-center text-text-dim hover:text-white hover:bg-white/10 rounded-xl transition-all self-end md:self-center"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Elegant Contract Metadata Summary Bar */}
                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-text-dim/80 font-semibold bg-black/40 p-4 rounded-2xl border border-white/5 shadow-inner">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-text-dim/50 block">Số Hợp Đồng</span>
                    <span className="text-white font-extrabold whitespace-normal break-all">{getContractNumber(contract.formData) || '---'}</span>
                  </div>
                  <div className="space-y-1 border-l border-white/5 pl-4 md:pl-6">
                    <span className="text-[9px] font-black uppercase tracking-wider text-text-dim/50 block">Ngày Ký Hợp Đồng</span>
                    <span className="text-white font-extrabold">{getContractSignDate(contract.formData) || '---'}</span>
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1 border-l border-white/5 pl-4 md:pl-6">
                    <span className="text-[9px] font-black uppercase tracking-wider text-text-dim/50 block">Bên A (Khách Hàng)</span>
                    <span className="text-white font-extrabold whitespace-normal break-words line-clamp-2" title={partners.find(p => p.id === contract.partyAId)?.name}>
                      {partners.find(p => p.id === contract.partyAId)?.name || '---'}
                    </span>
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1 border-l border-white/5 pl-4 md:pl-6">
                    <span className="text-[9px] font-black uppercase tracking-wider text-text-dim/50 block">Bên B (Đại Diện)</span>
                    <span className="text-white font-extrabold whitespace-normal break-words line-clamp-2" title={partners.find(p => p.id === contract.partyBId)?.name}>
                      {partners.find(p => p.id === contract.partyBId)?.name || '---'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar bg-[#1c1c1f]">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

                  {/* Left Column: Dynamic Invoice Table Breakdown (3/5) */}
                  <div className="lg:col-span-3 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-border-dark/60">
                      <h4 className="font-black text-xs uppercase tracking-wider text-white flex items-center gap-2">
                        <List className="size-4 text-primary" />
                        Danh sách hạng mục / Hóa đơn
                      </h4>
                      <button
                        type="button"
                        onClick={handleAddInvoiceRow}
                        className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:border-primary/40 rounded-xl text-xs font-black tracking-wider transition-all duration-300 py-1.5 px-3"
                      >
                        <Plus className="size-4" />
                        THÊM HẠNG MỤC
                      </button>
                    </div>

                    {invoices.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-border-dark/60 rounded-2xl bg-black/10 text-text-dim">
                        <AlertCircle className="size-8 text-text-dim/40 mb-2" />
                        <span className="text-xs font-bold uppercase tracking-wider text-text-dim/60">Chưa có hạng mục thanh toán nào</span>
                        <span className="text-[10px] mt-1 text-center">Bấm nút "Thêm hạng mục" để khai báo các hạng mục hóa đơn chi tiết.</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-border-dark bg-black/20 shadow-xl">
                        <table className="w-full text-left border-collapse min-w-[650px] text-xs">
                          <thead>
                            <tr className="border-b border-border-dark bg-white/5 font-black text-[10px] uppercase tracking-wider text-text-dim">
                              <th className="p-3 w-12 text-center">STT</th>
                              <th className="p-3 min-w-[200px]">Nội dung hàng hóa, dịch vụ</th>
                              <th className="p-3 w-16 text-center">ĐVT</th>
                              <th className="p-3 w-20 text-center">Số lượng</th>
                              <th className="p-3 w-28 text-right">Đơn giá (đ)</th>
                              <th className="p-3 w-28 text-right">Thành tiền (đ)</th>
                              <th className="p-3 w-12 text-center">Xóa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoices.map((inv, idx) => {
                              const noidungVal = inv.noidung !== undefined ? inv.noidung : (inv.number || inv.note || '');
                              const donviVal = inv.donvi !== undefined ? inv.donvi : '';
                              const soluongVal = inv.soluong !== undefined ? inv.soluong : '1';
                              const dongiaVal = inv.dongia !== undefined ? inv.dongia : (inv.amount || 0);
                              return (
                                <tr key={inv.id} className="border-b border-border-dark/40 hover:bg-white/5 transition-all font-semibold">
                                  <td className="p-3 text-center text-text-dim font-bold">{idx + 1}</td>
                                  <td className="p-2">
                                    <textarea
                                      rows={1}
                                      value={noidungVal}
                                      placeholder="Tên hàng hóa, dịch vụ..."
                                      onChange={(e) => handleUpdateInvoiceField(inv.id, 'noidung', e.target.value)}
                                      className="w-full bg-black/30 border border-border-dark/60 rounded-lg px-2 py-1.5 text-white outline-none focus:border-primary/50 transition-colors whitespace-normal break-words resize-none min-h-[34px]"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={donviVal}
                                      placeholder="m3, kg..."
                                      onChange={(e) => handleUpdateInvoiceField(inv.id, 'donvi', e.target.value)}
                                      className="w-full bg-black/30 border border-border-dark/60 rounded-lg px-1 py-1.5 text-center text-white outline-none focus:border-primary/50 transition-colors font-medium"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={soluongVal}
                                      placeholder="1"
                                      onChange={(e) => handleUpdateInvoiceField(inv.id, 'soluong', e.target.value)}
                                      className="w-full bg-black/30 border border-border-dark/60 rounded-lg px-1 py-1.5 text-center text-white outline-none focus:border-primary/50 transition-colors font-medium"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={dongiaVal > 0 ? formatThousands(String(dongiaVal)) : ''}
                                      placeholder="0"
                                      onChange={(e) => {
                                        const clean = e.target.value.replace(/\D/g, '');
                                        const valNum = parseInt(clean, 10) || 0;
                                        handleUpdateInvoiceField(inv.id, 'dongia', valNum);
                                      }}
                                      className="w-full bg-black/30 border border-border-dark/60 rounded-lg px-2 py-1.5 text-right font-bold text-white outline-none focus:border-primary/50 transition-colors"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={inv.amount > 0 ? formatThousands(String(inv.amount)) : '0'}
                                      onChange={(e) => {
                                        const clean = e.target.value.replace(/\D/g, '');
                                        const valNum = parseInt(clean, 10) || 0;
                                        handleUpdateInvoiceField(inv.id, 'amount', valNum);
                                      }}
                                      className="w-full bg-black/30 border border-border-dark/60 rounded-lg px-2 py-1.5 text-right font-bold text-white outline-none focus:border-primary/50 transition-colors"
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteInvoiceRow(inv.id)}
                                      className="p-1.5 text-text-dim hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors inline-flex items-center justify-center"
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Structured Calculations Footer based on image_b92c0c.png */}
                            <tr className="border-b border-border-dark/60 bg-white/5 font-black text-xs">
                              <td className="p-3 text-center"></td>
                              <td className="p-3 uppercase tracking-wider text-text-dim font-bold" colSpan={4}>TỔNG CỘNG TIỀN HÀNG</td>
                              <td className="p-3 text-right text-white font-black">{formatCurrency(subtotalSum)}</td>
                              <td className="p-3"></td>
                            </tr>
                            <tr className="border-b border-border-dark/60 bg-white/5 font-black text-xs">
                              <td className="p-3 text-center"></td>
                              <td className="p-3 uppercase tracking-wider text-text-dim font-bold" colSpan={4}>THUẾ GIÁ TRỊ GIA TĂNG (8%)</td>
                              <td className="p-3 text-right text-white font-black">{formatCurrency(vatSum)}</td>
                              <td className="p-3"></td>
                            </tr>
                            <tr className="border-b border-border-dark bg-white/10 font-black text-xs text-[#FF7A00]">
                              <td className="p-3 text-center"></td>
                              <td className="p-3 uppercase tracking-widest font-black" colSpan={4}>TỔNG CỘNG TIỀN THANH TOÁN</td>
                              <td className="p-3 text-right font-black text-sm">{formatCurrency(totalInvoiceSum)}</td>
                              <td className="p-3"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Advance payment info (2/5) */}
                  <div className="lg:col-span-2 space-y-4 border-t lg:border-t-0 lg:border-l border-border-dark/60 pt-6 lg:pt-0 lg:pl-8">
                    <h4 className="font-black text-xs uppercase tracking-wider text-white flex items-center gap-2 pb-2 border-b border-border-dark/60">
                      <CreditCard className="size-4 text-emerald-400" />
                      Thông tin Tạm ứng
                    </h4>

                    <div className="space-y-4 text-xs font-semibold">
                      <div className="space-y-1.5">
                        <label className="text-text-dim block font-bold">Đã tạm ứng:</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={advanceAmount ? formatThousands(advanceAmount) : ''}
                            placeholder="Nhập số tiền đã tạm ứng"
                            onChange={(e) => handleAdvanceAmountChange(e.target.value)}
                            onKeyDown={handleKeyDownAdvance}
                            className="w-full bg-black/30 border border-border-dark/60 rounded-lg pl-3 pr-8 py-2 text-white font-bold outline-none focus:border-primary/50 transition-colors"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim font-bold">đ</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-text-dim block font-bold">Ngày tạm ứng:</label>
                        <input
                          type="date"
                          value={advanceDate}
                          onChange={(e) => setAdvanceDate(e.target.value)}
                          onKeyDown={handleKeyDownAdvance}
                          className="w-full bg-black/30 border border-border-dark/60 rounded-lg px-3 py-2 text-white outline-none focus:border-primary/50 transition-colors"
                        />
                      </div>

                      {/* Drag-and-Drop / Click Upload Zone & Input */}
                      <div className="space-y-1.5">
                        <label className="text-text-dim block font-bold">Chứng từ liên quan:</label>

                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            value={advanceDoc}
                            placeholder="Tên chứng từ (e.g. UNC số 12345)"
                            onChange={(e) => setAdvanceDoc(e.target.value)}
                            onKeyDown={handleKeyDownAdvance}
                            className="w-full bg-black/30 border border-border-dark/60 rounded-lg px-3 py-2 text-white outline-none focus:border-primary/50 transition-colors font-medium"
                          />

                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDragging(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file) handleVoucherUpload(file);
                            }}
                            onClick={() => {
                              const fileInput = document.getElementById('voucher-file-input');
                              if (fileInput) fileInput.click();
                            }}
                            className={`border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isDragging ? 'border-primary bg-primary/10' :
                                uploadedVoucherUrl ? 'border-emerald-500 bg-emerald-500/5' :
                                  'border-border-dark/60 hover:border-primary/50 hover:bg-white/5'
                              }`}
                          >
                            <input
                              id="voucher-file-input"
                              type="file"
                              accept="application/pdf,image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleVoucherUpload(file);
                              }}
                            />

                            {isUploadingVoucher ? (
                              <div className="flex items-center gap-2 text-text-dim text-[10px] font-bold animate-pulse">
                                <Loader2 className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                ĐANG TẢI LÊN GOOGLE DRIVE...
                              </div>
                            ) : uploadedVoucherUrl ? (
                              <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                                <CheckCircle2 className="size-4" />
                                ĐÃ TẢI CHỨNG TỪ THÀNH CÔNG!
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center">
                                <Upload className="size-5 text-text-dim/60 mb-1.5 group-hover:text-primary transition-colors" />
                                <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Kéo thả hoặc Click để tải PDF/Ảnh</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-text-dim block font-bold">Nội dung tạm ứng:</label>
                        <textarea
                          rows={2}
                          value={advanceNote}
                          placeholder="Nhập nội dung/ghi chú chi tiết cho khoản tạm ứng..."
                          onChange={(e) => setAdvanceNote(e.target.value)}
                          onKeyDown={handleKeyDownAdvance}
                          className="w-full bg-black/30 border border-border-dark/60 rounded-lg px-3 py-2 text-white outline-none focus:border-primary/50 transition-colors resize-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddAdvanceHistory}
                        className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-xs font-black tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
                      >
                        <Plus className="size-4" />
                        THÊM ĐỢT TẠM ỨNG
                      </button>

                      <div className="space-y-2 pt-2">
                        <div className="text-[10px] font-black text-white/80 uppercase tracking-wider flex items-center gap-1.5 border-b border-border-dark/40 pb-1">
                          <History className="size-3.5 text-emerald-400" />
                          Lịch sử Đợt tạm ứng ({advanceHistory.length})
                        </div>

                        {advanceHistory.length === 0 ? (
                          <div className="text-center text-[10px] text-text-dim italic py-3 bg-black/10 border border-dashed border-border-dark/40 rounded-xl">
                            Chưa có đợt tạm ứng nào được ghi nhận.
                          </div>
                        ) : (
                          <div className="max-h-[150px] overflow-y-auto custom-scrollbar border border-border-dark/50 rounded-xl bg-black/20 text-[10.5px]">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-border-dark/40 bg-white/5 font-bold uppercase text-[9px] text-text-dim">
                                  <th className="p-2 w-20">Ngày</th>
                                  <th className="p-2 text-right w-24">Số tiền</th>
                                  <th className="p-2">Chứng từ & Nội dung</th>
                                  <th className="p-2 w-8 text-center">Xóa</th>
                                </tr>
                              </thead>
                              <tbody>
                                {advanceHistory.map((item) => (
                                  <tr key={item.id} className="border-b border-border-dark/20 hover:bg-white/5 transition-colors font-semibold">
                                    <td className="p-2 text-text-dim whitespace-nowrap">
                                      {item.date ? item.date.split('-').reverse().join('/') : '---'}
                                    </td>
                                    <td className="p-2 text-right text-emerald-400 font-bold whitespace-nowrap">
                                      {formatVNNumber(String(item.amount))}đ
                                    </td>
                                    <td className="p-2 leading-relaxed text-white">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold whitespace-normal break-words">{item.doc || '---'}</span>
                                        {item.fileUrl && (
                                          <a
                                            href={item.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center text-emerald-400 hover:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all gap-0.5"
                                          >
                                            <ExternalLink className="size-2.5" />
                                            Xem file
                                          </a>
                                        )}
                                      </div>
                                      <div className="text-[9.5px] text-text-dim font-medium whitespace-normal break-words">{item.note || '---'}</div>
                                    </td>
                                    <td className="p-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => setAdvanceHistory(prev => prev.filter(x => x.id !== item.id))}
                                        className="p-1 text-text-dim hover:text-red-500 rounded transition-colors inline-flex items-center justify-center"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/35 rounded-2xl p-5 border border-border-dark/80 shrink-0">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Tổng giá trị hợp đồng (Hóa đơn)</span>
                    <div className="text-xl font-black text-[#FF7A00]">{formatCurrency(totalInvoiceSum)}</div>
                    <div className="text-[9px] text-text-dim leading-normal italic font-semibold whitespace-normal break-words">{numberToVietnameseWords(totalInvoiceSum)}</div>
                  </div>
                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-border-dark/40 pt-3 md:pt-0 md:pl-6">
                    <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Tổng số tiền đã tạm ứng</span>
                    <div className="text-xl font-black text-emerald-400">{formatCurrency(totalAdvanceSum)}</div>
                    <div className="text-[9px] text-text-dim leading-normal italic font-semibold whitespace-normal break-words">{totalAdvanceSum > 0 ? numberToVietnameseWords(totalAdvanceSum) : '---'}</div>
                  </div>
                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-border-dark/40 pt-3 md:pt-0 md:pl-6">
                    <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Số tiền còn lại cần thanh toán</span>
                    <div className="text-xl font-black text-blue-400">{formatCurrency(remainingSum)}</div>
                    <div className="text-[9px] text-text-dim leading-normal italic font-semibold whitespace-normal break-words">{remainingSum > 0 ? numberToVietnameseWords(remainingSum) : '---'}</div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFinancialModalOpen(false)}
                  className="px-6 py-2.5 bg-[#27272a] hover:bg-[#3f3f46] text-white rounded-xl text-xs font-black tracking-wider border border-white/5 transition-all active:scale-95"
                >
                  HỦY BỎ
                </button>
                <button
                  type="button"
                  onClick={handleSaveFinancials}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black tracking-wider transition-all active:scale-95 shadow-lg shadow-orange-500/20 flex items-center gap-1.5"
                >
                  <Save className="size-4" />
                  CẬP NHẬT DỮ LIỆU
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ContractManagementView = ({
  contracts,
  partners,
  onDelete,
  onBulkDelete,
  searchTerm,
  onSearchChange,
  onDownload,
  onUpdateFormData
}: {
  contracts: SmartContract[],
  partners: Partner[],
  onDelete: (id: string) => void,
  onBulkDelete: (ids: string[]) => void,
  searchTerm: string,
  onSearchChange: (val: string) => void,
  onDownload: (contract: SmartContract) => void,
  onUpdateFormData?: (id: string, updatedFormData: Record<string, string>) => void
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredContracts = contracts.filter(c =>
    c.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.templateId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getPartyName(c.partyAId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getPartyName(c.partyBId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredContracts.length) setSelectedIds([]);
    else setSelectedIds(filteredContracts.map(c => c.id));
  };

  const getPartyName = (id: string) => {
    return partners.find(p => p.id === id)?.name || 'N/A';
  };

  // Dynamic state-mapping helpers for contract form data
  const getContractValue = (data: Record<string, string>) => getContractValueStandalone(data);
  const getContractSignDate = (data: Record<string, string>) => getContractSignDateStandalone(data);
  const getContractNumber = (data: Record<string, string>) => getContractNumberStandalone(data);
  const getProjectName = (data: Record<string, string>) => getProjectNameStandalone(data);
  const getContractNote = (data: Record<string, string>) => getContractNoteStandalone(data);
  const parseValue = (valStr: string) => parseValueStandalone(valStr);
  const formatCurrency = (val: number) => formatCurrencyStandalone(val);

  return (
    <div className="space-y-6">
      {/* Contract List Container */}
      <div className="bg-card-dark rounded-[32px] border border-border-dark overflow-hidden shadow-2xl p-6">

        {/* Title Block Header (Directly from layout of image_11.png) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border-dark/60 mb-6">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h2 className="text-lg font-black uppercase text-white tracking-widest flex items-center gap-2">
              DANH SÁCH HỢP ĐỒNG HỆ THỐNG
            </h2>
            <p className="text-[11px] text-text-dim font-semibold italic uppercase tracking-wider opacity-85">
              Hệ thống đang lưu trữ {contracts.length} Hợp đồng đã đối chiếu PDF/Ảnh thành công. Ho Chi Minh City, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, 6:30 PM
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 shrink-0" onClick={e => e.stopPropagation()}>
            {/* Search Input on the same row! */}
            <div className="relative w-72">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-black/40 border border-border-dark rounded-xl text-xs focus:outline-none focus:border-primary/50 transition-all font-bold text-white placeholder:text-text-dim/60 shadow-inner"
              />
            </div>

            {/* Bulk delete action next to search bar */}
            {selectedIds.length > 0 && (
              <button
                onClick={() => {
                  if (isDeletingBulk) {
                    onBulkDelete(selectedIds);
                    setSelectedIds([]);
                    setIsDeletingBulk(false);
                  } else {
                    setIsDeletingBulk(true);
                    setTimeout(() => setIsDeletingBulk(false), 3000);
                  }
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border transition-all shadow-lg shrink-0",
                  isDeletingBulk ? "bg-red-500 text-white border-red-500 animate-pulse shadow-red-500/20" : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                )}
              >
                <Trash2 className="size-3.5" />
                {isDeletingBulk ? "Xác nhận xóa" : `Xóa ${selectedIds.length} HĐ`}
              </button>
            )}

            {/* Master Select Checkbox */}
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

        {/* List Layout Column Labels */}
        <div className="flex items-center gap-6 px-6 pb-4 border-b border-border-dark/40 text-[10px] font-black text-text-dim uppercase tracking-[0.2em] leading-none select-none">
          <div className="w-8 shrink-0 flex justify-center">
            {/* Align spacer for row checkbox */}
          </div>
          <div className="flex-[1.5] min-w-[180px] pl-4">Tên Hợp đồng</div>
          <div className="flex-[1.2] min-w-[150px]">Đối tác</div>
          <div className="flex-[2] min-w-[220px]">Thông tin chi tiết</div>
          <div className="w-28 shrink-0 pl-2">Ngày tạo</div>
          <div className="w-10 shrink-0"></div>
        </div>

        {/* Cards Row List */}
        <div className="space-y-4 mt-6">
          {filteredContracts.length === 0 ? (
            <div className="p-32 text-center">
              <div className="size-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-border-dark shadow-2xl">
                <Briefcase className="size-10 text-text-dim" />
              </div>
              <h3 className="text-white font-black mb-2 uppercase text-base tracking-widest">Không có dữ liệu</h3>
              <p className="text-text-dim text-xs font-bold italic">Tạo hợp đồng mới trong tab "Tạo hợp đồng" để bắt đầu lưu trữ.</p>
            </div>
          ) : (
            filteredContracts.map((contract) => (
              <ContractManagementCard
                key={contract.id}
                contract={contract}
                partners={partners}
                isSelected={selectedIds.includes(contract.id)}
                toggleSelect={() => toggleSelect(contract.id)}
                isExpanded={expandedId === contract.id}
                toggleExpand={() => setExpandedId(expandedId === contract.id ? null : contract.id)}
                onDownload={onDownload}
                onDelete={onDelete}
                onUpdateFormData={onUpdateFormData}
                getContractValue={getContractValue}
                getContractSignDate={getContractSignDate}
                getContractNumber={getContractNumber}
                getProjectName={getProjectName}
                getContractNote={getContractNote}
                parseValue={parseValue}
                formatCurrency={formatCurrency}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// --- Supabase Data Mapping Helpers ---
const mapInvoiceToSupabase = (updates: any) => {
  const extData = updates.extractedData;
  const mapped: any = {};
  if (updates.status !== undefined) mapped.status = updates.status;
  if (updates.fileName !== undefined) mapped.file_name = updates.fileName;
  if (updates.fileType !== undefined) mapped.file_type = updates.fileType;

  if (updates.fileURL !== undefined || updates.storagePath !== undefined) {
    // Store URLs inside extractedData
    const nextExtData = extData || {};
    if (updates.fileURL !== undefined) nextExtData.fileURL = updates.fileURL;
    if (updates.storagePath !== undefined) nextExtData.storagePath = updates.storagePath;
    mapped.extracted_data = nextExtData;
  }

  if (extData) {
    mapped.extracted_data = extData;
    mapped.line_items = extData.items || null;
    mapped.contract_number = extData.invoice?.contractNumber || extData.contractNumber || updates.contractNumber || null;
    mapped.contract_date = extData.invoice?.contractDate || extData.contractDate || updates.contractDate || null;
    mapped.seller_name = extData.seller?.name || updates.sellerName || null;
    mapped.buyer_name = extData.buyer?.name || updates.buyerName || null;
    mapped.seller_tax_code = extData.seller?.taxCode || updates.sellerTaxCode || null;
    mapped.buyer_tax_code = extData.buyer?.taxCode || updates.buyerTaxCode || null;
    mapped.category = extData.classification || updates.category || null;
    mapped.type = extData.invoice?.type || updates.type || null;

    let totalAmt = extData.totals?.total || extData.totals?.subtotal || updates.totalAmount || null;
    if (typeof totalAmt === 'string') {
      totalAmt = parseFloat(totalAmt.replace(/[^0-9.-]/g, '')) || null;
    }
    mapped.total_amount = totalAmt;
  } else {
    if (updates.contractNumber !== undefined) mapped.contract_number = updates.contractNumber;
    if (updates.contractDate !== undefined) mapped.contract_date = updates.contractDate;
    if (updates.sellerName !== undefined) mapped.seller_name = updates.sellerName;
    if (updates.buyerName !== undefined) mapped.buyer_name = updates.buyerName;
    if (updates.sellerTaxCode !== undefined) mapped.seller_tax_code = updates.sellerTaxCode;
    if (updates.buyerTaxCode !== undefined) mapped.buyer_tax_code = updates.buyerTaxCode;
    if (updates.category !== undefined) mapped.category = updates.category;
    if (updates.type !== undefined) mapped.type = updates.type;
    if (updates.totalAmount !== undefined) mapped.total_amount = updates.totalAmount;
  }
  return mapped;
};

// --- View: Dashboard ---
const DashboardView = ({
  stats,
  user,
  onSelectInvoice,
  onDeleteInvoice,
  onExportExcel,
  onBulkExport,
  isExportingExcel,
  isLoadingData,
  subTab,
  onSubTabChange,
  generatedDocs,
  contracts,
  invoices,
  partners,
  onDeleteDoc,
  onBulkDeleteDocs,
  onDeleteAllDocs,
  onDownloadDoc,
  onDeleteContract,
  onBulkDeleteContracts,
  onDownloadContract,
  onUpdateContractFormData,
  rankMap,
  fetchInvoices,
  fetchGeneratedDocs,
  onExtractDraft,
  normalizeExtractedData,
  fileSearchTerm,
  setFileSearchTerm
}: {
  stats: any,
  user: any,
  onSelectInvoice: (inv: any) => void,
  onDeleteInvoice: (id: string) => void,
  onExportExcel: () => void,
  onBulkExport: () => void,
  isExportingExcel: boolean,
  isLoadingData: boolean,
  subTab: 'invoices' | 'contracts',
  onSubTabChange: (tab: 'invoices' | 'contracts') => void,
  generatedDocs: GeneratedDoc[],
  contracts: SmartContract[],
  invoices: Invoice[],
  partners: Partner[],
  onDeleteDoc: (id: string) => void,
  onBulkDeleteDocs: (ids: string[]) => void,
  onDeleteAllDocs: () => void,
  onDownloadDoc: (docItem: GeneratedDoc) => void,
  onDeleteContract: (id: string) => void,
  onBulkDeleteContracts: (ids: string[]) => void,
  onDownloadContract: (contract: SmartContract) => void,
  onUpdateContractFormData?: (id: string, updatedFormData: Record<string, string>) => void,
  rankMap: Map<string, number>,
  fetchInvoices: (uid: string) => Promise<void>,
  fetchGeneratedDocs: (uid: string) => Promise<void>,
  onExtractDraft?: (id: string) => Promise<void>,
  normalizeExtractedData: (data: any) => any,
  fileSearchTerm: string,
  setFileSearchTerm: (term: string) => void
}) => {
  const { toast, removeToast } = useToast();
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [docSearchTerm, setDocSearchTerm] = useState('');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    yearFilter: '',
    quarter: '',
    buyers: [] as string[],
    dateType: 'discrete',
    day: '',
    month: '',
    year: '',
    fromDate: '',
    toDate: '',
    missingContract: false,
    statuses: [] as string[],
    sources: [] as string[],
    priceFilter: '' // '' | 'under20' | 'above20'
  });

  const [tempFilters, setTempFilters] = useState({ ...activeFilters });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isFilterOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  const activeFiltersHasValues = useMemo(() => {
    return !!(
      activeFilters.yearFilter ||
      activeFilters.quarter ||
      activeFilters.buyers.length > 0 ||
      activeFilters.day ||
      activeFilters.month ||
      activeFilters.year ||
      activeFilters.fromDate ||
      activeFilters.toDate ||
      activeFilters.missingContract ||
      activeFilters.statuses.length > 0 ||
      activeFilters.sources.length > 0 ||
      activeFilters.priceFilter
    );
  }, [activeFilters]);

  const handleOpenFilter = () => {
    setTempFilters({ ...activeFilters });
    setIsFilterOpen(!isFilterOpen);
  };

  const handleApplyFilters = () => {
    setActiveFilters({ ...tempFilters });
    setIsFilterOpen(false);
  };

  const handleClearFilters = () => {
    const cleared = {
      yearFilter: '',
      quarter: '',
      buyers: [] as string[],
      dateType: 'discrete',
      day: '',
      month: '',
      year: '',
      fromDate: '',
      toDate: '',
      missingContract: false,
      statuses: [] as string[],
      sources: [] as string[],
      priceFilter: ''
    };
    setTempFilters({ ...cleared });
    setActiveFilters({ ...cleared });
    setIsFilterOpen(false);
  };

  // States for background PDF extraction and queue
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [pendingPdfFiles, setPendingPdfFiles] = useState<Array<{ name: string; url: string }>>([]);
  const [syncQueue, setSyncQueue] = useState<Array<{
    name: string;
    url: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    error?: string;
  }>>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'scanning' | 'extracting' | 'paused' | 'completed' | 'error'>('idle');
  const [currentSyncingIndex, setCurrentSyncingIndex] = useState(-1);
  const [delayCountdown, setDelayCountdown] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const enrichedInvoices = useMemo(() => {
    return (stats.recentInvoices || []).map((inv: any) => getEnrichedInvoice(inv, rankMap));
  }, [stats.recentInvoices, rankMap]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    enrichedInvoices.forEach((i: any) => {
      const dateStr = i.extractedData?.invoice?.date || i.extractedData?.date || '';
      if (dateStr) {
        const t = parseInvoiceDate(dateStr);
        if (t) {
          const y = new Date(t).getFullYear().toString();
          if (y && y !== '1970') {
            yearsSet.add(y);
          }
        }
      }
    });
    return Array.from(yearsSet).sort();
  }, [enrichedInvoices]);

  const pdfFiles = enrichedInvoices.filter((i: any) => {
    if (i.fileType !== 'pdf') return false;
    const term = fileSearchTerm.toLowerCase().trim();
    if (!term) return true;

    // 1. Check exact or prefix match for the extracted invoice number
    // (e.g. "12" matches "12", "123", but not "201" or "412")
    if (i.computedInvoiceNumber) {
      if (i.computedInvoiceNumber === term) return true;
      if (i.computedInvoiceNumber.startsWith(term)) return true;
    }

    // 2. Check if term matches company name
    const company = (i.extractedData?.seller?.name || '').toLowerCase();
    if (company.includes(term)) return true;

    // 3. Fallback to display name words, but ONLY if the term is NOT purely numeric
    // This prevents "12" from matching rank "12" if we only want invoice numbers.
    // Actually, users might want to search by rank? No, usually by invoice number.
    const isNumeric = /^\d+$/.test(term);
    if (!isNumeric) {
      const words = i.computedDisplayName.toLowerCase().split(/[\s:.-]+/);
      if (words.includes(term)) return true;
      if (i.fileName?.toLowerCase().includes(term)) return true;
    }

    return false;
  });

  const xmlFiles = enrichedInvoices.filter((i: any) => {
    if (i.fileType !== 'xml') return false;
    const term = docSearchTerm.toLowerCase().trim();
    if (!term) return true;

    // 1. Check exact or prefix match for the extracted invoice number
    if (i.computedInvoiceNumber) {
      if (i.computedInvoiceNumber === term) return true;
      if (i.computedInvoiceNumber.startsWith(term)) return true;
    }

    // 2. Check if term matches company name
    const company = (i.extractedData?.seller?.name || '').toLowerCase();
    if (company.includes(term)) return true;

    const isNumeric = /^\d+$/.test(term);
    if (!isNumeric) {
      const words = i.computedDisplayName.toLowerCase().split(/[\s:.-]+/);
      if (words.includes(term)) return true;
      if (i.fileName?.toLowerCase().includes(term)) return true;
    }

    return false;
  });

  const filteredInvoices = useMemo(() => {
    let result = enrichedInvoices;

    // 1. Text Search Filter (fileSearchTerm)
    const term = fileSearchTerm.toLowerCase().trim();
    if (term) {
      result = result.filter((i: any) => {
        if (i.computedInvoiceNumber) {
          if (i.computedInvoiceNumber === term) return true;
          if (i.computedInvoiceNumber.startsWith(term)) return true;
        }

        const seller = (i.extractedData?.seller?.name || '').toLowerCase();
        const buyer = (i.extractedData?.buyer?.name || '').toLowerCase();
        if (seller.includes(term) || buyer.includes(term)) return true;

        const contract = (i.contractNumber || i.extractedData?.contractNumber || '').toLowerCase();
        if (contract.includes(term)) return true;

        const isNumeric = /^\d+$/.test(term);
        if (!isNumeric) {
          const words = (i.computedDisplayName || '').toLowerCase().split(/[\s:.-]+/);
          if (words.includes(term)) return true;
          if (i.fileName?.toLowerCase().includes(term)) return true;
        }
        return false;
      });
    }

    // 2. Active Popover Filters (AND logic between sections)

    // Year Filter above Quarters
    if (activeFilters.yearFilter) {
      result = result.filter((i: any) => {
        const dateStr = i.extractedData?.invoice?.date || i.extractedData?.date || '';
        if (!dateStr) return false;
        const t = parseInvoiceDate(dateStr);
        if (!t) return false;
        const y = new Date(t).getFullYear().toString();
        return y === activeFilters.yearFilter;
      });
    }

    // A. Quý (Quarter)
    if (activeFilters.quarter) {
      result = result.filter((i: any) => {
        const dateStr = i.extractedData?.invoice?.date || i.extractedData?.date || '';
        if (!dateStr) return false;
        const t = parseInvoiceDate(dateStr);
        if (!t) return false;
        const parsedDate = new Date(t);
        const month = parsedDate.getMonth() + 1; // 1-indexed (1 to 12)
        if (activeFilters.quarter === 'Q1') return month >= 1 && month <= 3;
        if (activeFilters.quarter === 'Q2') return month >= 4 && month <= 6;
        if (activeFilters.quarter === 'Q3') return month >= 7 && month <= 9;
        if (activeFilters.quarter === 'Q4') return month >= 10 && month <= 12;
        return true;
      });
    }

    // B. Bên Mua (Buyer)
    if (activeFilters.buyers.length > 0) {
      result = result.filter((i: any) => {
        const buyerName = (i.extractedData?.buyer?.name || '').toLowerCase().trim();
        return activeFilters.buyers.some(selectedBuyer =>
          buyerName.includes(selectedBuyer.toLowerCase().trim())
        );
      });
    }

    // C. Linh hoạt theo Thời gian (Date/Time Filter)
    if (activeFilters.day || activeFilters.month || activeFilters.year) {
      result = result.filter((i: any) => {
        const dateStr = i.extractedData?.invoice?.date || i.extractedData?.date || '';
        if (!dateStr) return false;
        const t = parseInvoiceDate(dateStr);
        if (!t) return false;
        const parsedDate = new Date(t);

        const d = parsedDate.getDate();
        const m = parsedDate.getMonth() + 1;
        const y = parsedDate.getFullYear();

        if (activeFilters.day && d !== parseInt(activeFilters.day)) return false;
        if (activeFilters.month && m !== parseInt(activeFilters.month)) return false;
        if (activeFilters.year && y !== parseInt(activeFilters.year)) return false;

        return true;
      });
    }

    if (activeFilters.fromDate || activeFilters.toDate) {
      result = result.filter((i: any) => {
        const dateStr = i.extractedData?.invoice?.date || i.extractedData?.date || '';
        if (!dateStr) return false;
        const t = parseInvoiceDate(dateStr);
        if (!t) return false;

        if (activeFilters.fromDate) {
          const fromT = new Date(activeFilters.fromDate).getTime();
          if (t < fromT) return false;
        }
        if (activeFilters.toDate) {
          const toT = new Date(activeFilters.toDate).getTime();
          // Make toDate inclusive
          if (t > toT + 24 * 60 * 60 * 1000) return false;
        }
        return true;
      });
    }

    // D. Thiếu Thông tin (Missing Contract Data)
    if (activeFilters.missingContract) {
      result = result.filter((i: any) => {
        const contractNo = i.contractNumber || i.extractedData?.contractNumber || '';
        const contractDt = i.contractDate || i.extractedData?.contractDate || '';

        const hasNo = !contractNo || contractNo.trim() === '' || contractNo === '---';
        const hasDt = !contractDt || contractDt.trim() === '' || contractDt === '---';

        return hasNo || hasDt;
      });
    }

    // E. Trạng thái & Nguồn (Status & Source)
    if (activeFilters.statuses.length > 0) {
      result = result.filter((i: any) => {
        const classification = typeof i.extractedData?.classification === 'object' ? i.extractedData.classification.type : (i.extractedData?.classification || 'BB_VT');
        return activeFilters.statuses.includes(classification);
      });
    }

    if (activeFilters.sources.length > 0) {
      result = result.filter((i: any) => {
        const fileType = (i.fileType || '').toUpperCase().trim();
        return activeFilters.sources.includes(fileType);
      });
    }

    // F. Lọc theo Khoảng Giá trị
    if (activeFilters.priceFilter) {
      result = result.filter((i: any) => {
        const grandTotal = Number(i.extractedData?.totals?.grandTotal) || 0;
        if (activeFilters.priceFilter === 'under20') {
          return grandTotal < 20000000;
        } else if (activeFilters.priceFilter === 'above20') {
          return grandTotal >= 20000000;
        }
        return true;
      });
    }

    return result;
  }, [enrichedInvoices, fileSearchTerm, activeFilters]);

  const handleUpdateInvoice = useCallback(async (id: string, data: any) => {
    try {
      const currentInvoice = invoices.find(i => i.id === id);
      let extData = currentInvoice?.extractedData ? { ...currentInvoice.extractedData } : {};

      if (data.date !== undefined) {
        if (!extData.invoice) extData.invoice = {};
        extData.invoice.date = data.date;
        extData.date = data.date;
      }

      if (data.contractNumber !== undefined) {
        if (!extData.invoice) extData.invoice = {};
        extData.invoice.contractNumber = data.contractNumber;
        extData.contractNumber = data.contractNumber;
      }

      if (data.contractDate !== undefined) {
        if (!extData.invoice) extData.invoice = {};
        extData.invoice.contractDate = data.contractDate;
        extData.contractDate = data.contractDate;
      }

      const mapped = mapInvoiceToSupabase({
        ...data,
        extractedData: extData
      });

      const { error } = await supabase.from('invoices').update(mapped).eq('id', id);
      if (error) throw error;
      if (user) fetchInvoices(user.uid);
    } catch (error) {
      console.error('Update error:', error);
    }
  }, [user, invoices]);

  const handleSyncFromDrive = async () => {
    if (!user) {
      toast("Vui lòng đăng nhập trước khi thực hiện.", "error");
      return;
    }

    const gasUrl = (import.meta as any).env.VITE_GAS_WEB_APP_URL;
    if (!gasUrl) {
      toast("Chưa cấu hình Google Apps Script URL.", "error");
      return;
    }

    setIsSyncingDrive(true);
    setSyncStatus('scanning');
    let toastId = toast("Đang quét các hóa đơn mới trên Google Drive...", "loading");

    try {
      // 1. Fetch file list from Google Drive
      const res = await fetch(gasUrl, {
        method: "POST",
        body: JSON.stringify({ action: "list_files" })
      });

      if (!res.ok) throw new Error("Không thể kết nối đến Google Apps Script.");
      const responseText = await res.text();
      let filesData;
      try {
        filesData = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Dữ liệu trả về từ máy chủ không hợp lệ.");
      }

      if (!filesData.success || !Array.isArray(filesData.files)) {
        throw new Error(filesData.error || "Không thể lấy danh sách file.");
      }

      const driveFiles = filesData.files; // Array of { name, url }
      console.log("Drive files found:", driveFiles.length);

      if (driveFiles.length === 0) {
        removeToast(toastId);
        toast("Thư mục Google Drive trống. Hãy tải file lên trước.", "info");
        setIsSyncingDrive(false);
        setSyncStatus('idle');
        return;
      }

      // 2. Identify unmatched files (files on Drive not matching any record in Supabase by name)
      const unmatchedFiles = driveFiles.filter(df => {
        return !invoices.some(inv => inv.fileName.trim().toLowerCase() === df.name.trim().toLowerCase());
      });

      if (unmatchedFiles.length === 0) {
        removeToast(toastId);
        toast("Tất cả hóa đơn trên Drive đã được đồng bộ trước đó.", "info");
        setIsSyncingDrive(false);
        setSyncStatus('idle');
        return;
      }

      // Separate XML and PDF files
      const newXmlFiles = unmatchedFiles.filter(f => f.name.split('.').pop()?.toLowerCase() === 'xml');
      const newPdfFiles = unmatchedFiles.filter(f => f.name.split('.').pop()?.toLowerCase() === 'pdf');

      let xmlSuccessCount = 0;
      let xmlErrorCount = 0;

      // 3. Process XML files automatically (Luồng xử lý Hóa đơn XML - Phân tích Client không dùng AI)
      if (newXmlFiles.length > 0) {
        removeToast(toastId);
        toastId = toast(`Đang tự động bóc tách ${newXmlFiles.length} hóa đơn XML...`, "loading");

        for (const xmlFile of newXmlFiles) {
          try {
            // Get raw XML text content from GAS
            const contentRes = await fetch(gasUrl, {
              method: "POST",
              body: JSON.stringify({ action: "get_file_content", fileName: xmlFile.name })
            });
            if (!contentRes.ok) throw new Error("Không thể kết nối API Google Apps Script.");

            const contentData = await contentRes.json();
            if (!contentData.success || !contentData.content) {
              throw new Error(contentData.error || "Tệp XML rỗng.");
            }

            // Parse XML on client side
            let parsedData = await parseInvoiceXml(contentData.content);
            parsedData = normalizeExtractedData(parsedData);

            // Run local keyword-based classification
            if (parsedData.items) {
              const { classifyInvoice } = await import('./lib/mistral');
              parsedData.classification = await classifyInvoice(parsedData.items);
            }

            // Map and save to Supabase directly as 'completed'
            const mapped = mapInvoiceToSupabase({
              status: 'completed',
              fileName: xmlFile.name,
              fileType: 'xml',
              fileURL: contentData.url || xmlFile.url,
              extractedData: parsedData
            });

            mapped.owner_id = user.uid;
            mapped.created_at = new Date().toISOString();
            mapped.updated_at = new Date().toISOString();

            const { error: insertError } = await supabase.from('invoices').insert(mapped);
            if (insertError) throw insertError;

            xmlSuccessCount++;
          } catch (xmlErr: any) {
            console.error(`Lỗi bóc tách XML tự động (${xmlFile.name}):`, xmlErr);
            xmlErrorCount++;
          }
        }

        // Live refresh invoices in real time
        await fetchInvoices(user.uid);
      }

      // Show toast notifications for XML sync results
      removeToast(toastId);
      if (xmlSuccessCount > 0) {
        toast(`Đã tự động đồng bộ thành công ${xmlSuccessCount} hóa đơn XML mới!`, "success");
      }
      if (xmlErrorCount > 0) {
        toast(`Có ${xmlErrorCount} hóa đơn XML gặp lỗi trong lúc bóc tách tự động.`, "error");
      }

      // 4. Handle PDF files (Đồng bộ PDF 2 bước: quét và chuẩn bị để duyệt trích xuất)
      if (newPdfFiles.length > 0) {
        setPendingPdfFiles(newPdfFiles);
        setSyncQueue(newPdfFiles.map(f => ({
          name: f.name,
          url: f.url,
          status: 'pending'
        })));
        setIsSyncModalOpen(true);
        setIsMinimized(false);
        setSyncStatus('idle'); // Wait for user action to start AI extraction
      } else {
        setIsSyncingDrive(false);
        setSyncStatus('idle');
        if (newXmlFiles.length === 0) {
          toast("Không tìm thấy hóa đơn mới nào trên Drive.", "info");
        }
      }

    } catch (err: any) {
      console.error("Sync scan error:", err);
      removeToast(toastId);
      toast("Lỗi đồng bộ Drive: " + (err.message || err.toString()), "error");
      setIsSyncingDrive(false);
      setSyncStatus('idle');
    }
  };

  // Hàm trích xuất dữ liệu PDF chạy ngầm theo đợt (Rate Limit 8 file / 1 phút)
  const startBackgroundPdfExtraction = async () => {
    if (syncStatus === 'extracting') return;

    setSyncStatus('extracting');
    setCurrentSyncingIndex(0);

    let currentIdx = 0;
    const queueCopy = [...syncQueue];
    let successfulCount = 0;
    let failedCount = 0;

    const gasUrl = (import.meta as any).env.VITE_GAS_WEB_APP_URL;
    if (!gasUrl) {
      toast("Chưa cấu hình Google Apps Script URL.", "error");
      setSyncStatus('error');
      return;
    }

    while (currentIdx < queueCopy.length) {
      // Cơ chế chia đợt (Rate Limit): Cứ sau 8 file thì tạm dừng nghỉ 1 phút (60 giây)
      if (currentIdx > 0 && currentIdx % 8 === 0) {
        setSyncStatus('paused');
        setDelayCountdown(60);

        for (let cd = 60; cd > 0; cd--) {
          setDelayCountdown(cd);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        setDelayCountdown(0);
        setSyncStatus('extracting');
      }

      setCurrentSyncingIndex(currentIdx);
      queueCopy[currentIdx].status = 'processing';
      setSyncQueue([...queueCopy]);

      const fileToProcess = queueCopy[currentIdx];

      try {
        // Bước 1: Khởi tạo bản ghi với trạng thái 'processing'
        const initialInvoiceData: any = {
          file_name: fileToProcess.name,
          file_type: 'pdf',
          status: 'processing',
          owner_id: user.uid,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: insertedInv, error: insertError } = await supabase
          .from('invoices')
          .insert(initialInvoiceData)
          .select('id')
          .single();

        if (insertError || !insertedInv) {
          throw new Error("Không thể khởi tạo bản ghi trong Supabase: " + (insertError?.message || "unknown"));
        }

        const invoiceId = insertedInv.id;

        // Bước 2: Gọi API trích xuất (Mistral OCR + AI Large)
        const extractRes = await fetch(gasUrl, {
          method: "POST",
          body: JSON.stringify({ action: "extract_file", fileName: fileToProcess.name })
        });

        if (!extractRes.ok) {
          throw new Error("Không thể kết nối đến API trích xuất.");
        }

        const extractText = await extractRes.text();
        let extractedData;
        try {
          extractedData = JSON.parse(extractText);
        } catch (e) {
          throw new Error("Dữ liệu bóc tách không hợp lệ.");
        }

        if (extractedData.error) {
          throw new Error(extractedData.error);
        }

        // Bước 3: Chuẩn hóa dữ liệu và lưu làm 'completed'
        const normalized = normalizeExtractedData(extractedData);

        // Check if there is an existing XML invoice in the system with the same number and total amount
        const pdfNum = normalized.invoice?.number || normalized.soHoaDon || '';
        const pdfDisplayNum = pdfNum ? pdfNum.toString().replace(/^0+/, '') : '';
        const pdfAmt = Number(normalized.totals?.grandTotal || normalized.totals?.total || 0);

        const isDuplicateOfXml = invoices.some(inv => {
          if (inv.fileType !== 'xml') return false;
          let xmlNum = inv.extractedData?.invoice?.number || inv.extractedData?.soHoaDon || '';
          if (!xmlNum) {
            const match = inv.fileName?.match(/(\d+)(?=\.(pdf|xml)$)/i);
            if (match && match[1]) xmlNum = match[1];
          }
          const xmlDisplayNum = xmlNum ? xmlNum.toString().replace(/^0+/, '') : '';
          const xmlAmt = Number(inv.totalAmount || inv.extractedData?.totals?.grandTotal || 0);

          return xmlDisplayNum === pdfDisplayNum && Math.abs(xmlAmt - pdfAmt) < 0.01;
        });

        if (isDuplicateOfXml) {
          console.log(`Detected duplicate PDF: ${fileToProcess.name} matches an existing XML invoice. Deleting initialized database record...`);
          // Delete the temporary record we created
          await supabase.from('invoices').delete().eq('id', invoiceId);
          queueCopy[currentIdx].status = 'completed'; // Skip the item and mark as complete in sync status
          setSyncQueue([...queueCopy]);
          currentIdx++;
          successfulCount++; // count as processed (skipped successfully)
          continue;
        }

        const mapped = mapInvoiceToSupabase({
          status: 'completed',
          fileURL: extractedData.driveUrl || fileToProcess.url,
          extractedData: normalized
        });

        const { error: updateError } = await supabase
          .from('invoices')
          .update(mapped)
          .eq('id', invoiceId);

        if (updateError) throw updateError;

        queueCopy[currentIdx].status = 'completed';
        successfulCount++;
      } catch (err: any) {
        console.error(`Lỗi trích xuất file PDF (${fileToProcess.name}):`, err);
        queueCopy[currentIdx].status = 'error';
        queueCopy[currentIdx].error = err.message || err.toString();
        failedCount++;
      }

      setSyncQueue([...queueCopy]);
      currentIdx++;
    }

    // Đã hoàn tất toàn bộ hàng đợi trích xuất!
    setSyncStatus('completed');
    setCurrentSyncingIndex(-1);
    setIsSyncingDrive(false);

    // Tự động làm mới bảng hóa đơn trên giao diện trong thời gian thực
    await fetchInvoices(user.uid);

    toast(`Đã trích xuất AI hoàn tất! Thành công: ${successfulCount}, Lỗi: ${failedCount}`, "success");
  };

  const handleGenerateDoc = useCallback(async (inv: any, overrides?: { contractNumber?: string, contractDate?: string }) => {
    if (!user) {
      alert("Bạn cần đăng nhập để tạo biên bản.");
      return;
    }
    const rawClass = inv.extractedData?.classification;
    const tType = typeof rawClass === 'object' ? rawClass.type : (rawClass || 'BB_VT');

    // Find partners
    const pA = partners.find(p => p.taxCode === inv.extractedData?.seller?.taxCode) || {};
    const pB = partners.find(p => p.taxCode === inv.extractedData?.buyer?.taxCode) || {};

    // Auto-extract contract info for Construction (BB_TC) if not already present
    let finalContractNum = overrides?.contractNumber || inv.contractNumber;
    let finalContractDate = overrides?.contractDate || inv.contractDate;

    if (tType === 'BB_TC' && (!finalContractNum || !finalContractDate)) {
      const fullText = (inv.extractedData?.items || []).map((item: any) => item.description).join(' ');
      const numMatch = fullText.match(/Hợp đồng Số:\s*([^\s,;]+)/i);
      const dateMatch = fullText.match(/ngày\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);

      if (!finalContractNum && numMatch) finalContractNum = numMatch[1];
      if (!finalContractDate && dateMatch) finalContractDate = dateMatch[1];
    }

    try {
      const templateBuffer = await getTemplateBuffer(tType);
      const blob = await generateDocxBlob({
        templateBuffer,
        templateType: tType,
        data: inv.extractedData,
        partnerA: pA,
        partnerB: pB,
        contractNumber: finalContractNum,
        contractDate: finalContractDate
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tType}_${inv.fileName.split('.')[0]}.docx`;
      a.click();

      const { error: genDocError } = await supabase.from('generated_docs').insert({
        invoice_id: inv.id,
        template_type: tType,
        file_name: `${tType}_${inv.fileName.split('.')[0]}.docx`,
        owner_id: user.uid,
        created_at: new Date().toISOString()
      });
      if (genDocError) throw genDocError;
      fetchGeneratedDocs(user.uid);
    } catch (err: any) {
      alert(err.message || "Generation failed.");
    }
  }, [user, partners]);

  const renderInvoiceList = (items: any[], placement: 'left' | 'right' = 'right') => {
    const sortedItems = [...items].sort((a, b) => {
      const dateA = a.extractedData?.invoice?.date || a.extractedData?.date || '';
      const dateB = b.extractedData?.invoice?.date || b.extractedData?.date || '';
      const tA = parseInvoiceDate(dateA);
      const tB = parseInvoiceDate(dateB);
      return tA - tB; // chronological oldest -> newest
    });

    const mappedItems: ExtendedInvoiceItem[] = sortedItems.map((inv: any) => {
      const displayInvoiceNumber = inv.computedInvoiceNumber || '';
      const displaySymbol = inv.computedInvoiceSymbol || inv.extractedData?.invoice?.serial || '';

      // Auto-extract contract details from line items if not already present in the database
      let extractedContractNumber = inv.contractNumber || '';
      let extractedContractDate = inv.contractDate || '';

      if (!extractedContractNumber || !extractedContractDate) {
        const lineItems = inv.extractedData?.items || [];
        const fullText = lineItems.map((item: any) => item.description || item.name || '').join(' ');

        if (!extractedContractNumber) {
          const numMatch = fullText.match(/(?:Hợp\s*đồng|HĐ)(?:\s*Số)?\s*:?\s*([^\s,;]+)/i);
          if (numMatch && numMatch[1]) {
            extractedContractNumber = numMatch[1].trim();
            if (extractedContractNumber.endsWith('.')) {
              extractedContractNumber = extractedContractNumber.slice(0, -1);
            }
          }
        }

        if (!extractedContractDate) {
          const dateMatch = fullText.match(/ngày\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i);
          if (dateMatch && dateMatch[1]) {
            extractedContractDate = dateMatch[1].trim();
          }
        }
      }

      return {
        id: inv.id,
        invoiceNumber: displayInvoiceNumber || '---',
        invoiceSymbol: displaySymbol || undefined,
        companyName: inv.extractedData?.seller?.name || '---',
        taxCode: inv.extractedData?.seller?.taxCode || '---',
        buyerName: inv.extractedData?.buyer?.name || '---',
        buyerTaxCode: inv.extractedData?.buyer?.taxCode || '---',
        classification: typeof inv.extractedData?.classification === 'object' ? inv.extractedData.classification.type : (inv.extractedData?.classification || 'BB_VT'),
        address: inv.extractedData?.buyer?.address || '---',
        date: inv.extractedData?.invoice?.date || inv.extractedData?.date || '',
        contractNumber: extractedContractNumber,
        contractDate: extractedContractDate,
        status: inv.status === 'draft' ? 'draft' : (inv.status === 'completed' || inv.status === 'processing') ? 'paid' : 'pending',
        type: inv.fileType === 'pdf' ? 'PDF' : 'XML',
        total: Number(inv.extractedData?.totals?.grandTotal) || 0,
        vat: Number(inv.extractedData?.totals?.vatAmount) || 0,
        notes: inv.notes || inv.extractedData?.notes || '',
        attachments: (() => {
          const list = [...(inv.attachments || inv.extractedData?.attachments || [])];
          const mainFileUrl = inv.fileURL || inv.extractedData?.fileURL;
          const mainFileName = inv.fileName || 'Hóa đơn gốc';
          const isRealUrl = mainFileUrl && (
            mainFileUrl.startsWith('http') ||
            mainFileUrl.startsWith('blob:') ||
            mainFileUrl.startsWith('drive:') ||
            mainFileUrl.startsWith('data:')
          );
          if (isRealUrl && !list.some(a => a.url === mainFileUrl || a.name === mainFileName)) {
            let ext = mainFileName.split('.').pop()?.toLowerCase();
            if (ext !== 'pdf' && ext !== 'xml' && ext !== 'jpg' && ext !== 'png') {
              ext = inv.fileType || (mainFileUrl.includes('xml') ? 'xml' : 'pdf');
            }
            list.unshift({
              name: mainFileName,
              url: mainFileUrl,
              size: 'Xem tệp gốc',
              type: ext as any || 'pdf'
            });
          }
          return list;
        })(),
        items: (inv.extractedData?.items || []).map((item: any) => {
          const q = Number(item.quantity) || 0;
          const p = Number(item.unitPrice || item.price) || 0;
          const t = Number(item.amount || item.total || item.totalAmount || item.lineTotal) || (q * p);
          return {
            id: item.id || `${item.description || ''}-${item.quantity || 0}-${item.price || 0}`,
            description: item.description || item.name || '---',
            unit: item.unit || '-',
            quantity: q,
            price: p,
            total: t
          };
        })
      };
    });

    return (
      <DashboardInvoiceList
        invoices={mappedItems}
        accordionMode={false}
        lazyRender={true}
        mobileFallbackThreshold={768}
        onDelete={onDeleteInvoice}
        onGenerateDoc={(invoice) => {
          const originalInv = items.find(i => i.id === invoice.id);
          if (originalInv) {
            handleGenerateDoc(originalInv);
          }
        }}
        onUpdate={handleUpdateInvoice}
        onExtractDraft={onExtractDraft}
        placement={placement}
      />
    );
  };

  return (
    <div className="space-y-6 overflow-y-auto h-full p-1 scroll-smooth">
      {/* Overview Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-3 bg-white/[0.01] border border-border-dark/40 rounded-3xl shadow-lg relative overflow-hidden backdrop-blur-md">
        {[
          { label: 'Hợp đồng cần xử lý', value: stats.pending, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', icon: Clock },
          { label: 'Đối tác liên kết', value: stats.partners, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: Users },
          { label: 'Hóa đơn hệ thống', value: stats.invoices, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: FileText },
          { label: 'Hồ sơ đã hoàn tất', value: generatedDocs.length, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', icon: ShieldCheck },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-sidebar-dark/40 border border-border-dark hover:border-[#FF7A00]/25 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg group relative overflow-hidden"
            >
              {/* Subtle background glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
              
              <div className={cn("p-2 rounded-xl shrink-0 border flex items-center justify-center transition-all group-hover:scale-105", stat.color)}>
                <Icon className="size-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-dim/80 leading-normal truncate group-hover:text-white transition-colors">{stat.label}</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-extrabold tracking-tight text-white">
                    {isLoadingData ? <Loader2 className="size-3.5 animate-spin text-text-dim" /> : stat.value}
                  </span>
                  <span className="text-[9px] font-bold text-text-dim/50 uppercase">Mục dữ liệu</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modern Dashboard Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-border-dark pb-4">
        <div className="flex bg-sidebar-dark p-1.5 rounded-[20px] border border-border-dark w-full md:w-auto">
          <button
            onClick={() => onSubTabChange('invoices')}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-3.5 rounded-[16px] font-bold text-xs uppercase tracking-widest transition-all duration-300",
              subTab === 'invoices' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-dim hover:text-white"
            )}
          >
            <Library className="size-4" />
            Quản lý hóa đơn
          </button>
          <button
            onClick={() => onSubTabChange('contracts')}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-3.5 rounded-[16px] font-bold text-xs uppercase tracking-widest transition-all duration-300",
              subTab === 'contracts' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-dim hover:text-white"
            )}
          >
            <Briefcase className="size-4" />
            Quản lý hợp đồng
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {subTab === 'invoices' && (
            <>
              <button
                onClick={handleSyncFromDrive}
                disabled={isSyncingDrive}
                className={cn(
                  "btn-secondary flex items-center gap-2",
                  isSyncingDrive && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSyncingDrive ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                ĐỒNG BỘ DRIVE
              </button>
              <button
                onClick={onBulkExport}
                className="btn-secondary"
              >
                <Package className="size-4" />
                HÀNG LOẠT
              </button>
              <button
                onClick={onExportExcel}
                disabled={isExportingExcel || stats.invoices === 0}
                className={cn(
                  "btn-primary",
                  (isExportingExcel || stats.invoices === 0) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isExportingExcel ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                XUẤT EXCEL
              </button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="min-h-[400px]"
        >
          {subTab === 'invoices' ? (
            <div className="space-y-6 pb-20">
              {/* Header & Smart Filter Button Slot */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-sidebar-dark/40 p-6 rounded-3xl border border-border-dark shadow-2xl relative">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-[#FF7A00] shadow-lg shadow-[#FF7A00]/50 animate-pulse" />
                    Danh sách hóa đơn hệ thống
                  </h3>
                  <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider">
                    Tổng cộng: {filteredInvoices.length} tệp
                  </p>
                </div>

                {/* Smart Filter Button & Dropdown */}
                <div className="relative">
                  <button
                    ref={triggerRef}
                    onClick={handleOpenFilter}
                    className={cn(
                      "px-6 py-3.5 text-xs font-black uppercase tracking-wider rounded-2xl border flex items-center gap-2.5 transition-all shadow-md cursor-pointer group",
                      isFilterOpen || activeFiltersHasValues
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-sidebar-dark border-border-dark text-text-dim hover:bg-white/5 hover:text-white hover:border-primary/50"
                    )}
                  >
                    <Filter className="size-4" />
                    <span>Lọc hóa đơn</span>
                    {activeFiltersHasValues && (
                      <span className="size-2 rounded-full bg-primary animate-pulse ml-0.5" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isFilterOpen && (
                      <motion.div
                        ref={popoverRef}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="absolute top-[calc(100%+12px)] right-0 w-[450px] max-h-[620px] bg-[#1E1E1E] border border-border-dark rounded-[32px] shadow-2xl p-6 z-[50] space-y-6 text-left overflow-y-auto custom-scrollbar flex flex-col"
                      >
                        {/* Section A: Lọc theo Năm & Quý */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-white uppercase tracking-widest">A. Lọc theo Năm & Quý (Dựa trên Ngày xuất)</h4>

                          {/* Year Selection (Dynamic) */}
                          {availableYears.length > 0 && (
                            <div className="space-y-1 mb-2">
                              <div className="text-[8px] font-bold text-text-dim uppercase">Năm</div>
                              <div className="flex flex-wrap gap-2">
                                {availableYears.map((y) => (
                                  <button
                                    key={y}
                                    type="button"
                                    onClick={() => setTempFilters(prev => ({ ...prev, yearFilter: prev.yearFilter === y ? '' : y }))}
                                    className={cn(
                                      "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all",
                                      tempFilters.yearFilter === y
                                        ? "bg-primary border-primary text-white"
                                        : "bg-black/35 border-border-dark text-text-dim hover:text-white hover:border-border-dark/80"
                                    )}
                                  >
                                    Năm {y}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Quarter Selection */}
                          <div className="space-y-1">
                            <div className="text-[8px] font-bold text-text-dim uppercase">Quý</div>
                            <div className="grid grid-cols-4 gap-2">
                              {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                                <button
                                  key={q}
                                  type="button"
                                  onClick={() => setTempFilters(prev => ({ ...prev, quarter: prev.quarter === q ? '' : q }))}
                                  className={cn(
                                    "py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all",
                                    tempFilters.quarter === q
                                      ? "bg-primary border-primary text-white"
                                      : "bg-black/35 border-border-dark text-text-dim hover:text-white hover:border-border-dark/80"
                                  )}
                                >
                                  Quý {q === 'Q1' ? '1' : q === 'Q2' ? '2' : q === 'Q3' ? '3' : '4'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Section B: Hóa đơn Đầu vào (Bên Mua) */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-white uppercase tracking-widest">B. Hóa đơn Đầu vào (Bên Mua)</h4>
                          <div className="space-y-2.5">
                            {[
                              'CÔNG TY TNHH XÂY DỰNG HUỲNH BẢO',
                              'CÔNG TY TNHH XÂY DỰNG THANH THUẬN',
                              'CÔNG TY TNHH XÂY DỰNG PHẠM LIÊM',
                              'CÔNG TY TNHH XÂY DỰNG NGỌC THẮM'
                            ].map((buyer) => {
                              const isChecked = tempFilters.buyers.includes(buyer);
                              return (
                                <label key={buyer} className="flex items-center gap-2.5 cursor-pointer text-text-dim hover:text-white transition-colors group">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setTempFilters(prev => ({
                                        ...prev,
                                        buyers: isChecked
                                          ? prev.buyers.filter(b => b !== buyer)
                                          : [...prev.buyers, buyer]
                                      }));
                                    }}
                                    className="accent-primary rounded border-border-dark bg-black/40 focus:ring-primary size-4 shrink-0"
                                  />
                                  <span className="text-[11px] font-bold uppercase tracking-wider">{buyer}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Section C: Linh hoạt theo Thời gian */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-white uppercase tracking-widest">C. Linh hoạt theo Thời gian (Ngày xuất)</h4>

                          <div className="flex bg-black/30 p-1 rounded-xl border border-border-dark mb-3">
                            <button
                              onClick={() => setTempFilters(prev => ({ ...prev, dateType: 'discrete' }))}
                              className={cn(
                                "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                                tempFilters.dateType !== 'range'
                                  ? "bg-white/5 text-white"
                                  : "text-text-dim hover:text-white"
                              )}
                            >
                              Theo Ngày/Tháng/Năm
                            </button>
                            <button
                              onClick={() => setTempFilters(prev => ({ ...prev, dateType: 'range' }))}
                              className={cn(
                                "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                                tempFilters.dateType === 'range'
                                  ? "bg-white/5 text-white"
                                  : "text-text-dim hover:text-white"
                              )}
                            >
                              Theo Khoảng Ngày
                            </button>
                          </div>

                          {tempFilters.dateType !== 'range' ? (
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[8px] font-bold text-text-dim uppercase">Ngày</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="31"
                                  placeholder="DD"
                                  value={tempFilters.day}
                                  onChange={(e) => setTempFilters(prev => ({ ...prev, day: e.target.value }))}
                                  className="w-full mt-1 px-3 py-2 bg-black/40 border border-border-dark rounded-xl text-xs font-bold text-white outline-none focus:border-primary/50"
                                />
                              </div>
                              <div>
                                <label className="text-[8px] font-bold text-text-dim uppercase">Tháng</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="12"
                                  placeholder="MM"
                                  value={tempFilters.month}
                                  onChange={(e) => setTempFilters(prev => ({ ...prev, month: e.target.value }))}
                                  className="w-full mt-1 px-3 py-2 bg-black/40 border border-border-dark rounded-xl text-xs font-bold text-white outline-none focus:border-primary/50"
                                />
                              </div>
                              <div>
                                <label className="text-[8px] font-bold text-text-dim uppercase">Năm</label>
                                <input
                                  type="number"
                                  placeholder="YYYY"
                                  value={tempFilters.year}
                                  onChange={(e) => setTempFilters(prev => ({ ...prev, year: e.target.value }))}
                                  className="w-full mt-1 px-3 py-2 bg-black/40 border border-border-dark rounded-xl text-xs font-bold text-white outline-none focus:border-primary/50"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[8px] font-bold text-text-dim uppercase">Từ ngày</label>
                                <input
                                  type="date"
                                  value={tempFilters.fromDate}
                                  onChange={(e) => setTempFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                                  className="w-full mt-1 px-3 py-2 bg-black/40 border border-border-dark rounded-xl text-xs font-bold text-white outline-none focus:border-primary/50"
                                />
                              </div>
                              <div>
                                <label className="text-[8px] font-bold text-text-dim uppercase">Đến ngày</label>
                                <input
                                  type="date"
                                  value={tempFilters.toDate}
                                  onChange={(e) => setTempFilters(prev => ({ ...prev, toDate: e.target.value }))}
                                  className="w-full mt-1 px-3 py-2 bg-black/40 border border-border-dark rounded-xl text-xs font-bold text-white outline-none focus:border-primary/50"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Section D: Hóa đơn thiếu thông tin */}
                        <div className="space-y-2 border-t border-border-dark/60 pt-4">
                          <label className="flex items-center gap-2.5 cursor-pointer text-text-dim hover:text-white transition-colors group">
                            <input
                              type="checkbox"
                              checked={tempFilters.missingContract}
                              onChange={() => setTempFilters(prev => ({ ...prev, missingContract: !prev.missingContract }))}
                              className="accent-primary rounded border-border-dark bg-black/40 focus:ring-primary size-4 shrink-0"
                            />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-white uppercase tracking-wider">D. Thiếu Thông tin Hợp đồng</span>
                              <span className="text-[9px] text-text-dim font-bold">Hóa đơn chưa điền Số hợp đồng hoặc Ngày ký</span>
                            </div>
                          </label>
                        </div>

                        {/* Section E: Trạng thái & Nguồn */}
                        <div className="grid grid-cols-2 gap-4 border-t border-border-dark/60 pt-4">
                          <div className="space-y-2.5">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">E. Lọc Trạng thái</h4>
                            {[
                              { label: 'Thi công', value: 'BB_TC' },
                              { label: 'Vật tư', value: 'BB_VT' },
                              { label: 'Ca máy', value: 'BB_CM' }
                            ].map((s) => {
                              const isChecked = tempFilters.statuses.includes(s.value);
                              return (
                                <label key={s.value} className="flex items-center gap-2 cursor-pointer text-text-dim hover:text-white transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => setTempFilters(prev => ({
                                      ...prev,
                                      statuses: isChecked ? prev.statuses.filter(st => st !== s.value) : [...prev.statuses, s.value]
                                    }))}
                                    className="accent-primary rounded border-border-dark bg-black/40 focus:ring-primary size-3.5 shrink-0"
                                  />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">{s.label}</span>
                                </label>
                              );
                            })}
                          </div>
                          <div className="space-y-2.5">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">E. Lọc Nguồn</h4>
                            {[
                              { label: 'PDF', value: 'PDF' },
                              { label: 'XML', value: 'XML' }
                            ].map((s) => {
                              const isChecked = tempFilters.sources.includes(s.value);
                              return (
                                <label key={s.value} className="flex items-center gap-2 cursor-pointer text-text-dim hover:text-white transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => setTempFilters(prev => ({
                                      ...prev,
                                      sources: isChecked ? prev.sources.filter(so => so !== s.value) : [...prev.sources, s.value]
                                    }))}
                                    className="accent-primary rounded border-border-dark bg-black/40 focus:ring-primary size-3.5 shrink-0"
                                  />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">{s.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Section F: Lọc theo Khoảng Giá trị */}
                        <div className="space-y-2 border-t border-border-dark/60 pt-4">
                          <h4 className="text-[10px] font-black text-white uppercase tracking-widest">F. Lọc theo Giá trị Hóa đơn (VNĐ)</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setTempFilters(prev => ({ ...prev, priceFilter: prev.priceFilter === 'under20' ? '' : 'under20' }))}
                              className={cn(
                                "py-3 px-3 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all leading-normal text-center flex items-center justify-center min-h-[50px]",
                                tempFilters.priceFilter === 'under20'
                                  ? "bg-primary border-primary text-white"
                                  : "bg-black/35 border-border-dark text-text-dim hover:text-white hover:border-border-dark/80"
                              )}
                            >
                              Dưới 20 triệu
                            </button>
                            <button
                              type="button"
                              onClick={() => setTempFilters(prev => ({ ...prev, priceFilter: prev.priceFilter === 'above20' ? '' : 'above20' }))}
                              className={cn(
                                "py-3 px-3 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all leading-normal text-center flex items-center justify-center min-h-[50px]",
                                tempFilters.priceFilter === 'above20'
                                  ? "bg-primary border-primary text-white"
                                  : "bg-black/35 border-border-dark text-text-dim hover:text-white hover:border-border-dark/80"
                              )}
                            >
                              Từ 20 triệu trở lên
                            </button>
                          </div>
                        </div>

                        {/* Footer Controls: Apply & Clear */}
                        <div className="flex gap-3 border-t border-border-dark pt-4 mt-6">
                          <button
                            onClick={handleApplyFilters}
                            className="flex-1 py-3 bg-primary hover:bg-primary/95 text-[10px] font-black uppercase tracking-wider rounded-xl text-white transition-all shadow-md active:scale-95 text-center"
                          >
                            Áp dụng
                          </button>
                          <button
                            onClick={handleClearFilters}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-wider rounded-xl text-text-dim hover:text-white transition-all border border-border-dark active:scale-95 text-center"
                          >
                            Xóa bộ lọc
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Unified Invoice List Accordion */}
              {isLoadingData ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-16 w-full rounded-2xl" />
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-24 bg-sidebar-dark/20 rounded-[32px] border border-dashed border-border-dark text-text-dim text-xs italic font-medium uppercase tracking-widest">
                  {fileSearchTerm ? "Không tìm thấy kết quả phù hợp" : "Trống"}
                </div>
              ) : (
                renderInvoiceList(filteredInvoices)
              )}
            </div>
          ) : (
            <ContractManagementView
              contracts={contracts}
              partners={partners}
              onDelete={onDeleteContract}
              onBulkDelete={onBulkDeleteContracts}
              searchTerm={docSearchTerm}
              onSearchChange={setDocSearchTerm}
              onDownload={onDownloadContract}
              onUpdateFormData={onUpdateContractFormData}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* MODAL ĐỒNG BỘ PDF TỪ DRIVE CHUYÊN NGHIỆP */}
      <AnimatePresence>
        {isSyncModalOpen && !isMinimized && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (syncStatus !== 'extracting' && syncStatus !== 'paused') {
                  setIsSyncModalOpen(false);
                }
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-sidebar-dark border border-border-dark rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[85vh] text-white"
            >
              {/* Header */}
              <div className="p-6 border-b border-border-dark flex items-center justify-between bg-card-dark">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white tracking-tight">Đồng bộ Hóa Đơn PDF</h3>
                    <p className="text-xs text-text-dim">Phát hiện {pendingPdfFiles.length} hóa đơn PDF mới trên Drive</p>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-2 hover:bg-white/5 rounded-lg text-text-dim hover:text-white transition-colors"
                    title="Thu nhỏ để chạy ngầm"
                  >
                    <ChevronRight className="size-5 rotate-90" />
                  </button>
                  <button
                    disabled={syncStatus === 'extracting' || syncStatus === 'paused'}
                    onClick={() => setIsSyncModalOpen(false)}
                    className={cn(
                      "p-2 hover:bg-white/5 rounded-lg text-text-dim hover:text-white transition-colors",
                      (syncStatus === 'extracting' || syncStatus === 'paused') && "opacity-30 cursor-not-allowed"
                    )}
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable File List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar min-h-[200px]">
                {syncQueue.map((item, idx) => {
                  const isCurrent = idx === currentSyncingIndex;
                  return (
                    <div
                      key={item.name}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300",
                        isCurrent
                          ? "bg-primary/5 border-primary shadow-sm"
                          : item.status === 'completed'
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : item.status === 'error'
                              ? "bg-red-500/5 border-red-500/20"
                              : "bg-white/5 border-border-dark"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-8 rounded-lg flex items-center justify-center shrink-0",
                          item.status === 'completed'
                            ? "bg-emerald-500/10 text-emerald-400"
                            : item.status === 'error'
                              ? "bg-red-500/10 text-red-400"
                              : isCurrent
                                ? "bg-primary/10 text-primary"
                                : "bg-white/5 text-text-dim"
                        )}>
                          {item.status === 'completed' ? (
                            <CheckCircle2 className="size-4" />
                          ) : item.status === 'error' ? (
                            <AlertCircle className="size-4" />
                          ) : isCurrent ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Clock className="size-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate max-w-md">{item.name}</p>
                          <p className="text-[10px] text-text-dim uppercase tracking-wider font-semibold mt-0.5">
                            {item.status === 'completed' && "Đã trích xuất thành công"}
                            {item.status === 'processing' && "Đang bóc tách dữ liệu..."}
                            {item.status === 'error' && `Lỗi: ${item.error || 'Trích xuất thất bại'}`}
                            {item.status === 'pending' && "Đang chờ hàng đợi..."}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress and Actions Footer */}
              <div className="p-6 border-t border-border-dark bg-card-dark space-y-4">
                {/* Progress Bar */}
                {(syncStatus === 'extracting' || syncStatus === 'paused' || syncStatus === 'completed') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-text-dim">Tiến độ trích xuất bằng AI:</span>
                      <span className="text-white">
                        {syncQueue.filter(q => q.status === 'completed' || q.status === 'error').length} / {syncQueue.length} tệp
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-amber-500"
                        animate={{
                          width: `${(syncQueue.filter(q => q.status === 'completed' || q.status === 'error').length / syncQueue.length) * 100}%`
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                {/* Status info bar */}
                {syncStatus === 'paused' && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl text-xs font-bold">
                    <Loader2 className="size-4 animate-spin shrink-0" />
                    <span>Đang nghỉ tạm dừng {delayCountdown}s để tránh giới hạn tần suất API (Rate Limit)...</span>
                  </div>
                )}

                {syncStatus === 'completed' && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-bold">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>Chúc mừng! Đã trích xuất và đồng bộ thành công toàn bộ hóa đơn PDF.</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-[10px] text-text-dim uppercase tracking-wider font-semibold">
                    {syncStatus === 'idle' && "Sẵn sàng trích xuất"}
                    {syncStatus === 'extracting' && "Đang chạy ngầm"}
                    {syncStatus === 'paused' && "Đang tạm nghỉ đợt tiếp theo"}
                    {syncStatus === 'completed' && "Đã hoàn thành"}
                  </div>

                  <div className="flex items-center gap-3">
                    {syncStatus === 'idle' ? (
                      <>
                        <button
                          onClick={() => setIsSyncModalOpen(false)}
                          className="px-6 py-2.5 bg-white/5 border border-border-dark text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
                        >
                          Bỏ qua
                        </button>
                        <button
                          onClick={startBackgroundPdfExtraction}
                          className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center gap-2 hover:translate-y-[-1px] transition-all"
                        >
                          <Sparkles className="size-4 animate-pulse" />
                          Trích xuất bằng AI
                        </button>
                      </>
                    ) : syncStatus === 'completed' ? (
                      <button
                        onClick={() => setIsSyncModalOpen(false)}
                        className="px-8 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 hover:translate-y-[-1px] transition-all"
                      >
                        Đồng ý
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsMinimized(true)}
                        className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 hover:translate-y-[-1px] transition-all"
                      >
                        Chạy ngầm trong nền
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING PROGRESS BADGE (KHI THU NHỎ CHẠY NGẦM) */}
      <AnimatePresence>
        {isMinimized && (syncStatus === 'extracting' || syncStatus === 'paused') && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] bg-sidebar-dark border border-border-dark shadow-2xl p-4 rounded-2xl flex items-center gap-3.5 text-white max-w-sm"
          >
            <div className="relative size-12 flex items-center justify-center shrink-0">
              <svg className="absolute inset-0 size-full -rotate-90">
                <circle
                  cx="24" cy="24" r="20"
                  className="stroke-white/5 fill-none"
                  strokeWidth="4"
                />
                <motion.circle
                  cx="24" cy="24" r="20"
                  className="stroke-primary fill-none"
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 20}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 20 * (1 - (syncQueue.filter(q => q.status === 'completed' || q.status === 'error').length / syncQueue.length))
                  }}
                  transition={{ duration: 0.3 }}
                />
              </svg>
              <div className="text-[10px] font-black text-primary">
                {Math.round((syncQueue.filter(q => q.status === 'completed' || q.status === 'error').length / syncQueue.length) * 100)}%
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                {syncStatus === 'paused' ? (
                  <>
                    <Clock className="size-3.5 text-amber-400 shrink-0" />
                    <span>Tạm nghỉ ({delayCountdown}s)...</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="size-3.5 text-primary animate-spin shrink-0" />
                    <span>Đang bóc tách bằng AI...</span>
                  </>
                )}
              </h5>
              <p className="text-[9px] text-text-dim truncate mt-0.5">
                {currentSyncingIndex >= 0 ? `Đang xử lý: ${syncQueue[currentSyncingIndex]?.name}` : "Đang xử lý..."}
              </p>
            </div>

            <button
              onClick={() => setIsMinimized(false)}
              className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg transition-all"
              title="Phóng to theo dõi"
            >
              <ChevronLeft className="size-4 rotate-180" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- View: Upload ---
const UploadView = ({
  onUpload,
  queue,
  rejectedFiles,
  onRemove,
  onRemoveRejected,
  onProcess,
  isProcessing,
  processingStatus
}: {
  onUpload: (accepted: File[], rejected: any[]) => void,
  queue: File[],
  rejectedFiles: { file: File, reason: string }[],
  onRemove: (name: string) => void,
  onRemoveRejected: (name: string) => void,
  onProcess: () => void,
  isProcessing: boolean,
  processingStatus: string
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    accept: {
      'application/pdf': ['.pdf'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml'],
      'application/octet-stream': ['.xml', '.pdf'],
      'text/plain': ['.xml'],
      'image/*': ['.png', '.jpg', '.jpeg']
    }
  } as any);

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center p-12 transition-all cursor-pointer bg-sidebar-dark group",
            isDragActive ? "border-primary bg-primary/5" : "border-border-dark hover:border-primary/40 hover:bg-white/5"
          )}
        >
          <input {...getInputProps()} />
          <div className="size-20 bg-primary/10 text-primary rounded-[24px] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl shadow-primary/20">
            <UploadCloud className="size-10" />
          </div>
          <h3 className="text-xl font-black text-white mb-2 tracking-tighter uppercase">Kéo và thả hóa đơn vào đây</h3>
          <p className="text-text-dim text-[10px] mb-8 font-black uppercase tracking-[0.3em] opacity-60">Hỗ trợ định dạng PDF, XML và Hình ảnh (JPG, PNG)</p>
          <div className="flex gap-4">
            <button className="px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:translate-y-[-2px] active:scale-95 transition-all">
              CHỌN TỆP TIN TỪ MÁY TÍNH
            </button>
          </div>
        </div>
      </div>

      {(queue.length > 0 || rejectedFiles.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card-dark rounded-[40px] border border-border-dark overflow-hidden shadow-2xl relative"
        >
          {/* Header Status Bar */}
          <div className="p-8 border-b border-border-dark bg-white/[0.02] flex items-center justify-between relative overflow-hidden">
            {isProcessing && (
              <div className="absolute bottom-0 left-0 h-1 bg-primary animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.5)] w-full transition-all" />
            )}

            <div className="flex items-center gap-5">
              <div className={cn(
                "size-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                isProcessing ? "bg-primary/20 text-primary animate-pulse" : "bg-white/5 text-text-dim"
              )}>
                {isProcessing ? <Loader2 className="size-6 animate-spin" /> : <List className="size-6" />}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black uppercase tracking-[0.2em] text-white">Hàng chờ hệ thống</span>
                  <div className="px-3 py-0.5 bg-primary/20 text-primary rounded-full text-[10px] font-black tracking-widest border border-primary/30">
                    {queue.length} TỆP SẴN SÀNG
                  </div>
                </div>
                {isProcessing && processingStatus ? (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="size-1.5 rounded-full bg-primary animate-ping" />
                    <span className="text-[10px] text-primary font-black uppercase tracking-widest">{processingStatus}</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest mt-1 opacity-60">Các tệp sẽ được bóc tách bằng AI Mistral Premium</p>
                )}
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); onProcess(); }}
              disabled={isProcessing || queue.length === 0}
              className={cn(
                "px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-2xl",
                isProcessing
                  ? "bg-white/5 text-text-dim cursor-not-allowed"
                  : "bg-primary text-white hover:translate-y-[-4px] active:scale-95 shadow-primary/20"
              )}
            >
              {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4 fill-current" />}
              {isProcessing ? "Đang xử lý dữ liệu..." : "BẮT ĐẦU TRÍCH XUẤT NGAY"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-border-dark min-h-[400px]">
            {/* Column 1: Ready to Process */}
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3 text-xs font-black text-emerald-500 uppercase tracking-[0.2em]">
                  <div className="size-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                  Danh sách tệp hợp lệ
                </div>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                {queue.length === 0 && (
                  <div className="py-24 text-center border-2 border-dashed border-border-dark rounded-3xl opacity-30">
                    <FileQuestion className="size-12 mx-auto mb-4 text-text-dim" />
                    <p className="text-[10px] text-text-dim italic font-black uppercase tracking-widest">Không có tệp nào trong hàng đợi</p>
                  </div>
                )}

                {queue.map((file, idx) => {
                  const isXml = file.name.toLowerCase().endsWith('.xml');
                  return (
                    <div key={file.name + '-' + file.size} className="group relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[24px]" />
                      <div className="relative flex items-center justify-between bg-white/[0.03] p-5 rounded-[24px] border border-border-dark group-hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center gap-5 min-w-0">
                          <div className={cn(
                            "size-14 rounded-2xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 duration-500",
                            isXml ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                          )}>
                            {isXml ? <FileCode className="size-7" /> : <FileText className="size-7" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-white truncate leading-tight uppercase tracking-tighter group-hover:text-emerald-400 transition-colors">{file.name}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[9px] font-black text-text-dim uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">
                                {(file.size / 1024).toFixed(1)} KB
                              </span>
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                isXml ? "text-amber-500 bg-amber-500/10" : "text-red-500 bg-red-500/10"
                              )}>
                                {isXml ? "XML Data" : "PDF Document"}
                              </span>
                            </div>
                          </div>
                        </div>
                        {!isProcessing && (
                          <button
                            onClick={() => onRemove(file.name)}
                            className="size-10 flex items-center justify-center text-text-dim hover:text-white hover:bg-red-500 rounded-xl transition-all shadow-sm active:scale-90"
                          >
                            <X className="size-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Rejections & Errors */}
            <div className="p-8 space-y-6 bg-red-500/[0.01]">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3 text-xs font-black text-red-500 uppercase tracking-[0.2em]">
                  <div className="size-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
                  Tệp không khả dụng
                </div>
                {rejectedFiles.length > 0 && (
                  <button
                    onClick={() => rejectedFiles.forEach(r => onRemoveRejected(r.file.name))}
                    className="text-[9px] font-black text-red-500/60 hover:text-red-500 uppercase tracking-widest transition-colors"
                  >
                    Dọn sạch danh sách
                  </button>
                )}
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                {rejectedFiles.length === 0 ? (
                  <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                    <CheckCircle2 className="size-12 mx-auto mb-4 text-emerald-500" />
                    <p className="text-[10px] text-text-dim italic font-black uppercase tracking-widest">Hệ thống không ghi nhận lỗi</p>
                  </div>
                ) : (
                  rejectedFiles.map((item, idx) => (
                    <div key={`rejected-${item.file.name}-${item.file.size}`} className="flex items-center justify-between bg-red-500/[0.03] p-5 rounded-[24px] border border-red-500/10 group hover:border-red-500/30 transition-all shadow-sm">
                      <div className="flex items-center gap-5 min-w-0">
                        <div className="size-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-inner">
                          <AlertCircle className="size-7" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-red-400 truncate leading-tight uppercase tracking-tighter">{item.file.name}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="px-2 py-0.5 bg-red-500/10 rounded-md text-[9px] font-black text-red-500 uppercase tracking-widest border border-red-500/20">
                              Lý do: {item.reason}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveRejected(item.file.name)}
                        className="size-10 flex items-center justify-center text-red-500/40 hover:text-white hover:bg-red-500 rounded-xl transition-all"
                      >
                        <X className="size-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// --- View: Partners ---
// --- View: Contract ---
const abbreviateCompanyName = (name: string): string => {
  if (!name) return "";
  let abbr = name.trim().toUpperCase();

  // Standard Vietnamese Company Prefixes
  const rules = [
    { pattern: /VẬT LIỆU XÂY DỰNG/gi, replacement: "VLXD" },
    { pattern: /PHÒNG CHÁY CHỮA CHÁY/gi, replacement: "PCCC" },
    { pattern: /CÔNG TY CỔ PHẦN/gi, replacement: "CTY CP" },
    { pattern: /CÔNG TY TNHH/gi, replacement: "CTY TNHH" },
    { pattern: /TRÁCH NHIỆM HỮU HẠN/gi, replacement: "TNHH" },
    { pattern: /MỘT THÀNH VIÊN/gi, replacement: "MTV" },
    { pattern: /CÔNG TY/gi, replacement: "CTY" },
    { pattern: /THIẾT KẾ/gi, replacement: "TK" },
    { pattern: /KIẾN TRÚC/gi, replacement: "KT" },
    { pattern: /XÂY DỰNG/gi, replacement: "XD" },
    { pattern: /THƯƠNG MẠI/gi, replacement: "TM" },
    { pattern: /DỊCH VỤ/gi, replacement: "DV" },
    { pattern: /SẢN XUẤT/gi, replacement: "SX" },
    { pattern: /ĐẦU TƯ/gi, replacement: "ĐT" },
    { pattern: /VẬN TẢI/gi, replacement: "VT" },
    { pattern: /CÔNG NGHIỆP/gi, replacement: "CN" },
    { pattern: /KỸ THUẬT/gi, replacement: "KT" },
    { pattern: /CƠ KHÍ/gi, replacement: "CK" },
    { pattern: /PHÁT TRIỂN/gi, replacement: "PT" },
    { pattern: /XUẤT NHẬP KHẨU/gi, replacement: "XNK" },
    { pattern: /\sVÀ\s/gi, replacement: " & " },
  ];

  rules.forEach(rule => {
    abbr = abbr.replace(rule.pattern, rule.replacement);
  });

  return abbr;
};

const MERGER_DATE = new Date(2025, 6, 1); // 01/07/2025

const friendlyLabelMap: Record<string, string> = {
  'NGAY_KY': 'Ngày ký hợp đồng',
  'THANG_KY': 'Tháng ký hợp đồng',
  'NAM_KY': 'Năm ký hợp đồng',
  'MST_A': 'Mã số thuế Bên A',
  'MST_B': 'Mã số thuế Bên B',
  'MST_BEN_A': 'Mã số thuế Bên A',
  'MST_BEN_B': 'Mã số thuế Bên B',
  'DIA_CHI_A': 'Địa chỉ Bên A',
  'DIA_CHI_B': 'Địa chỉ Bên B',
  'TEN_CTY_A': 'Tên công ty Bên A',
  'TEN_CTY_B': 'Tên công ty Bên B',
  'TEN_CTY_A_VT': 'Tên viết tắt Bên A',
  'TEN_CTY_B_VT': 'Tên viết tắt Bên B',
  'DAI_DIEN_A': 'Họ tên đại diện Bên A',
  'DAI_DIEN_B': 'Họ tên đại diện Bên B',
  'DAI_DIEN_BEN_A': 'Họ tên đại diện Bên A',
  'DAI_DIEN_BEN_B': 'Họ tên đại diện Bên B',
  'CHUC_VU_A': 'Chức vụ Bên A',
  'CHUC_VU_B': 'Chức vụ Bên B',
  'CHUCVU_A': 'Chức vụ Bên A',
  'CHUCVU_B': 'Chức vụ Bên B',
  'GIOITINH_A': 'Giới tính Bên A',
  'GIOITINH_B': 'Giới tính Bên B',
  'STK_A': 'Số tài khoản Bên A',
  'STK_B': 'Số tài khoản Bên B',
  'NH_A': 'Ngân hàng Bên A',
  'NH_B': 'Ngân hàng Bên B',
  'NGANHANGBENA': 'Ngân hàng Bên A',
  'NGANHANGBENB': 'Ngân hàng Bên B',
  'NGAN_HANG_A': 'Ngân hàng Bên A',
  'NGAN_HANG_B': 'Ngân hàng Bên B',
  'NGAY_HD': 'Ngày ký hợp đồng',
  'THANG_HD': 'Tháng ký hợp đồng',
  'NAM_HD': 'Năm ký hợp đồng',
  'NGAY_HOPDONG': 'Ngày ký hợp đồng',
  'THANG_HOPDONG': 'Tháng ký hợp đồng',
  'NAM_HOPDONG': 'Năm ký hợp đồng',
  'NGAYKYHOPDONG': 'Ngày ký hợp đồng',
  'SO_HD': 'Số hợp đồng',
  'SO_HOPDONG': 'Số hợp đồng',
  'SOHOPDONG': 'Số hợp đồng',
  'SOHD': 'Số hợp đồng',
  'NGAY_BAT_DAU': 'Ngày bắt đầu',
  'NGAY_KET_THUC': 'Ngày kết thúc',
  'BANGCHUGIATRI': 'Bằng chữ giá trị',
  'BANGGIATRIHOPDONG': 'Bảng giá trị hợp đồng',
  'BANG_GIATRIHOPDONG': 'Bảng giá trị hợp đồng',
  'GIATRIHOPDONG': 'Giá trị hợp đồng',
  'TEN_CTY_VIET_TAT': 'Tên công ty viết tắt',
  'NOI_KY': 'Nơi ký',
  'DIA_DIEM': 'Địa điểm',
  'BANG_GIATRITHUEXE': 'Bảng giá trị thuê xe',
  'BANGGIATRITHUEXE': 'Bảng giá trị thuê xe',
  'GOI_THAU': 'Gói thầu',
  'TEN_CONGTRINH': 'Tên công trình',
};

const getFriendlyLabel = (tag: string | undefined | null): string => {
  if (!tag) return '';
  const upper = tag.toUpperCase();
  if (friendlyLabelMap[upper]) return friendlyLabelMap[upper];

  if (upper.includes('TENCONGTRINH') || upper.includes('TEN_CONGTRINH')) return 'TÊN CÔNG TRÌNH';
  if (upper.includes('GOITHAU') || upper.includes('GOI_THAU')) return 'GÓI THẦU';
  if (upper.includes('DIADIEM') || upper.includes('DIA_DIEM')) return 'ĐỊA ĐIỂM';
  if (upper.includes('BANGCHUGIATRI') || (upper.includes('BANG') && upper.includes('CHU') && upper.includes('GIA'))) return 'Bằng chữ:';

  // Determine side
  let side = '';
  if (upper.includes('_A') || upper.includes('BEN_A') || upper.includes('BEN A') || upper.endsWith(' A') || upper.endsWith('_A')) side = 'Bên A';
  if (upper.includes('_B') || upper.includes('BEN_B') || upper.includes('BEN B') || upper.endsWith(' B') || upper.endsWith('_B')) side = 'Bên B';

  // Fuzzy matching for patterns
  if (upper.includes('TEN_CTY') || (upper.includes('TEN') && upper.includes('CTY'))) {
    const isVT = upper.includes('VT') || upper.includes('VIET_TAT');
    return `${isVT ? 'Tên viết tắt' : 'Tên công ty'} ${side}`.trim();
  }

  if (upper.includes('MST') || upper.includes('MA_SO_THUE')) return `Mã số thuế ${side}`.trim();
  if (upper.includes('DIA_CHI') || upper.includes('DIACHI')) return `Địa chỉ ${side}`.trim();
  if (upper.includes('DAI_DIEN')) return `Họ tên đại diện ${side}`.trim();
  if (upper.includes('CHUC_VU') || upper.includes('CHUCVU')) return `Chức vụ ${side}`.trim();
  if (upper.includes('GIOI_TINH') || upper.includes('GIOITINH')) return `Giới tính ${side}`.trim();
  if (upper.includes('STK') || upper.includes('SO_TAI_KHOAN')) return `Số tài khoản ${side}`.trim();
  if (upper === 'NH' || upper.startsWith('NH_') || upper.endsWith('_NH') || upper.includes('_NH_') || upper.includes('NGAN_HANG') || upper.includes('NGANHANG')) return `Ngân hàng ${side}`.trim();
  if (upper.includes('SDT') || upper.includes('DIEN_THOAI') || upper.includes('TEL')) return `Số điện thoại ${side}`.trim();
  if (upper.includes('EMAIL')) return `Email ${side}`.trim();
  if (upper.includes('FAX')) return `Fax ${side}`.trim();

  if (upper.includes('NGAY')) return `Ngày ${side}`.trim();
  if (upper.includes('THANG')) return `Tháng ${side}`.trim();
  if (upper.includes('NAM')) return `Năm ${side}`.trim();

  if (upper.includes('BANG')) return `Bảng ${upper.toLowerCase().replace('bang', '').replace(/_/g, ' ')}`.trim();

  return tag;
};

const toVietnameseTitleCase = (str: string): string => {
  if (!str) return '';
  let result = str.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
  
  // Custom styling rules for Vietnamese companies
  result = result.replace(/\bCông Ty\b/g, 'Công ty');
  result = result.replace(/\bTnhh\b/g, 'TNHH');
  result = result.replace(/\bCp\b/g, 'CP');
  result = result.replace(/\bMtv\b/g, 'MTV');
  result = result.replace(/\bTm\b/g, 'TM');
  result = result.replace(/\bDv\b/g, 'DV');
  result = result.replace(/\bSx\b/g, 'SX');
  result = result.replace(/\bXnk\b/g, 'XNK');
  result = result.replace(/\bXd\b/g, 'XD');
  result = result.replace(/\bPccc\b/g, 'PCCC');
  result = result.replace(/\bVlxd\b/g, 'VLXD');
  result = result.replace(/\bVncn\b/g, 'VNCN');
  result = result.replace(/E&c/g, 'E&C');
  result = result.replace(/\bInt\b/g, 'INT');
  result = result.replace(/\bVn\b/g, 'VN');
  result = result.replace(/\bJs\b/g, 'JS');
  result = result.replace(/\bJsc\b/g, 'JSC');
  result = result.replace(/\bVat\b/g, 'VAT');
  result = result.replace(/\bStk\b/g, 'STK');
  result = result.replace(/\bHtx\b/g, 'HTX');
  result = result.replace(/\bGtvt\b/g, 'GTVT');
  result = result.replace(/\bKcn\b/g, 'KCN');
  result = result.replace(/\bCn\b/g, 'CN');
  
  return result;
};

interface GdnRow {
  stt: string;
  noidung: string;
  donvi: string;
  giatri: string;
}

const generateGdnDocxTable = (rows: GdnRow[]): string => {
  const makeCell = (text: string, bold = false, align = 'left', shade = '', width = '1000') => {
    const boldTag = bold ? '<w:b/><w:bCs/>' : '';
    const shadeTag = shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : '';
    const escapedText = escapeXml(text);
    return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="pct"/>${shadeTag}<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="${align}"/><w:spacing w:before="80" w:after="80"/></w:pPr><w:r><w:rPr>${boldTag}<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${escapedText}</w:t></w:r></w:p></w:tc>`;
  };

  const headerRow = `<w:tr><w:trPr><w:trHeight w:val="400"/><w:tblHeader/></w:trPr>${makeCell('STT', true, 'center', 'D9D9D9', '500')}${makeCell('Nội dung đề nghị', true, 'center', 'D9D9D9', '2500')}${makeCell('Đơn vị', true, 'center', 'D9D9D9', '600')}${makeCell('Số tiền', true, 'center', 'D9D9D9', '1400')}</w:tr>`;

  const dataRows = rows.map(row => {
    const amountNum = parseInt(row.giatri, 10) || 0;
    const amountStr = amountNum > 0 ? amountNum.toLocaleString('vi-VN') : '';
    return `<w:tr><w:trPr><w:trHeight w:val="350"/></w:trPr>${makeCell(row.stt, false, 'center', '', '500')}${makeCell(row.noidung, false, 'left', '', '2500')}${makeCell(row.donvi, false, 'center', '', '600')}${makeCell(amountStr, false, 'right', '', '1400')}</w:tr>`;
  }).join('');

  const totalVal = rows.reduce((acc, r) => acc + (parseInt(r.giatri, 10) || 0), 0);
  const totalStr = totalVal > 0 ? totalVal.toLocaleString('vi-VN') : '0';
  const totalRow = `<w:tr>
    <w:trPr><w:trHeight w:val="400"/></w:trPr>
    <w:tc>
      <w:tcPr>
        <w:gridSpan w:val="2"/>
        <w:tcW w:w="3000" w:type="pct"/>
        <w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="left"/><w:spacing w:before="80" w:after="80"/></w:pPr>
        <w:r>
          <w:rPr><w:b/><w:bCs/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
          <w:t xml:space="preserve">TỔNG CỘNG</w:t>
        </w:r>
      </w:p>
    </w:tc>
    ${makeCell('Đồng', true, 'center', 'F2F2F2', '600')}
    ${makeCell(totalStr, true, 'right', 'F2F2F2', '1400')}
  </w:tr>`;

  const columns = [{ width: '500' }, { width: '2500' }, { width: '600' }, { width: '1400' }];
  return `<w:tbl xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid>
      ${columns.map(c => `<w:gridCol w:w="${c.width}"/>`).join('')}
    </w:tblGrid>
    ${headerRow}
    ${dataRows}
    ${totalRow}
  </w:tbl>`;
};

const GDNTableInputDark: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  const rows = React.useMemo(() => {
    try {
      if (!value) return [{ stt: '1', noidung: '', donvi: 'Đồng', giatri: '' }];
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      return [{ stt: '1', noidung: '', donvi: 'Đồng', giatri: '' }];
    } catch {
      return [{ stt: '1', noidung: '', donvi: 'Đồng', giatri: '' }];
    }
  }, [value]);

  const updateRows = (newRows: GdnRow[]) => {
    onChange(JSON.stringify(newRows));
  };

  const handleCellChange = (index: number, field: keyof GdnRow, val: string) => {
    const next = [...rows];
    next[index] = { ...next[index], [field]: val };
    updateRows(next);
  };

  const addRow = () => {
    const nextStt = (rows.length + 1).toString();
    const next = [...rows, { stt: nextStt, noidung: '', donvi: 'Đồng', giatri: '' }];
    updateRows(next);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) {
      updateRows([{ stt: '1', noidung: '', donvi: 'Đồng', giatri: '' }]);
      return;
    }
    const filtered = rows.filter((_, i) => i !== index);
    const reindexed = filtered.map((r, i) => ({ ...r, stt: (i + 1).toString() }));
    updateRows(reindexed);
  };

  const totalValue = rows.reduce((acc, r) => acc + (parseInt(r.giatri.replace(/\D/g, ''), 10) || 0), 0);

  return (
    <div className="space-y-3 bg-card-dark p-4 rounded-2xl border border-border-dark shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wide">
          <div className="w-1.5 h-3 bg-primary rounded-full"></div>
          BẢNG ĐỀ NGHỊ THANH TOÁN / TẠM ỨNG (BANG_GDN)
        </h4>
        <button
          type="button"
          onClick={addRow}
          className="px-3 py-1 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 text-primary text-[10px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 font-sans"
        >
          Thêm dòng
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border-dark">
        <table className="w-full text-left border-collapse font-sans">
          <thead>
            <tr className="bg-sidebar-dark/50 text-[10px] font-black uppercase tracking-wider text-text-dim border-b border-border-dark">
              <th className="py-2 px-3 text-center w-12">STT</th>
              <th className="py-2 px-3">Nội dung</th>
              <th className="py-2 px-3 w-24 text-center">Đơn vị</th>
              <th className="py-2 px-3 w-40 text-right">Giá trị</th>
              <th className="py-2 px-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dark text-xs text-white">
            {rows.map((row, index) => {
              return (
                <tr key={index} className="hover:bg-white/[0.01] transition-colors">
                  <td className="py-2 px-3 text-center font-bold text-text-dim">{row.stt}</td>
                  <td className="py-1 px-2">
                    <input
                      type="text"
                      value={row.noidung}
                      onChange={(e) => handleCellChange(index, 'noidung', e.target.value)}
                      placeholder="Nhập nội dung..."
                      className="w-full bg-sidebar-dark/40 hover:bg-sidebar-dark/80 focus:bg-sidebar-dark border border-border-dark focus:border-primary rounded-lg px-2.5 py-1.5 text-xs text-white font-medium outline-none transition-all"
                    />
                  </td>
                  <td className="py-1 px-2">
                    <input
                      type="text"
                      value={row.donvi}
                      onChange={(e) => handleCellChange(index, 'donvi', e.target.value)}
                      className="w-full text-center bg-sidebar-dark/40 hover:bg-sidebar-dark/80 focus:bg-sidebar-dark border border-border-dark focus:border-primary rounded-lg px-2 py-1.5 text-xs text-white font-medium outline-none transition-all"
                    />
                  </td>
                  <td className="py-1 px-2">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={row.giatri ? parseInt(row.giatri.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : ''}
                        onChange={(e) => {
                          const rawVal = e.target.value.replace(/\D/g, '');
                          handleCellChange(index, 'giatri', rawVal);
                        }}
                        placeholder="0"
                        className="w-full text-right bg-sidebar-dark/40 hover:bg-sidebar-dark/80 focus:bg-sidebar-dark border border-border-dark focus:border-primary rounded-lg pr-7 pl-2 py-1.5 text-xs text-emerald-400 font-bold outline-none transition-all"
                      />
                      <span className="absolute right-2 text-[10px] text-text-dim font-bold">đ</span>
                    </div>
                  </td>
                  <td className="py-1 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="p-1.5 text-text-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-90"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {/* Total Row */}
            <tr className="bg-sidebar-dark/30 font-bold border-t border-border-dark">
              <td colSpan={2} className="py-3 px-3 uppercase text-[10px] tracking-wide text-text-dim text-left">
                TỔNG SỐ TIỀN ĐỀ NGHỊ TẠM ỨNG
              </td>
              <td className="py-3 px-3 text-center text-[10px] text-text-dim">Đồng</td>
              <td className="py-3 px-3 text-right text-emerald-400 font-black text-xs">
                {totalValue.toLocaleString('vi-VN')} đ
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface TagInputProps {
  tag?: string;
  value: string;
  onChange: (val: string) => void;
  onAutoFill?: (partyType: 'A' | 'B') => void;
  onOpenSelector?: () => void;
  activeParty?: 'A' | 'B' | null;
  hideWrapperStyle?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({ tag, value, onChange, onAutoFill, onOpenSelector, activeParty, hideWrapperStyle }) => {
  const upper = (tag || '').toUpperCase();
  const isTableTag = (upper.includes('BANG') || upper.includes('TABLE')) &&
    !upper.includes('BANG_CHU') &&
    !upper.includes('BANGCHU');
  const isDateTag = upper.includes('DAY') || upper.includes('MONTH') || upper.includes('YEAR') ||
    upper.includes('NGAY') || upper.includes('THANG') || upper.includes('NAM');
  const isVTTag = upper.includes('VIET_TAT') || upper.endsWith('_VT');
  const isWords = upper.includes('BANG_CHU') || upper.includes('BANGCHU');
  const isCurrency = [
    'GIATRI', 'GIA_TRI', 'SO_TIEN', 'TONG_TIEN', 'THANH_TIEN', 'PHI', 'PHIDICHVU', 'GIA_TRI_HD', 'GIATRIHOPDONG'
  ].some(v => upper.includes(v));

  const friendlyLabel = getFriendlyLabel(tag);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => {
        if (isTableTag) onOpenSelector?.();
      }}
      className={cn(
        "group space-y-2 p-3 transition-all duration-300",
        !hideWrapperStyle && [
          "bg-card-dark rounded-2xl border",
          isWords ? "bg-primary/5 border-primary/20" : "border-border-dark",
          activeParty ? "border-primary shadow-lg ring-4 ring-primary/10" : "hover:border-primary/50 hover:bg-white/5 hover:shadow-md"
        ],
        isTableTag && "cursor-pointer active:scale-[0.99]"
      )}
    >
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          {isTableTag ? (
            <div
              className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-all border border-primary/20 leading-tight"
            >
              <Layers className="size-3.5 group-hover:rotate-12 transition-transform" /> {friendlyLabel}
            </div>
          ) : (
            <label className={cn(
              "text-xs font-black uppercase tracking-tight transition-colors px-1 leading-tight",
              activeParty ? "text-primary border-l-[3px] border-primary pl-2" : "text-text-dim group-hover:text-primary border-l-[3px] border-transparent pl-2"
            )} title={tag}>
              {friendlyLabel}
            </label>
          )}
          {isWords && (
            <span className="flex items-center gap-1.5 text-[9px] font-black bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
              <PenTool className="size-3" /> TỰ ĐỘNG
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isVTTag && (
            <div className="flex bg-sidebar-dark rounded-xl p-0.5 gap-0.5 shadow-inner border border-border-dark">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAutoFill?.('A'); }}
                className={cn(
                  "px-2 py-1 text-[9px] font-black rounded-lg transition-all",
                  activeParty === 'A' ? "bg-white/10 text-primary shadow-sm ring-1 ring-border-dark" : "hover:bg-white/5 hover:text-primary text-text-dim"
                )}
              >
                BÊN A
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAutoFill?.('B'); }}
                className={cn(
                  "px-2 py-1 text-[9px] font-black rounded-lg transition-all",
                  activeParty === 'B' ? "bg-white/10 text-primary shadow-sm ring-1 ring-border-dark" : "hover:bg-white/5 hover:text-primary text-text-dim"
                )}
              >
                BÊN B
              </button>
            </div>
          )}
          {isDateTag && !isTableTag && (
            <div className={cn(
              "size-7 rounded-lg flex items-center justify-center transition-all shadow-sm",
              activeParty ? "bg-primary/20 text-primary border border-primary/30" : "bg-sidebar-dark text-text-dim group-hover:text-amber-500 border border-border-dark"
            )}>
              <Calendar className="size-3.5" />
            </div>
          )}
          {isCurrency && !isWords && (
            <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-sm">
              <DollarSign className="size-3.5" />
            </div>
          )}
        </div>
      </div>
      {isTableTag ? (
        <div className={cn(
          "min-h-[120px] flex flex-col justify-center px-8 bg-sidebar-dark border-2 border-dashed rounded-[24px] transition-all duration-500 overflow-hidden group-hover:bg-primary/5 group-hover:border-primary/50",
          value ? "border-primary/50 bg-primary/10 shadow-inner" : "border-border-dark"
        )}>
          {value ? (
            <div className="py-4 overflow-x-auto custom-scrollbar -mx-8 px-8">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-black/40 border-y-2 border-border-dark">
                    {value.split('\n')[0]?.split('|').filter(s => s.trim() !== '').map((h, i) => (
                      <th key={h.trim()} className="px-6 py-3 text-left font-black text-white uppercase tracking-widest text-[10px]">
                        {h.trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark">
                  {value.split('\n').slice(2, 8).filter(l => l.trim() !== '').map((line, ri) => (
                    <tr key={ri} className="hover:bg-primary/10 transition-colors group/row">
                      {line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map((cell, ci) => (
                        <td key={ci} className="px-6 py-3 text-white font-bold group-hover/row:text-primary transition-colors border-r border-border-dark last:border-r-0">
                          {cell.trim()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {value.split('\n').slice(2).filter(l => l.trim() !== '').length > 6 && (
                <div className="mt-4 px-4 pb-1 text-xs text-primary italic flex items-center gap-3 font-black uppercase tracking-widest bg-sidebar-dark py-3 border-t-2 border-double border-primary/20 rounded-b-xl">
                  <div className="size-3 rounded-full bg-emerald-500 animate-pulse shadow-md shadow-emerald-500/20" />
                  Hệ thống đã bóc tách {value.split('\n').slice(2).filter(l => l.trim() !== '').length} dòng
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6 text-text-dim" onClick={onOpenSelector}>
              <div className="p-4 bg-white/5 rounded-2xl border border-border-dark group-hover:scale-110 group-hover:text-primary group-hover:rotate-6 transition-all duration-500">
                <Layers className="size-8" />
              </div>
              <div className="text-sm italic font-bold text-center leading-relaxed px-4">
                Khu vực hiển thị bảng dữ liệu chi tiết<br />
                <span className="text-primary not-italic font-black text-[10px] uppercase tracking-widest bg-primary/10 px-4 py-1.5 rounded-full mt-3 inline-block border border-primary/20 active:scale-95 transition-transform">Lấy bảng từ hóa đơn</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "input-field",
              isCurrency && !isWords ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : "",
              isWords ? "italic text-primary bg-primary/10 border-primary/20" : ""
            )}
            placeholder={`Nhập ${(friendlyLabel || '').toLowerCase()}...`}
            rows={value && value.length > 50 ? 3 : (isWords ? 2 : 1)}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />
        </div>
      )}
    </motion.div>
  );
};

const TagRenderItem = ({
  tag,
  formData,
  vtLinks,
  setFormData,
  setVtLinks,
  setActiveInvoiceTag,
  setIsInvoiceSelectorOpen,
  selectedPartyAId,
  selectedPartyBId,
  partners,
  toast,
  handleFieldChange,
  getEffectiveAddressByCurrentDate,
  hideWrapperStyle
}: any) => (
  <TagInput
    tag={tag}
    value={formData[tag] || ''}
    activeParty={vtLinks[tag]}
    onChange={(val) => handleFieldChange(tag, val)}
    hideWrapperStyle={hideWrapperStyle}
    onOpenSelector={() => {
      setActiveInvoiceTag?.(tag);
      setIsInvoiceSelectorOpen?.(true);
    }}
    onAutoFill={(party) => {
      const partnerId = party === 'A' ? selectedPartyAId : selectedPartyBId;
      const partner = partners.find(p => p.id === partnerId);
      if (partner) {
        const upperTag = tag.toUpperCase();
        let val = '';
        if (upperTag.includes('DIA_CHI') || upperTag.includes('DIACHI')) {
          val = getEffectiveAddressByCurrentDate(partner);
        } else {
          val = abbreviateCompanyName(partner.name);
        }
        setFormData((p: Record<string, string>) => ({ ...p, [tag]: val }));
        setVtLinks((p: any) => ({ ...p, [tag]: party }));
        toast(`Đã cập nhật ${getFriendlyLabel(tag)} từ Bên ${party}`, "success");
      } else {
        toast(`Vui lòng chọn đối tác Bên ${party} trước`, "error");
      }
    }}
  />
);

// Context for sharing contract form state to avoid inline unmounting and losing focus
const ContractFormContext = React.createContext<{
  selectedTemplate?: string;
  formData: Record<string, any>;
  handleFieldChange: (tag: string, val: string) => void;
  setActiveInvoiceTag?: (tag: string | null) => void;
  setIsInvoiceSelectorOpen?: (open: boolean) => void;
} | null>(null);

// Inline Editable Content Span to flow seamlessly like normal text
const InlineEditableSpan = ({
  value,
  placeholder,
  onChange,
  className
}: {
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
  className?: string;
}) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.textContent = value || '';
    }
  }, [value]);

  const displayVal = value || '';
  const showPlaceholder = !displayVal && !isFocused;

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        setIsFocused(false);
        const text = e.currentTarget.textContent || '';
        onChange(text);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "border-b-[1.5px] border-dashed border-stone-400 hover:border-primary focus:border-primary focus:border-solid font-bold px-2 py-1 cursor-text transition-all font-sans text-[14px] outline-none focus:bg-stone-100 hover:bg-stone-50/80 rounded-t-md mx-0.5",
        showPlaceholder ? "text-stone-400 font-normal italic" : "text-stone-900",
        className
      )}
      style={{
        display: 'inline',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        minWidth: '30px'
      }}
    >
      {showPlaceholder ? (placeholder || '................................') : displayVal}
    </span>
  );
};

// Helper component for inline dotted editing in simulated A4 layout
const InlineField = ({
  tag,
  placeholder,
  width = 'auto',
  maxLength,
  isNumeric = false
}: {
  tag: string;
  placeholder?: string;
  width?: string;
  maxLength?: number;
  isNumeric?: boolean;
}) => {
  const context = React.useContext(ContractFormContext);
  if (!context) return null;
  const { formData, handleFieldChange } = context;

  const val = formData[tag] || '';
  const displayVal = val !== undefined && val !== null ? String(val) : '';
  
  // For longer text fields, use dynamic inline-editable span to wrap perfectly like normal text
  // Short numeric or length-restricted fields can remain standard inputs.
  const isLongField = !isNumeric && (!maxLength || maxLength > 5);

  // Dynamic width calculation based on text length to avoid clipping
  const measureText = displayVal || placeholder || '................................';
  const charWidth = 8.5; // width of character in pixels
  const calculatedWidth = measureText.length * charWidth + 16;
  const dynamicWidth = width === 'auto' 
    ? `${Math.max(50, calculatedWidth)}px` 
    : `max(${width}, ${calculatedWidth}px)`;

  if (isLongField) {
    return (
      <span className="inline relative group mx-0.5 align-baseline">
        <InlineEditableSpan
          value={displayVal}
          placeholder={placeholder}
          onChange={(nextVal) => {
            // Prevent manual newlines by replacing them with space, maintaining single-paragraph flow
            const cleanedVal = nextVal.replace(/\r?\n/g, ' ');
            handleFieldChange(tag, cleanedVal);
          }}
          className={cn(
            displayVal ? "border-stone-300" : "text-stone-400"
          )}
        />
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-stone-950 text-white text-[9px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg uppercase font-sans">
          {getFriendlyLabel(tag)} ({tag})
        </span>
      </span>
    );
  }

  return (
    <span className="inline-block relative group mx-0.5 align-middle max-w-full">
      <input
        type="text"
        value={displayVal}
        placeholder={placeholder || '................................'}
        maxLength={maxLength}
        onChange={(e) => {
          let nextVal = e.target.value;
          if (isNumeric) nextVal = nextVal.replace(/\D/g, '');
          handleFieldChange(tag, nextVal);
        }}
        className={cn(
          "bg-transparent border-b-[1.5px] border-dashed border-stone-400 hover:border-primary focus:border-primary focus:border-solid text-stone-900 font-bold focus:outline-none focus:ring-0 px-2 py-1 text-center transition-all inline-block font-sans text-[14px] max-w-full hover:bg-stone-50/80 focus:bg-stone-100 rounded-t-md cursor-pointer focus:cursor-text",
          displayVal ? "border-stone-400" : "text-stone-400 italic"
        )}
        style={{ width: dynamicWidth }}
      />
      <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-stone-950 text-white text-[9px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg uppercase font-sans">
        {getFriendlyLabel(tag)} ({tag})
      </span>
    </span>
  );
};

// --- Markdown Table Parser / Serializer for InlineTextArea ---
interface TableRow {
  stt: string;
  description: string;
  unit: string;
  quantity: string;
  price: string;
  total: string;
  // Extra columns for 9-column tables
  thoiGianThue?: string; // for HDCM
  vat8?: string;         // for HDCM and HDNT
  vat10?: string;        // for HDNT
  tongCong?: string;     // for HDCM and HDNT
  isSummary?: boolean; // For TỔNG CỘNG rows
}

const parseMarkdownToRows = (md: string, contractType?: string): TableRow[] => {
  if (!md || !md.trim()) return [];
  const lines = md.split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 3) return []; // Need header + separator + at least 1 data row
  const dataLines = lines.slice(2);
  return dataLines.map(line => {
    const cells = line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim());
    const isSummary = !cells[0] && (
      (cells[1] || '').toUpperCase().includes('TỔNG') ||
      (cells[1] || '').toUpperCase().includes('THUẾ') ||
      (cells[1] || '').toUpperCase().includes('VAT')
    );

    if (contractType === 'HDCM') {
      return {
        stt: cells[0] || '',
        description: cells[1] || '',
        unit: cells[2] || '',
        quantity: cells[3] || '',
        price: cells[4] || '',
        thoiGianThue: cells[5] || '',
        total: cells[6] || '',
        vat8: cells[7] || '',
        tongCong: cells[8] || '',
        isSummary,
      };
    } else if (contractType === 'HDNT') {
      return {
        stt: cells[0] || '',
        description: cells[1] || '',
        unit: cells[2] || '',
        quantity: cells[3] || '',
        price: cells[4] || '',
        total: cells[5] || '',
        vat8: cells[6] || '',
        vat10: cells[7] || '',
        tongCong: cells[8] || '',
        isSummary,
      };
    } else {
      return {
        stt: cells[0] || '',
        description: cells[1] || '',
        unit: cells[2] || '',
        quantity: cells[3] || '',
        price: cells[4] || '',
        total: cells[5] || '',
        isSummary,
      };
    }
  });
};

const serializeRowsToMarkdown = (rows: TableRow[], contractType?: string): string => {
  if (contractType === 'HDCM') {
    let md = "| STT | NỘI DUNG | ĐVT | KHỐI LƯỢNG | ĐƠN GIÁ VNĐ | THỜI GIAN THUÊ (tháng) | THÀNH TIỀN | VAT 8% | TỔNG CỘNG |\n";
    md += "|:---:|:---|:---:|---:|---:|---:|---:|---:|---:|\n";
    rows.forEach(r => {
      md += `| ${r.stt || ''} | ${r.description || ''} | ${r.unit || ''} | ${r.quantity || ''} | ${r.price || ''} | ${r.thoiGianThue || ''} | ${r.total || ''} | ${r.vat8 || ''} | ${r.tongCong || ''} |\n`;
    });
    return md.trimEnd();
  } else if (contractType === 'HDNT') {
    let md = "| STT | Nội dung | ĐVT | Khối lượng | Đơn giá (VNĐ) | Thành tiền | VAT 8% | VAT 10% | Tổng cộng |\n";
    md += "|:---:|:---|:---:|---:|---:|---:|---:|---:|---:|\n";
    rows.forEach(r => {
      md += `| ${r.stt || ''} | ${r.description || ''} | ${r.unit || ''} | ${r.quantity || ''} | ${r.price || ''} | ${r.total || ''} | ${r.vat8 || ''} | ${r.vat10 || ''} | ${r.tongCong || ''} |\n`;
    });
    return md.trimEnd();
  } else {
    let md = "| STT | Nội dung hàng hóa, dịch vụ | ĐVT | Số lượng | Đơn giá | Thành tiền |\n";
    md += "|:---:|:---|:---:|---:|---:|---:|\n";
    rows.forEach(r => {
      md += `| ${r.stt || ''} | ${r.description || ''} | ${r.unit || ''} | ${r.quantity || ''} | ${r.price || ''} | ${r.total || ''} |\n`;
    });
    return md.trimEnd();
  }
};

const formatNumberInput = (val: string | number): string => {
  if (val === undefined || val === null || val === '') return '';
  
  let str = '';
  if (typeof val === 'number') {
    const parts = String(val).split('.');
    const decimalPlaces = parts.length > 1 ? parts[1].length : 0;
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: Math.max(decimalPlaces, 3)
    }).format(val);
  } else {
    str = val;
  }
  
  if (str.includes('.') && !str.includes(',')) {
    const parts = str.split('.');
    if (parts.length === 2 && parts[0].length > 3) {
      str = str.replace(/\./g, ',');
    }
  }
  
  const clean = str.replace(/\./g, '');
  if (!clean) return '';
  const parts = clean.split(',');
  const integerPart = parts[0].replace(/[^0-9]/g, '');
  
  if (!integerPart && parts.length > 1) {
    return `0,${parts[1].replace(/[^0-9]/g, '').slice(0, 3)}`;
  }
  if (!integerPart) return '';
  
  const formattedInt = parseInt(integerPart, 10).toLocaleString('vi-VN').replace(/,/g, '.');
  if (parts.length > 1) {
    const decimalPart = parts[1].replace(/[^0-9]/g, '').slice(0, 3);
    return `${formattedInt},${decimalPart}`;
  }
  return formattedInt;
};

const parseFormattedNumber = (val: string): number => {
  if (!val) return 0;
  const clean = val.replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

// Helper component for spacious lined texts/tables in simulated A4 layout
const InlineTextArea = ({
  tag,
  placeholder,
  rows = 4
}: {
  tag: string;
  placeholder?: string;
  rows?: number;
}) => {
  const context = React.useContext(ContractFormContext);
  if (!context) return null;
  const { selectedTemplate, formData, handleFieldChange, setActiveInvoiceTag, setIsInvoiceSelectorOpen } = context;

  const val = formData[tag] || '';
  const upper = tag.toUpperCase();
  const isTableTag = (upper.includes('BANG') || upper.includes('TABLE')) &&
    !upper.includes('BANG_CHU') &&
    !upper.includes('BANGCHU');

  // --- Visual Table Mode for table tags ---
  if (isTableTag) {
    const contractType = selectedTemplate;
    let tableRows = parseMarkdownToRows(val, contractType);
    // Separate data rows from summary rows
    const dataRows = tableRows.filter(r => !r.isSummary);
    const summaryRows = tableRows.filter(r => r.isSummary);

    const updateTable = (newDataRows: TableRow[]) => {
      // Re-calculate grand total from data rows
      let grandTotal = 0;
      let totalVat = 0;

      // Extract the existing VAT percentage from the data rows or default to 8
      let vatPercent = 8;
      for (const r of dataRows) {
        if (r.vat10 && r.vat10 !== '-' && r.vat10 !== '—' && r.vat10.trim() !== '') {
          vatPercent = 10;
          break;
        }
        if (r.vat8 && r.vat8 !== '-' && r.vat8 !== '—' && r.vat8.trim() !== '') {
          vatPercent = 8;
          break;
        }
      }

      // Check if there was any summary row with VAT percent (e.g. from an old markdown table)
      const vatRow = summaryRows.find(r => r.description.toUpperCase().includes('THUẾ') || r.description.toUpperCase().includes('VAT') || r.description.toUpperCase().includes('THUÊ'));
      if (vatRow) {
        const match = vatRow.description.match(/(\d+(?:\.\d+)?)\s*%/);
        if (match) {
          vatPercent = parseFloat(match[1]);
        }
      }

      const parseThoiGianThue = (s: string | undefined | null): number => {
        if (!s) return 1;
        const clean = s.replace(/,/g, '.').replace(/[^0-9.]/g, '');
        const val = parseFloat(clean);
        return isNaN(val) || val <= 0 ? 1 : val;
      };

      const updatedData = newDataRows.map((r, i) => {
        const qty = parseFormattedNumber(r.quantity);
        const price = parseFormattedNumber(r.price);

        if (contractType === 'HDCM') {
          const rentTime = parseThoiGianThue(r.thoiGianThue);
          const rowTotal = qty * price * rentTime;
          grandTotal += rowTotal;

          const displayTotal = rowTotal > 0 ? formatNumberInput(String(rowTotal)) : '';
          const vatVal = Math.round(rowTotal * 0.08);
          totalVat += vatVal;
          const totalWithVat = rowTotal + vatVal;

          return {
            ...r,
            stt: String(i + 1),
            total: displayTotal,
            vat8: vatVal > 0 ? formatNumberInput(String(vatVal)) : '',
            tongCong: totalWithVat > 0 ? formatNumberInput(String(totalWithVat)) : ''
          };
        } else if (contractType === 'HDNT') {
          const rowTotal = qty * price;
          grandTotal += rowTotal;

          const displayTotal = rowTotal > 0 ? formatNumberInput(String(rowTotal)) : '';
          
          // Determine row-specific VAT rate
          let rowVatPercent = 8;
          if (r.vat10 && r.vat10 !== '-' && r.vat10 !== '—' && r.vat10.trim() !== '') {
            rowVatPercent = 10;
          } else if (r.vat8 && r.vat8 !== '-' && r.vat8 !== '—' && r.vat8.trim() !== '') {
            rowVatPercent = 8;
          } else {
            rowVatPercent = vatPercent;
          }

          const vatVal = Math.round(rowTotal * rowVatPercent / 100);
          totalVat += vatVal;

          const vat8Str = rowVatPercent === 8 ? (vatVal > 0 ? formatNumberInput(String(vatVal)) : '') : '-';
          const vat10Str = rowVatPercent === 10 ? (vatVal > 0 ? formatNumberInput(String(vatVal)) : '') : '-';
          const totalWithVat = rowTotal + vatVal;

          return {
            ...r,
            stt: String(i + 1),
            total: displayTotal,
            vat8: vat8Str,
            vat10: vat10Str,
            tongCong: totalWithVat > 0 ? formatNumberInput(String(totalWithVat)) : ''
          };
        } else {
          const rowTotal = qty * price;
          grandTotal += rowTotal;
          const displayTotal = rowTotal > 0 ? formatNumberInput(String(rowTotal)) : '';

          return {
            ...r,
            stt: String(i + 1),
            total: displayTotal
          };
        }
      });

      // Rebuild summary rows with updated totals
      const newSummary: TableRow[] = [];
      
      if (contractType === 'HDCM') {
        const totalThanhTienSum = updatedData.reduce((sum, r) => sum + parseFormattedNumber(r.total || '0'), 0);
        const totalVatSum = updatedData.reduce((sum, r) => sum + parseFormattedNumber(r.vat8 || '0'), 0);
        const grandTotalSum = updatedData.reduce((sum, r) => sum + parseFormattedNumber(r.tongCong || '0'), 0);

        newSummary.push({
          stt: '',
          description: 'Tổng cộng',
          unit: '',
          quantity: '',
          price: '',
          thoiGianThue: '',
          total: formatNumberInput(String(totalThanhTienSum)),
          vat8: totalVatSum > 0 ? formatNumberInput(String(totalVatSum)) : '',
          tongCong: formatNumberInput(String(grandTotalSum)),
          isSummary: true
        });
      } else if (contractType === 'HDNT') {
        const totalThanhTienSum = updatedData.reduce((sum, r) => sum + parseFormattedNumber(r.total || '0'), 0);
        const totalVat8Sum = updatedData.reduce((sum, r) => sum + (r.vat8 && r.vat8 !== '-' ? parseFormattedNumber(r.vat8) : 0), 0);
        const totalVat10Sum = updatedData.reduce((sum, r) => sum + (r.vat10 && r.vat10 !== '-' ? parseFormattedNumber(r.vat10) : 0), 0);
        const grandTotalSum = updatedData.reduce((sum, r) => sum + parseFormattedNumber(r.tongCong || '0'), 0);

        newSummary.push({
          stt: '',
          description: 'Tổng cộng',
          unit: '',
          quantity: '',
          price: '',
          total: formatNumberInput(String(totalThanhTienSum)),
          vat8: totalVat8Sum > 0 ? formatNumberInput(String(totalVat8Sum)) : '-',
          vat10: totalVat10Sum > 0 ? formatNumberInput(String(totalVat10Sum)) : '-',
          tongCong: formatNumberInput(String(grandTotalSum)),
          isSummary: true
        });
      } else {
        const hasVAT = summaryRows.some(r => r.description.toUpperCase().includes('THUẾ') || r.description.toUpperCase().includes('VAT') || r.description.toUpperCase().includes('THUÊ'));
        if (hasVAT) {
          const vat = Math.round(grandTotal * (vatPercent / 100));
          const gTotal = grandTotal + vat;
          newSummary.push({ stt: '', description: 'TỔNG CỘNG TIỀN HÀNG', unit: '', quantity: '', price: '', total: formatNumberInput(String(grandTotal)), isSummary: true });
          newSummary.push({ stt: '', description: `THUẾ GIÁ TRỊ GIA TĂNG (${vatPercent}%)`, unit: '', quantity: '', price: '', total: formatNumberInput(String(vat)), isSummary: true });
          newSummary.push({ stt: '', description: 'TỔNG CỘNG TIỀN THANH TOÁN', unit: '', quantity: '', price: '', total: formatNumberInput(String(gTotal)), isSummary: true });
        } else {
          newSummary.push({ stt: '', description: 'TỔNG CỘNG', unit: '', quantity: '', price: '', total: formatNumberInput(String(grandTotal)), isSummary: true });
        }
      }

      const allRows = [...updatedData, ...newSummary];
      handleFieldChange(tag, serializeRowsToMarkdown(allRows, contractType));
    };

    const handleCellEdit = (index: number, field: keyof TableRow, value: string) => {
      const next = [...dataRows];
      next[index] = { ...next[index], [field]: value };
      updateTable(next);
    };

    const addRow = () => {
      const next = [...dataRows, {
        stt: '',
        description: '',
        unit: '',
        quantity: '',
        price: '',
        total: '',
        thoiGianThue: '',
        vat8: '',
        vat10: '',
        tongCong: ''
      }];
      updateTable(next);
    };

    const removeRow = (index: number) => {
      if (dataRows.length <= 1) {
        updateTable([{
          stt: '1',
          description: '',
          unit: '',
          quantity: '',
          price: '',
          total: '',
          thoiGianThue: '',
          vat8: '',
          vat10: '',
          tongCong: ''
        }]);
        return;
      }
      const next = dataRows.filter((_, i) => i !== index);
      updateTable(next);
    };

    const hasData = dataRows.length > 0;

    let headers: React.ReactNode;
    let bodyRows: React.ReactNode;
    let summaryRowsRendered: React.ReactNode;
    let tableWidthClass = "w-full";

    if (contractType === 'HDCM') {
      tableWidthClass = "w-full";
      headers = (
        <tr className="bg-stone-100 text-[9px] font-bold uppercase tracking-wider text-stone-600 border-b border-stone-300">
          <th className="py-2 px-1 text-center w-[4%] border-r border-stone-300">STT</th>
          <th className="py-2 px-1.5 w-[30%] border-r border-stone-300">NỘI DUNG</th>
          <th className="py-2 px-1 w-[6%] text-center border-r border-stone-300">ĐVT</th>
          <th className="py-2 px-1 w-[8%] text-right border-r border-stone-300">KHỐI LƯỢNG</th>
          <th className="py-2 px-1 w-[12%] text-right border-r border-stone-300">ĐƠN GIÁ VNĐ</th>
          <th className="py-2 px-1 w-[7%] text-right border-r border-stone-300">THỜI GIAN THUÊ</th>
          <th className="py-2 px-1 w-[11%] text-right border-r border-stone-300">THÀNH TIỀN</th>
          <th className="py-2 px-1 w-[9%] text-right border-r border-stone-300">VAT 8%</th>
          <th className="py-2 px-1 w-[10%] text-right border-r border-stone-300">TỔNG CỘNG</th>
          <th className="py-2 px-1 w-[3%] text-center"></th>
        </tr>
      );

      bodyRows = dataRows.map((row, index) => (
        <tr key={index} className="hover:bg-stone-50/50 transition-colors">
          <td className="py-1 px-1 text-center font-bold text-stone-400 border-r border-stone-200 text-[10px]">{index + 1}</td>
          <td className="py-0.5 px-1 border-r border-stone-200">
            <textarea
              value={row.description}
              onChange={(e) => {
                handleCellEdit(index, 'description', e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                }
              }}
              placeholder="Nhập nội dung..."
              rows={1}
              style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}
              className="w-full bg-transparent hover:bg-stone-50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded px-1 py-0.5 text-[11px] text-stone-900 outline-none transition-all resize-none overflow-hidden whitespace-normal break-words leading-relaxed"
            />
          </td>
          <td className="py-0.5 px-0.5 border-r border-stone-200">
            <input
              type="text"
              value={row.unit}
              onChange={(e) => handleCellEdit(index, 'unit', e.target.value)}
              placeholder="—"
              className="w-full text-center bg-transparent hover:bg-stone-50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded py-0.5 text-[11px] text-stone-900 outline-none transition-all"
            />
          </td>
          <td className="py-0.5 px-0.5 border-r border-stone-200">
            <input
              type="text"
              value={row.quantity}
              onChange={(e) => handleCellEdit(index, 'quantity', e.target.value)}
              placeholder="—"
              className="w-full text-right bg-transparent hover:bg-stone-50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded py-0.5 text-[11px] text-stone-900 outline-none transition-all"
            />
          </td>
          <td className="py-0.5 px-0.5 border-r border-stone-200">
            <input
              type="text"
              value={row.price}
              onChange={(e) => {
                const formatted = formatNumberInput(e.target.value);
                handleCellEdit(index, 'price', formatted);
              }}
              placeholder="—"
              className="w-full text-right bg-transparent hover:bg-stone-50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded py-0.5 text-[11px] text-stone-900 font-medium outline-none transition-all"
            />
          </td>
          <td className="py-0.5 px-0.5 border-r border-stone-200">
            <input
              type="text"
              value={row.thoiGianThue || ''}
              onChange={(e) => handleCellEdit(index, 'thoiGianThue', e.target.value)}
              placeholder="—"
              className="w-full text-right bg-transparent hover:bg-stone-50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded py-0.5 text-[11px] text-stone-900 outline-none transition-all"
            />
          </td>
          <td className="py-1 px-1 text-right font-semibold text-stone-900 border-r border-stone-200 text-[10px] leading-tight select-all">
            {row.total || '—'}
          </td>
          <td className="py-1 px-1 text-right font-semibold text-stone-900 border-r border-stone-200 text-[10px] leading-tight select-all">
            {row.vat8 || '—'}
          </td>
          <td className="py-1 px-1 text-right font-semibold text-stone-900 border-r border-stone-200 text-[10px] leading-tight select-all">
            {row.tongCong || '—'}
          </td>
          <td className="py-0.5 px-0.5 text-center">
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="text-stone-300 hover:text-red-500 transition-colors p-0.5"
              title="Xóa dòng"
            >
              <Trash2 className="size-3" />
            </button>
          </td>
        </tr>
      ));

      summaryRowsRendered = summaryRows.map((sr, i) => {
        return (
          <tr key={`summary-${i}`} className="border-t border-stone-300 bg-stone-100 font-bold text-stone-900">
            <td className="py-1 px-1 border-r border-stone-300"></td>
            <td colSpan={5} className="py-1 px-1.5 font-bold text-stone-700 text-[9px] uppercase tracking-wide border-r border-stone-300 text-right">
              {sr.description}
            </td>
            <td className="py-1 px-1 text-right font-black text-stone-900 border-r border-stone-300 text-[10px] leading-tight">
              {sr.total || '—'}
            </td>
            <td className="py-1 px-1 text-right font-black text-stone-900 border-r border-stone-300 text-[10px] leading-tight">
              {sr.vat8 || '—'}
            </td>
            <td className="py-1 px-1 text-right font-black text-stone-900 border-r border-stone-300 text-[10px] leading-tight">
              {sr.tongCong || '—'}
            </td>
            <td className="py-0.5 px-0.5"></td>
          </tr>
        );
      });
    } else if (contractType === 'HDNT') {
      tableWidthClass = "w-full";
      headers = (
        <tr className="bg-stone-100 text-[9px] font-bold uppercase tracking-wider text-stone-600 border-b border-stone-300">
          <th className="py-2 px-1 text-center w-[4%] border-r border-stone-300">STT</th>
          <th className="py-2 px-1.5 w-[28%] border-r border-stone-300">Nội dung</th>
          <th className="py-2 px-1 w-[6%] text-center border-r border-stone-300">ĐVT</th>
          <th className="py-2 px-1 w-[8%] text-right border-r border-stone-300">Khối lượng</th>
          <th className="py-2 px-1 w-[13%] text-right border-r border-stone-300">Đơn giá (VNĐ)</th>
          <th className="py-2 px-1 w-[12%] text-right border-r border-stone-300">Thành tiền</th>
          <th className="py-2 px-1 w-[9%] text-right border-r border-stone-300">VAT 8%</th>
          <th className="py-2 px-1 w-[9%] text-right border-r border-stone-300">VAT 10%</th>
          <th className="py-2 px-1 w-[9%] text-right border-r border-stone-300">Tổng cộng</th>
          <th className="py-2 px-1 w-[2%] text-center"></th>
        </tr>
      );

      bodyRows = dataRows.map((row, index) => (
        <tr key={index} className="hover:bg-stone-50/50 transition-colors">
          <td className="py-1 px-1 text-center font-bold text-stone-400 border-r border-stone-200 text-[10px]">{index + 1}</td>
          <td className="py-0.5 px-1 border-r border-stone-200">
            <textarea
              value={row.description}
              onChange={(e) => {
                handleCellEdit(index, 'description', e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                }
              }}
              placeholder="Nhập nội dung..."
              rows={1}
              style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}
              className="w-full bg-transparent hover:bg-stone-50/50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded px-1.5 py-0.5 text-[11px] text-stone-900 outline-none transition-all resize-none overflow-hidden whitespace-normal break-words leading-relaxed"
            />
          </td>
          <td className="py-0.5 px-0.5 border-r border-stone-200">
            <input
              type="text"
              value={row.unit}
              onChange={(e) => handleCellEdit(index, 'unit', e.target.value)}
              placeholder="—"
              className="w-full text-center bg-transparent hover:bg-stone-50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded py-0.5 text-[11px] text-stone-900 outline-none transition-all"
            />
          </td>
          <td className="py-0.5 px-0.5 border-r border-stone-200">
            <input
              type="text"
              value={row.quantity}
              onChange={(e) => handleCellEdit(index, 'quantity', e.target.value)}
              placeholder="—"
              className="w-full text-right bg-transparent hover:bg-stone-50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded py-0.5 text-[11px] text-stone-900 outline-none transition-all"
            />
          </td>
          <td className="py-0.5 px-0.5 border-r border-stone-200">
            <input
              type="text"
              value={row.price}
              onChange={(e) => {
                const formatted = formatNumberInput(e.target.value);
                handleCellEdit(index, 'price', formatted);
              }}
              placeholder="—"
              className="w-full text-right bg-transparent hover:bg-stone-50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded py-0.5 text-[11px] text-stone-900 font-medium outline-none transition-all"
            />
          </td>
          <td className="py-1 px-1 text-right font-semibold text-stone-900 border-r border-stone-200 text-[10px] leading-tight select-all">
            {row.total || '—'}
          </td>
          <td className="py-1 px-1 text-right font-semibold text-stone-900 border-r border-stone-200 text-[10px] leading-tight select-all">
            {row.vat8 || '—'}
          </td>
          <td className="py-1 px-1 text-right font-semibold text-stone-900 border-r border-stone-200 text-[10px] leading-tight select-all">
            {row.vat10 || '—'}
          </td>
          <td className="py-1 px-1 text-right font-semibold text-stone-900 border-r border-stone-200 text-[10px] leading-tight select-all">
            {row.tongCong || '—'}
          </td>
          <td className="py-0.5 px-0.5 text-center">
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="text-stone-300 hover:text-red-500 transition-colors p-0.5"
              title="Xóa dòng"
            >
              <Trash2 className="size-3" />
            </button>
          </td>
        </tr>
      ));

      summaryRowsRendered = summaryRows.map((sr, i) => {
        return (
          <tr key={`summary-${i}`} className="border-t border-stone-300 bg-stone-100 font-bold text-stone-900">
            <td className="py-1 px-1 border-r border-stone-300"></td>
            <td colSpan={4} className="py-1 px-1.5 font-bold text-stone-700 text-[9px] uppercase tracking-wide border-r border-stone-300 text-right">
              {sr.description}
            </td>
            <td className="py-1 px-1 text-right font-black text-stone-900 border-r border-stone-300 text-[10px] leading-tight">
              {sr.total || '—'}
            </td>
            <td className="py-1 px-1 text-right font-black text-stone-900 border-r border-stone-300 text-[10px] leading-tight">
              {sr.vat8 || '—'}
            </td>
            <td className="py-1 px-1 text-right font-black text-stone-900 border-r border-stone-300 text-[10px] leading-tight">
              {sr.vat10 || '—'}
            </td>
            <td className="py-1 px-1 text-right font-black text-stone-900 border-r border-stone-300 text-[10px] leading-tight">
              {sr.tongCong || '—'}
            </td>
            <td className="py-0.5 px-0.5"></td>
          </tr>
        );
      });
    } else {
      tableWidthClass = "w-full";
      headers = (
        <tr className="bg-stone-100 text-[10px] font-bold uppercase tracking-wider text-stone-600 border-b border-stone-300">
          <th className="py-2 px-1 text-center w-[5%] border-r border-stone-300">STT</th>
          <th className="py-2 px-1.5 w-[45%] border-r border-stone-300">Nội dung hàng hóa, dịch vụ</th>
          <th className="py-2 px-1 w-[7%] text-center border-r border-stone-300">ĐVT</th>
          <th className="py-2 px-1 w-[10%] text-right border-r border-stone-300">Số lượng</th>
          <th className="py-2 px-1 w-[15%] text-right border-r border-stone-300">Đơn giá</th>
          <th className="py-2 px-1 w-[15%] text-right border-r border-stone-300">Thành tiền</th>
          <th className="py-2 px-1 w-[3%] text-center"></th>
        </tr>
      );

      bodyRows = dataRows.map((row, index) => (
        <tr key={index} className="hover:bg-stone-50/50 transition-colors">
          <td className="py-1 px-1 text-center font-bold text-stone-400 border-r border-stone-200 text-[10px]">{index + 1}</td>
          <td className="py-0.5 px-1 border-r border-stone-200">
            <textarea
              value={row.description}
              onChange={(e) => {
                handleCellEdit(index, 'description', e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                }
              }}
              placeholder="Nhập nội dung..."
              rows={1}
              style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}
              className="w-full bg-transparent hover:bg-stone-50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded px-1.5 py-0.5 text-[11px] text-stone-900 outline-none transition-all resize-none overflow-hidden whitespace-normal break-words leading-relaxed"
            />
          </td>
          <td className="py-0.5 px-0.5 border-r border-stone-200">
            <input
              type="text"
              value={row.unit}
              onChange={(e) => handleCellEdit(index, 'unit', e.target.value)}
              placeholder="—"
              className="w-full text-center bg-transparent hover:bg-stone-50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded py-0.5 text-[11px] text-stone-900 outline-none transition-all"
            />
          </td>
          <td className="py-0.5 px-0.5 border-r border-stone-200">
            <input
              type="text"
              value={row.quantity}
              onChange={(e) => handleCellEdit(index, 'quantity', e.target.value)}
              placeholder="0"
              className="w-full text-right bg-transparent hover:bg-stone-50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded py-0.5 text-[11px] text-stone-900 outline-none transition-all"
            />
          </td>
          <td className="py-0.5 px-0.5 border-r border-stone-200">
            <input
              type="text"
              value={row.price}
              onChange={(e) => {
                const formatted = formatNumberInput(e.target.value);
                handleCellEdit(index, 'price', formatted);
              }}
              placeholder="0"
              className="w-full text-right bg-transparent hover:bg-stone-50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded py-0.5 text-[11px] text-stone-900 font-medium outline-none transition-all"
            />
          </td>
          <td className="py-1 px-1 text-right font-semibold text-stone-900 border-r border-stone-200 text-[10px] leading-tight select-all">
            {row.total || '—'}
          </td>
          <td className="py-0.5 px-0.5 text-center">
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="text-stone-300 hover:text-red-500 transition-colors p-0.5"
              title="Xóa dòng"
            >
              <Trash2 className="size-3" />
            </button>
          </td>
        </tr>
      ));

      summaryRowsRendered = summaryRows.map((sr, i) => {
        const isGrandTotal = sr.description.toUpperCase().includes('THANH TOÁN') ||
          (sr.description.toUpperCase().includes('TỔNG CỘNG') && !sr.description.toUpperCase().includes('HÀNG') && !sr.description.toUpperCase().includes('THUẾ'));
        return (
          <tr key={`summary-${i}`} className={cn(
            "border-t border-stone-300",
            isGrandTotal ? "bg-stone-100 font-bold text-stone-900" : "bg-stone-50 text-stone-700"
          )}>
            <td className="py-1 px-1 border-r border-stone-300"></td>
            <td colSpan={4} className="py-1 px-1.5 font-bold text-[9px] uppercase tracking-wide border-r border-stone-300">
              {sr.description}
            </td>
            <td className={cn(
              "py-1 px-1 text-right border-r border-stone-300 leading-tight",
              isGrandTotal ? "text-[11px] font-black" : "text-[10px] font-semibold"
            )}>
              {sr.total}
            </td>
            <td className="py-0.5 px-0.5"></td>
          </tr>
        );
      });
    }

    return (
      <div className="w-full relative group my-3 font-sans text-xs">
        {/* Action bar */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
            {getFriendlyLabel(tag)}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addRow}
              className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-600 text-[9px] font-bold uppercase tracking-wider rounded transition-all active:scale-95 flex items-center gap-1"
            >
              <PlusSquare className="size-2.5" /> Thêm dòng
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveInvoiceTag?.(tag);
                setIsInvoiceSelectorOpen?.(true);
              }}
              className="flex items-center gap-1 px-2 py-0.5 bg-stone-900 hover:bg-stone-800 border border-stone-950 text-white rounded text-[9px] font-black uppercase tracking-wider shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Layers className="size-2.5" /> Lấy từ hóa đơn
            </button>
          </div>
        </div>

        {/* Visual Table */}
        {hasData ? (
          <div className="overflow-x-auto rounded border border-stone-300 shadow-sm bg-white">
            <table className={cn("text-left border-collapse text-xs table-fixed", tableWidthClass)}>
              <thead>
                {headers}
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-900 bg-white">
                {bodyRows}
                {summaryRowsRendered}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty state: show a placeholder table with add button */
          <div className="border border-dashed border-stone-300 rounded bg-stone-50/50 p-6 text-center">
            <div className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-2">
              Chưa có dữ liệu bảng
            </div>
            <p className="text-stone-400 text-[10px] mb-3">
              Nhấn "Lấy từ hóa đơn" để tự động tạo bảng từ hóa đơn, hoặc "Thêm dòng" để nhập thủ công.
            </p>
            <button
              type="button"
              onClick={addRow}
              className="px-3 py-1 bg-stone-200 hover:bg-stone-300 border border-stone-300 text-stone-700 text-[9px] font-bold uppercase tracking-wider rounded transition-all active:scale-95 inline-flex items-center gap-1"
            >
              <PlusSquare className="size-3" /> Tạo bảng mới
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- Fallback: Regular textarea for non-table tags ---
  return (
    <div className="w-full relative group my-2 font-sans text-xs">
      <textarea
        value={val}
        rows={rows}
        placeholder={placeholder || 'Nhập chi tiết bảng giá trị/nội dung tại đây...'}
        onChange={(e) => handleFieldChange(tag, e.target.value)}
        className="w-full bg-stone-50 hover:bg-stone-100/50 focus:bg-white border border-stone-200 hover:border-stone-400 focus:border-stone-600 rounded p-3 text-stone-900 font-mono text-xs focus:outline-none focus:ring-0 transition-all resize-y"
      />
      <span className="absolute -top-7 left-3 bg-stone-950 text-white text-[9px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg uppercase font-sans">
        {getFriendlyLabel(tag)} ({tag})
      </span>
    </div>
  );
};

const escapeXml = (unsafe: string): string => {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

const formatCurrency = (val: number): string => {
  if (isNaN(val) || val === 0) return '';
  const parts = String(val).split('.');
  const decimalPlaces = parts.length > 1 ? parts[1].length : 0;
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: Math.max(decimalPlaces, 3)
  }).format(val);
};

const cleanVal = (val: string | null | undefined): string => {
  if (!val) return '';
  const s = val.trim();
  if (s === '0' || s === '-' || s === '---' || s === '0,00' || s === '0.00') return '';
  return s;
};

const parseMoney = (s: string) => {
  if (!s || s === '-' || s === '—') return 0;
  const clean = s.replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

const makeCell = (text: string, width: string, align: string, bold = false, span = 0, vAlign = '', shade = '') => {
  const escaped = escapeXml(text);
  const bTag = bold ? '<w:b/><w:bCs/>' : '';
  const runTag = escaped ? `<w:r><w:rPr>
    <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
    ${bTag}
    <w:sz w:val="26"/><w:szCs w:val="26"/>
  </w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r>` : '';
  const spanTag = span ? `<w:gridSpan w:val="${span}"/>` : '';
  const vAlignTag = vAlign ? `<w:vAlign w:val="${vAlign}"/>` : '';
  const shadeTag = shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : '';
  return `<w:tc><w:tcPr>${spanTag}<w:tcW w:w="${width}" w:type="dxa"/>${shadeTag}${vAlignTag}</w:tcPr>
    <w:p><w:pPr><w:jc w:val="${align}"/><w:spacing w:before="60" w:after="60"/></w:pPr>${runTag}</w:p>
  </w:tc>`;
};

const makeSummaryRow = (
  label: string,
  value: string,
  totalCols: number,
  spanWidth: number,
  lastColWidth: number
) => {
  const labelCell = `<w:tc>
    <w:tcPr>
      <w:gridSpan w:val="${totalCols - 1}"/>
      <w:tcW w:w="${spanWidth}" w:type="dxa"/>
      <w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
    </w:tcPr>
    <w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="60"/></w:pPr>
      <w:r><w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
        <w:b/><w:bCs/>
        <w:sz w:val="26"/><w:szCs w:val="26"/>
      </w:rPr>
      <w:t xml:space="preserve">${escapeXml(label)}</w:t>
    </w:r></w:p>
  </w:tc>`;
  const valueCell = makeCell(value, String(lastColWidth), 'right', true, 0, '', 'F2F2F2');
  return `<w:tr>${labelCell}${valueCell}</w:tr>`;
};

const generateCaMayTable = (rows: TableRow[]): string => {
  const dataRows = rows.filter(r => !r.isSummary);

  const colWidths = {
    stt: '500',
    noiDung: '2500',
    dvt: '600',
    khoiLuong: '900',
    donGia: '1300',
    thoiGian: '1188',
    thanhTien: '1400',
    vat8: '1000',
    tongCong: '1100'
  };

  const columns = [
    colWidths.stt,
    colWidths.noiDung,
    colWidths.dvt,
    colWidths.khoiLuong,
    colWidths.donGia,
    colWidths.thoiGian,
    colWidths.thanhTien,
    colWidths.vat8,
    colWidths.tongCong
  ];

  // Header Row
  const headerRow = `<w:tr><w:trPr><w:trHeight w:val="450"/><w:tblHeader/></w:trPr>` +
    makeCell('STT', colWidths.stt, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('NỘI DUNG', colWidths.noiDung, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('ĐVT', colWidths.dvt, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('KHỐI LƯỢNG', colWidths.khoiLuong, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('ĐƠN GIÁ VNĐ', colWidths.donGia, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('THỜI GIAN THUÊ', colWidths.thoiGian, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('THÀNH TIỀN', colWidths.thanhTien, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('VAT 8%', colWidths.vat8, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('TỔNG CỘNG', colWidths.tongCong, 'center', true, 0, 'center', 'F2F2F2') +
    `</w:tr>`;

  // Data Rows
  const xmlDataRows = dataRows.map(r => {
    const qtyVal = cleanVal(r.quantity);
    const priceVal = cleanVal(r.price);
    const thoiGianVal = cleanVal(r.thoiGianThue);
    const totalVal = cleanVal(r.total);
    const vat8Val = cleanVal(r.vat8);
    const tongCongVal = cleanVal(r.tongCong);

    return `<w:tr><w:trPr><w:trHeight w:val="400"/></w:trPr>` +
      makeCell(r.stt, colWidths.stt, 'center') +
      makeCell(r.description, colWidths.noiDung, 'left') +
      makeCell(cleanVal(r.unit), colWidths.dvt, 'center') +
      makeCell(qtyVal, colWidths.khoiLuong, 'right') +
      makeCell(priceVal, colWidths.donGia, 'right') +
      makeCell(thoiGianVal, colWidths.thoiGian, 'right') +
      makeCell(totalVal, colWidths.thanhTien, 'right') +
      makeCell(vat8Val, colWidths.vat8, 'right') +
      makeCell(tongCongVal, colWidths.tongCong, 'right') +
      `</w:tr>`;
  }).join('');

  // Summary Row calculations
  const totalHang = dataRows.reduce((sum, r) => sum + parseMoney(r.total), 0);
  const totalVat = dataRows.reduce((sum, r) => sum + parseMoney(r.vat8), 0);
  const totalThanhToan = dataRows.reduce((sum, r) => sum + parseMoney(r.tongCong), 0);

  const spanWidth = 500 + 2500 + 600 + 900 + 1300 + 1188; // = 6988

  const summaryRowXml = `<w:tr><w:trPr><w:trHeight w:val="450"/></w:trPr>` +
    // Label cell spanning 6 columns
    `<w:tc>
      <w:tcPr>
        <w:gridSpan w:val="6"/>
        <w:tcW w:w="${spanWidth}" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
      </w:tcPr>
      <w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="60"/></w:pPr>
        <w:r><w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/><w:bCs/>
          <w:sz w:val="26"/><w:szCs w:val="26"/>
        </w:rPr>
        <w:t xml:space="preserve">Tổng cộng</w:t>
      </w:r></w:p>
    </w:tc>` +
    // Thành tiền cell
    makeCell(formatCurrency(totalHang), colWidths.thanhTien, 'right', true, 0, '', 'F2F2F2') +
    // VAT 8% cell
    makeCell(totalVat > 0 ? formatCurrency(totalVat) : '', colWidths.vat8, 'right', true, 0, '', 'F2F2F2') +
    // Tổng cộng cell
    makeCell(formatCurrency(totalThanhToan), colWidths.tongCong, 'right', true, 0, '', 'F2F2F2') +
    `</w:tr>`;

  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="10488" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid>
      ${columns.map(w => `<w:gridCol w:w="${w}"/>`).join('')}
    </w:tblGrid>
    ${headerRow}
    ${xmlDataRows}
    ${summaryRowXml}
  </w:tbl>`;
};

const generateNguyenTacTable = (rows: TableRow[]): string => {
  const dataRows = rows.filter(r => !r.isSummary);

  const colWidths = {
    stt: '500',
    noiDung: '2588',
    dvt: '700',
    khoiLuong: '900',
    donGia: '1400',
    thanhTien: '1500',
    vat8: '900',
    vat10: '900',
    tongCong: '1100'
  };

  const columns = [
    colWidths.stt,
    colWidths.noiDung,
    colWidths.dvt,
    colWidths.khoiLuong,
    colWidths.donGia,
    colWidths.thanhTien,
    colWidths.vat8,
    colWidths.vat10,
    colWidths.tongCong
  ];

  // Header Row
  const headerRow = `<w:tr><w:trPr><w:trHeight w:val="450"/><w:tblHeader/></w:trPr>` +
    makeCell('STT', colWidths.stt, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('Nội dung', colWidths.noiDung, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('ĐVT', colWidths.dvt, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('Khối lượng', colWidths.khoiLuong, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('Đơn giá (VNĐ)', colWidths.donGia, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('Thành tiền', colWidths.thanhTien, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('VAT 8%', colWidths.vat8, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('VAT 10%', colWidths.vat10, 'center', true, 0, 'center', 'F2F2F2') +
    makeCell('Tổng cộng', colWidths.tongCong, 'center', true, 0, 'center', 'F2F2F2') +
    `</w:tr>`;

  // Data Rows
  const xmlDataRows = dataRows.map(r => {
    const qtyVal = cleanVal(r.quantity);
    const priceVal = cleanVal(r.price);
    const totalVal = cleanVal(r.total);
    const vat8Val = cleanVal(r.vat8);
    const vat10Val = cleanVal(r.vat10);
    const tongCongVal = cleanVal(r.tongCong);

    return `<w:tr><w:trPr><w:trHeight w:val="400"/></w:trPr>` +
      makeCell(r.stt, colWidths.stt, 'center') +
      makeCell(r.description, colWidths.noiDung, 'left') +
      makeCell(cleanVal(r.unit), colWidths.dvt, 'center') +
      makeCell(qtyVal, colWidths.khoiLuong, 'right') +
      makeCell(priceVal, colWidths.donGia, 'right') +
      makeCell(totalVal, colWidths.thanhTien, 'right') +
      makeCell(vat8Val ? vat8Val : '-', colWidths.vat8, 'right') +
      makeCell(vat10Val ? vat10Val : '-', colWidths.vat10, 'right') +
      makeCell(tongCongVal, colWidths.tongCong, 'right') +
      `</w:tr>`;
  }).join('');

  // Summary Row calculations
  const totalHang = dataRows.reduce((sum, r) => sum + parseMoney(r.total), 0);
  const totalVat8 = dataRows.reduce((sum, r) => sum + parseMoney(r.vat8), 0);
  const totalVat10 = dataRows.reduce((sum, r) => sum + parseMoney(r.vat10), 0);
  const totalThanhToan = dataRows.reduce((sum, r) => sum + parseMoney(r.tongCong), 0);

  const spanWidth = 500 + 2588 + 700 + 900 + 1400; // = 6088

  const summaryRowXml = `<w:tr><w:trPr><w:trHeight w:val="450"/></w:trPr>` +
    // Label cell spanning 5 columns
    `<w:tc>
      <w:tcPr>
        <w:gridSpan w:val="5"/>
        <w:tcW w:w="${spanWidth}" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
      </w:tcPr>
      <w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="60"/></w:pPr>
        <w:r><w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/><w:bCs/>
          <w:sz w:val="26"/><w:szCs w:val="26"/>
        </w:rPr>
        <w:t xml:space="preserve">Tổng cộng</w:t>
      </w:r></w:p>
    </w:tc>` +
    // Thành tiền cell
    makeCell(formatCurrency(totalHang), colWidths.thanhTien, 'right', true, 0, '', 'F2F2F2') +
    // VAT 8% cell
    makeCell(totalVat8 > 0 ? formatCurrency(totalVat8) : '-', colWidths.vat8, 'right', true, 0, '', 'F2F2F2') +
    // VAT 10% cell
    makeCell(totalVat10 > 0 ? formatCurrency(totalVat10) : '-', colWidths.vat10, 'right', true, 0, '', 'F2F2F2') +
    // Tổng cộng cell
    makeCell(formatCurrency(totalThanhToan), colWidths.tongCong, 'right', true, 0, '', 'F2F2F2') +
    `</w:tr>`;

  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="10488" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid>
      ${columns.map(w => `<w:gridCol w:w="${w}"/>`).join('')}
    </w:tblGrid>
    ${headerRow}
    ${xmlDataRows}
    ${summaryRowXml}
  </w:tbl>`;
};

const generateContractDocxTable = (md: string, contractType?: string): string => {
  if (!md || !md.trim()) return '';

  const rows = parseMarkdownToRows(md, contractType);
  if (rows.length === 0) return '';

  return contractType === 'HDCM'
    ? generateCaMayTable(rows)
    : generateNguyenTacTable(rows);
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const fetchTemplateBuffer = async (templateId: string): Promise<ArrayBuffer> => {
  const CONTRACT_TEMPLATES = [
    { id: 'HDNT', name: 'Hợp đồng Nguyên Tắc', file: 'Template_HDNT.docx', folder: 'templatesHopDong' },
    { id: 'HDTC', name: 'Hợp đồng Thi Công', file: 'Template_HDTC.docx', folder: 'templatesHopDong' },
    { id: 'HDCM', name: 'Hợp đồng Ca Máy', file: 'Template_HDCM.docx', folder: 'templatesHopDong' },
    { id: 'GDNTT', name: 'Giấy đề nghị thanh toán / tạm ứng', file: 'Template GDN TT.docx', folder: 'templates_muc_phu' }
  ];
  const template = CONTRACT_TEMPLATES.find(t => t.id === templateId);
  if (!template) throw new Error('Không tìm thấy template: ' + templateId);
  let basePath = (import.meta as any).env?.BASE_URL || './';
  if (basePath === './') {
    const pathSegments = window.location.pathname.split('/');
    basePath = pathSegments.slice(0, -1).join('/') + '/';
  }
  if (!basePath.endsWith('/')) basePath += '/';
  const folderName = template.folder || 'templatesHopDong';
  const finalPath = `${basePath}${folderName}/${template.file}`.replace(/\/+/g, '/');
  const response = await fetch(finalPath);
  if (!response.ok) throw new Error('Không thể tải template: ' + finalPath);
  return await response.arrayBuffer();
};

const buildSplitTagPattern = (tag: string): string => {
  return tag
    .split('')
    .map(char => {
      const escaped = char.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return `${escaped}(?:<[^>]+>)*`;
    })
    .join('');
};

const generateDocxBlobForContract = async (
  templateId: string,
  formData: Record<string, string>,
  buffer: ArrayBuffer
): Promise<Blob> => {
  const dataToRender: Record<string, string> = {};
  const tableXmlMap: Record<string, string> = {};

  Object.keys(formData).forEach(tag => {
    const upper = tag.toUpperCase();
    const isTableTag = (upper.includes('BANG') || upper.includes('TABLE')) &&
      !upper.includes('BANG_CHU') && !upper.includes('BANGCHU');

    if (isTableTag) {
      dataToRender[tag] = `__BANG_TABLE_PLACEHOLDER_FOR_${tag}__`;
      const rawValue = formData[tag] || '';
      if (upper === 'BANG_GDN') {
        let gdnRows: GdnRow[] = [];
        try {
          gdnRows = rawValue ? JSON.parse(rawValue) : [];
        } catch (e) {
          gdnRows = [];
        }
        tableXmlMap[tag] = generateGdnDocxTable(gdnRows);
      } else {
        if (rawValue) {
          tableXmlMap[tag] = generateContractDocxTable(rawValue, templateId);
        } else {
          tableXmlMap[tag] = '';
        }
      }
    } else {
      const isTableField = upper.includes('NOI_DUNG') ||
        upper.includes('DVT') ||
        upper.includes('SOLUONG') ||
        upper.includes('SL') ||
        upper.includes('DON_GIA') ||
        upper.includes('DONGIA') ||
        upper.includes('THANHTIEN') ||
        upper.includes('THANH_TIEN');

      dataToRender[tag] = formData[tag] || (isTableField ? "" : "....................");
    }
  });

  const getFormVal = (key: string): string => {
    const foundKey = Object.keys(formData).find(k => k.toUpperCase() === key.toUpperCase());
    return foundKey ? formData[foundKey] : '';
  };

  const tamUng = getFormVal('TAMUNG-THANHTOAN') || getFormVal('TAMUNG_THANHTOAN') || (templateId === 'GDNTT' ? 'tạm ứng' : '');
  const benDuoc = getFormVal('BEN_DUOC_DE_NGHI') || getFormVal('BENDUOCDENGHI') || '';
  const benDeNghi = getFormVal('BEN_DE_NGHI') || getFormVal('BENDENGHI') || '';

  dataToRender['TAMUNG-THANHTOAN_TITLE'] = (templateId === 'GDNTT' ? tamUng.toUpperCase() : toVietnameseTitleCase(tamUng)) || "....................";
  dataToRender['TAMUNG-THANHTOAN'] = tamUng || "....................";
  dataToRender['BEN_DUOC_DE_NGHI_TITLE'] = (templateId === 'GDNTT' ? benDuoc.toUpperCase() : toVietnameseTitleCase(benDuoc)) || "....................";
  dataToRender['BEN_DUOC_DE_NGHI'] = (templateId === 'GDNTT' ? toVietnameseTitleCase(benDuoc) : benDuoc) || "....................";
  dataToRender['BEN_DE_NGHI_TITLE'] = toVietnameseTitleCase(benDeNghi) || "....................";
  dataToRender['BEN_DE_NGHI'] = (templateId === 'GDNTT' ? toVietnameseTitleCase(benDeNghi) : benDeNghi) || "....................";

  // Combine GDNTT date fields for Word templates that have a single [NGAY_GDN] tag
  const dayGdn = getFormVal('DAY_GDN') || '';
  const monthGdn = getFormVal('MONTH_GDN') || '';
  const yearGdn = getFormVal('YEAR_GDN') || '';
  if (dayGdn || monthGdn || yearGdn) {
    dataToRender['NGAY_GDN'] = `ngày ${dayGdn || '....'} tháng ${monthGdn || '....'} năm ${yearGdn || '....'}`;
  } else {
    dataToRender['NGAY_GDN'] = getFormVal('NGAY_GDN') || "ngày .... tháng .... năm ....";
  }

  // Step 1: Read raw XML from template before initializing Docxtemplater
  const zip = new PizZip(buffer);
  let rawXml = zip.file("word/document.xml")?.asText() || "";

  // Expand multiline tags into separate styled XML paragraphs for HDNT, HDTC, and HDCM templates
  if (templateId === 'HDNT' || templateId === 'HDTC' || templateId === 'HDCM') {
    const generateRandomHexId = () => {
      return Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0').toUpperCase();
    };

    const tagsToProcess = ['dieu4_content', 'dieu5_content', 'dieu6_a_content', 'dieu6_b_content'];
    tagsToProcess.forEach(tag => {
      const tagPlaceholder = `[${tag}]`;
      const idx = rawXml.indexOf(tagPlaceholder);
      if (idx === -1) return;
      
      let pStart = -1;
      for (let i = idx; i >= 0; i--) {
        if (rawXml.slice(i, i + 4) === '<w:p') {
          const nextChar = rawXml.charAt(i + 4);
          if (nextChar === '>' || nextChar === ' ' || nextChar === '/') {
            pStart = i;
            break;
          }
        }
      }
      const pEnd = rawXml.indexOf("</w:p>", idx) + 6;
      if (pStart === -1 || pEnd === -1) return;
      
      const originalParagraphXml = rawXml.substring(pStart, pEnd);
      const val = formData[tag] || '';
      
      // Split by newline and filter out empty lines
      const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) {
        const emptyParagraph = originalParagraphXml.replace(tagPlaceholder, '');
        rawXml = rawXml.replace(originalParagraphXml, emptyParagraph);
        return;
      }
      
      const paragraphXmls = lines.map(line => {
        const escapedLine = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        let pXml = originalParagraphXml.replace(tagPlaceholder, escapedLine);
        
        // Generate unique paraId and textId for each paragraph to comply with OpenXML standards
        const newParaId = generateRandomHexId();
        const newTextId = generateRandomHexId();
        
        // Remove existing IDs if they exist to prevent duplicates, then inject new ones
        pXml = pXml.replace(/w14:paraId="[^"]*"/g, '');
        pXml = pXml.replace(/w14:textId="[^"]*"/g, '');
        pXml = pXml.replace("<w:p", `<w:p w14:paraId="${newParaId}" w14:textId="${newTextId}"`);
        
        return pXml;
      });
      
      rawXml = rawXml.replace(originalParagraphXml, paragraphXmls.join(''));
    });
  }

  // Step 2: Replace table variables directly on raw XML using split-proof regex
  const sortedTags = Object.keys(tableXmlMap).sort((a, b) => b.length - a.length);
  for (const tag of sortedTags) {
    const tableXml = tableXmlMap[tag];
    const pattern = buildSplitTagPattern(tag);
    // Find <w:p> containing tag (even if split by Word XML tags)
    const regex = new RegExp(`<w:p\\b[^>]*>(?:(?!<\\/w:p>)[\\s\\S])*?${pattern}(?:(?!<\\/w:p>)[\\s\\S])*?<\\/w:p>`, 'g');
    rawXml = rawXml.replace(regex, tableXml ? tableXml + '<w:p/>' : '<w:p/>');
  }
  zip.file("word/document.xml", rawXml);

  // Step 3: Only after that, initialize Docxtemplater to process the remaining text variables
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "[", end: "]" }
  });

  const textOnlyVariables = { ...dataToRender };
  Object.keys(tableXmlMap).forEach(tag => {
    delete textOnlyVariables[tag];
  });

  doc.render(textOnlyVariables);

  // Step 4: Simple validation after render
  const finalXml = doc.getZip().file("word/document.xml")?.asText() || "";
  if (/<w:p\b[^>]*><w:tbl/.test(finalXml)) {
    throw new Error("LỖI: Bảng vẫn lồng trong paragraph — pipeline sai thứ tự");
  }

  const zipData = doc.getZip().generate({ type: 'uint8array', compression: 'DEFLATE' });
  return new Blob([zipData as any], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
};

const ContractView = ({
  partners,
  user,
  contractForm,
  updateContractForm,
  onContractSaved,
  setIsInvoiceSelectorOpen,
  setActiveInvoiceTag,
  handleFieldChange
}: {
  partners: Partner[],
  user: User | null,
  contractForm: {
    selectedTemplate: string;
    tags: string[];
    templateFormData: Record<string, Record<string, string>>;
    selectedPartyAId: string;
    selectedPartyBId: string;
    templateBuffer: ArrayBuffer | null;
    vtLinks: Record<string, 'A' | 'B' | null>;
  },
  updateContractForm: (updates: any) => void,
  onContractSaved: (contractData: Omit<SmartContract, 'id' | 'ownerId' | 'createdAt'>) => Promise<void>,
  setIsInvoiceSelectorOpen?: (open: boolean) => void,
  setActiveInvoiceTag?: (tag: string | null) => void,
  handleFieldChange: (tag: string, val: string) => void
}) => {
  const { toast } = useToast();
  const dayRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const monthRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const yearRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { selectedTemplate, tags, templateFormData, selectedPartyAId, selectedPartyBId, templateBuffer, vtLinks } = contractForm;

  // Use data for current template
  const formData = useMemo(() => templateFormData[selectedTemplate] || {}, [templateFormData, selectedTemplate]);

  const setSelectedTemplate = (val: any) => updateContractForm((prev: any) => ({ selectedTemplate: typeof val === 'function' ? val(prev.selectedTemplate) : val }));
  const setTags = (val: any) => updateContractForm((prev: any) => ({ tags: typeof val === 'function' ? val(prev.tags) : val }));

  const setFormData = (val: any) => {
    updateContractForm((prev: any) => {
      const templateId = prev.selectedTemplate;
      if (!templateId) return prev;
      const oldData = prev.templateFormData[templateId] || {};
      const newData = typeof val === 'function' ? val(oldData) : val;
      return {
        ...prev,
        templateFormData: {
          ...prev.templateFormData,
          [templateId]: newData
        }
      };
    });
  };
  const setSelectedPartyAId = (val: any) => updateContractForm((prev: any) => ({ selectedPartyAId: typeof val === 'function' ? val(prev.selectedPartyAId) : val }));
  const setSelectedPartyBId = (val: any) => updateContractForm((prev: any) => ({ selectedPartyBId: typeof val === 'function' ? val(prev.selectedPartyBId) : val }));
  const setTemplateBuffer = (val: any) => updateContractForm((prev: any) => ({ templateBuffer: typeof val === 'function' ? val(prev.templateBuffer) : val }));
  const setVtLinks = (val: any) => updateContractForm((prev: any) => ({ vtLinks: typeof val === 'function' ? val(prev.vtLinks) : val }));



  // Renders the interactive table in the A4 Giấy đề nghị thanh toán / tạm ứng (GDNTT)
  const renderGdnTable = () => {
    const rawValue = formData['BANG_GDN'] || '';
    let rows: GdnRow[] = [];
    try {
      rows = rawValue ? JSON.parse(rawValue) : [{ stt: '1', noidung: '', donvi: 'Đồng', giatri: '' }];
    } catch (e) {
      rows = [{ stt: '1', noidung: '', donvi: 'Đồng', giatri: '' }];
    }

    const updateRows = (newRows: GdnRow[]) => {
      handleFieldChange('BANG_GDN', JSON.stringify(newRows));
      const totalVal = newRows.reduce((acc, r) => acc + (parseInt(r.giatri.replace(/\D/g, ''), 10) || 0), 0);
      const words = totalVal > 0 ? numberToVietnameseWords(totalVal) : '';
      handleFieldChange('SOTIENBANGCHU', words);
    };

    const handleCellChange = (index: number, field: keyof GdnRow, val: string) => {
      const next = [...rows];
      next[index] = { ...next[index], [field]: val };
      updateRows(next);
    };

    const addRow = () => {
      const nextStt = (rows.length + 1).toString();
      const next = [...rows, { stt: nextStt, noidung: '', donvi: 'Đồng', giatri: '' }];
      updateRows(next);
    };

    const removeRow = (index: number) => {
      if (rows.length === 1) {
        updateRows([{ stt: '1', noidung: '', donvi: 'Đồng', giatri: '' }]);
        return;
      }
      const filtered = rows.filter((_, i) => i !== index);
      const reindexed = filtered.map((r, i) => ({ ...r, stt: (i + 1).toString() }));
      updateRows(reindexed);
    };

    const totalValue = rows.reduce((acc, r) => acc + (parseInt(r.giatri.replace(/\D/g, ''), 10) || 0), 0);

    return (
      <div className="my-4 space-y-2 select-text font-sans">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">
            Bảng kê chi tiết chi phí:
          </span>
          <button
            type="button"
            onClick={addRow}
            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 text-[10px] font-black uppercase tracking-wider rounded transition-all active:scale-95 flex items-center gap-1"
          >
            <PlusSquare className="size-3" /> Thêm dòng
          </button>
        </div>

        <div className="overflow-x-auto rounded border border-stone-300 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 text-[10px] font-bold uppercase tracking-wider text-stone-600 border-b border-stone-300">
                <th className="py-2 px-3 text-center w-12 border-r border-stone-300">STT</th>
                <th className="py-2 px-3 border-r border-stone-300">Nội dung đề nghị</th>
                <th className="py-2 px-3 w-24 text-center border-r border-stone-300">Đơn vị</th>
                <th className="py-2 px-3 w-40 text-right border-r border-stone-300">Số tiền</th>
                <th className="py-2 px-3 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-900 bg-white">
              {rows.map((row, index) => (
                <tr key={index} className="hover:bg-stone-50/50 transition-colors">
                  <td className="py-2 px-3 text-center font-bold text-stone-500 border-r border-stone-200">{row.stt}</td>
                  <td className="py-1 px-2 border-r border-stone-200">
                    <input
                      type="text"
                      value={row.noidung}
                      onChange={(e) => handleCellChange(index, 'noidung', e.target.value)}
                      placeholder="Nhập nội dung..."
                      className="w-full bg-transparent hover:bg-stone-50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded px-2 py-1 text-xs text-stone-900 outline-none transition-all"
                    />
                  </td>
                  <td className="py-1 px-2 border-r border-stone-200">
                    <input
                      type="text"
                      value={row.donvi}
                      onChange={(e) => handleCellChange(index, 'donvi', e.target.value)}
                      className="w-full text-center bg-transparent hover:bg-stone-50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded px-2 py-1 text-xs text-stone-900 outline-none transition-all"
                    />
                  </td>
                  <td className="py-1 px-2 border-r border-stone-200">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={row.giatri ? parseInt(row.giatri.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : ''}
                        onChange={(e) => {
                          const rawVal = e.target.value.replace(/\D/g, '');
                          handleCellChange(index, 'giatri', rawVal);
                        }}
                        placeholder="0"
                        className="w-full text-right bg-transparent hover:bg-stone-50 focus:bg-stone-50 border border-transparent focus:border-stone-400 rounded pr-6 pl-2 py-1 text-xs text-stone-900 font-bold outline-none transition-all"
                      />
                      <span className="absolute right-2 text-[10px] text-stone-500 font-bold">đ</span>
                    </div>
                  </td>
                  <td className="py-1 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-all active:scale-90"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-stone-50 font-bold border-t border-stone-300">
                <td colSpan={2} className="py-2.5 px-3 uppercase text-[10px] tracking-wide text-stone-600 text-left border-r border-stone-200">
                  TỔNG SỐ TIỀN ĐỀ NGHỊ
                </td>
                <td className="py-2.5 px-3 text-center text-[10px] text-stone-500 border-r border-stone-200">Đồng</td>
                <td className="py-2.5 px-3 text-right text-stone-900 font-bold text-xs border-r border-stone-200">
                  {totalValue.toLocaleString('vi-VN')} đ
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // GDNTT Document A4 Layout
  const renderGdnDocument = () => {
    return (
      <div className="space-y-6 text-stone-900 leading-relaxed text-[13px]">
        <div className="flex justify-between items-start">
          <div className="flex flex-col text-left">
            <InlineField tag="TEN_CTY_VIET_TAT" placeholder="[TÊN CÔNG TY VIẾT TẮT]" width="200px" />
            <div className="text-xs text-stone-600 mt-1 pl-1">
              Số: <InlineField tag="SO_GDN" placeholder="..........." width="100px" />
            </div>
            <div className="text-xs italic pl-1 mt-1 text-stone-500 flex items-center gap-1">
              <span>(V/v: Đề nghị</span>
              <select
                value={formData['TAMUNG-THANHTOAN'] || 'tạm ứng'}
                onChange={(e) => {
                  const val = e.target.value;
                  handleFieldChange('TAMUNG-THANHTOAN', val);
                  handleFieldChange('TAMUNG-THANHTOAN_TITLE', val.toUpperCase());
                }}
                className="bg-stone-50/80 border-b-[1.5px] border-dashed border-stone-400 hover:border-primary focus:border-primary text-stone-900 font-bold focus:outline-none focus:ring-0 px-2 py-0.5 text-center transition-all inline-block font-sans text-[14px] cursor-pointer rounded-t-md hover:bg-stone-100/50"
                style={{ width: '130px', appearance: 'none', WebkitAppearance: 'none' }}
              >
                <option value="tạm ứng">tạm ứng</option>
                <option value="thanh toán">thanh toán</option>
              </select>
              <span>)</span>
            </div>
          </div>
          <div className="text-center font-bold">
            <div className="uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div className="text-xs tracking-wider mt-0.5">Độc lập – Tự do – Hạnh phúc</div>
            <div className="text-[10px] text-stone-400 font-sans mt-0.5 font-normal">-------------------------</div>
          </div>
        </div>

        <div className="text-right italic mt-4 flex items-center justify-end gap-1.5 font-serif text-[13px]">
          <span>TP. Hồ Chí Minh, ngày</span>
          <InlineField tag="DAY_GDN" placeholder="ngày" width="40px" maxLength={2} isNumeric />
          <span>tháng</span>
          <InlineField tag="MONTH_GDN" placeholder="tháng" width="40px" maxLength={2} isNumeric />
          <span>năm</span>
          <InlineField tag="YEAR_GDN" placeholder="năm" width="60px" maxLength={4} isNumeric />
        </div>

        <div className="text-center mt-6">
          <h1 className="text-lg font-bold uppercase tracking-wide">
            GIẤY ĐỀ NGHỊ{' '}
            <span className="border-b-[1.5px] border-dashed border-stone-400 px-2 py-0.5 font-bold text-stone-900 text-[18px] inline-block min-w-[200px] text-center bg-stone-50/30 rounded-t-md">
              {(formData['TAMUNG-THANHTOAN'] || 'tạm ứng').toUpperCase()}
            </span>
          </h1>
        </div>

        <div className="pl-1 mt-4 font-bold">
          Kính gửi: <InlineField tag="BEN_DUOC_DE_NGHI_TITLE" placeholder="Ban Giám đốc Công ty ..." width="380px" />
        </div>

        <div className="space-y-3 mt-4 text-left">
          <p>
            - Căn cứ Hợp đồng số: <InlineField tag="SO_HOPDONG" placeholder="[Số hợp đồng]" width="140px" /> được ký vào ngày <InlineField tag="NGAY_KY_HOP_DONG" placeholder="[Ngày ký hợp đồng]" width="140px" /> về việc <InlineField tag="NOI_DUNG_HOP_DONG" placeholder="[Nội dung hợp đồng]" width="280px" /> giữa <InlineField tag="BEN_DUOC_DE_NGHI" placeholder="[Bên được đề nghị]" width="180px" /> và <InlineField tag="BEN_DE_NGHI" placeholder="[Bên đề nghị]" width="180px" />.
          </p>
          <p>
            Hôm nay, <InlineField tag="BEN_DE_NGHI" placeholder="[Bên đề nghị]" width="180px" /> kính đề nghị <InlineField tag="BEN_DUOC_DE_NGHI" placeholder="[Bên được đề nghị]" width="180px" />{' '}
            <span className="border-b-[1.5px] border-dashed border-stone-400 px-2 py-0.5 font-bold text-stone-900 text-[14px] inline-block min-w-[120px] text-center bg-stone-50/30 rounded-t-md">
              {(formData['TAMUNG-THANHTOAN'] || 'tạm ứng').toLowerCase()}
            </span>{' '}
            giá trị với nội dung cụ thể như sau:
          </p>

          {renderGdnTable()}

          <p className="mt-2 font-bold">
            (Bằng chữ:{' '}
            <span className="border-b-[1.5px] border-dashed border-stone-400 px-2 py-0.5 font-bold text-stone-900 text-[13px] inline-block min-w-[320px] bg-stone-50/30 rounded-t-md">
              {formData['SOTIENBANGCHU'] || '................................'}
            </span>
            )
          </p>

          <p className="mt-2">
            Số tiền đề nghị{' '}
            <span className="border-b-[1.5px] border-dashed border-stone-400 px-2 py-0.5 font-bold text-stone-900 text-[14px] inline-block min-w-[120px] text-center bg-stone-50/30 rounded-t-md">
              {(formData['TAMUNG-THANHTOAN'] || 'tạm ứng').toLowerCase()}
            </span>{' '}
            sẽ được chuyển khoản vào tài khoản của <InlineField tag="BEN_DE_NGHI" placeholder="[Bên đề nghị]" width="180px" />, số tài khoản: <InlineField tag="STK_BEN_DE_NGHI" placeholder="[Số tài khoản]" width="150px" /> tại <InlineField tag="NGAN_HANG_BEN_DE_NGHI" placeholder="[Ngân hàng]" width="200px" />.
          </p>

          <p>
            Rất mong được <InlineField tag="BEN_DUOC_DE_NGHI" placeholder="[Bên được đề nghị]" width="180px" /> xem xét, chấp thuận và thực hiện{' '}
            <span className="border-b-[1.5px] border-dashed border-stone-400 px-2 py-0.5 font-bold text-stone-900 text-[14px] inline-block min-w-[120px] text-center bg-stone-50/30 rounded-t-md">
              {(formData['TAMUNG-THANHTOAN'] || 'tạm ứng').toLowerCase()}
            </span>{' '}
            để tạo điều kiện hỗ trợ chi phí cho Công ty.
          </p>

          <p className="italic mt-1">Xin chân thành cảm ơn !</p>
        </div>

        <div className="flex justify-between items-start mt-8 pt-6 border-t border-stone-200">
          <div className="flex flex-col text-xs text-stone-500 select-none">
            <span className="font-bold">Nơi nhận:</span>
            <span>- Như kính gửi;</span>
            <span>- Lưu PKT.KT.</span>
          </div>
          <div className="text-center w-60 flex flex-col items-center">
            <div className="font-bold uppercase"><InlineField tag="BEN_DE_NGHI_TITLE" placeholder="[Đại diện bên đề nghị]" width="180px" /></div>
            <div className="text-xs text-stone-500 italic mt-0.5">Giám đốc</div>
            <div className="h-16" />
            <div className="font-bold mt-2"><InlineField tag="DAI_DIEN_BEN_DE_NGHI" placeholder="[Họ tên người ký]" width="180px" /></div>
          </div>
        </div>
      </div>
    );
  };

  // HDNT Document A4 Layout
  const renderHDNTDocument = () => {
    return (
      <div className="space-y-6 text-stone-900 leading-relaxed text-[13px] text-left">
        <div className="flex justify-between items-start">
          <div className="flex flex-col text-left">
            <InlineField tag="TEN_CTY_VIET_TAT" placeholder="[TÊN CÔNG TY VIẾT TẮT]" width="200px" />
            <div className="text-xs text-stone-600 mt-1 pl-1">
              Số: <InlineField tag="SO_HOPDONG" placeholder="..........." width="140px" />
            </div>
          </div>
          <div className="text-center font-bold">
            <div className="uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div className="text-xs tracking-wider mt-0.5">Độc lập – Tự do – Hạnh phúc</div>
            <div className="text-[10px] text-stone-400 font-sans mt-0.5 font-normal">------o0o------</div>
          </div>
        </div>

        <div className="text-center mt-6">
          <h1 className="text-lg font-bold uppercase tracking-wide">HỢP ĐỒNG NGUYÊN TẮC</h1>
        </div>

        <div className="space-y-1 text-xs italic pl-4 border-l-2 border-stone-200 text-stone-600">
          <p>- Căn cứ Luật thương mại và luật dân sự hiện hành.</p>
          <p>- Căn cứ nhu cầu và khả năng của hai bên.</p>
        </div>

        <p className="mt-4">
          Hôm nay, ngày <InlineField tag="DAY_HOPDONG" placeholder="ngày" width="45px" maxLength={2} isNumeric /> tháng <InlineField tag="MONTH_HOPDONG" placeholder="tháng" width="45px" maxLength={2} isNumeric /> năm <InlineField tag="YEAR_HOPDONG" placeholder="năm" width="65px" maxLength={4} isNumeric />, tại văn phòng <InlineField tag="BEN_A" placeholder="[Địa điểm/Văn phòng Bên A]" width="280px" />, chúng tôi gồm có:
        </p>

        <div className="space-y-1.5 mt-3">
          <div className="font-bold uppercase">BÊN MUA (Gọi tắt là Bên A): <InlineField tag="BEN_A" placeholder="[Tên công ty Bên A]" width="380px" /></div>
          <div className="pl-4 space-y-1">
            <div>- Đại diện: <InlineField tag="GIOITINHBENA" placeholder="Ông/Bà" width="60px" /> <InlineField tag="DAIDIENBENA" placeholder="[Họ tên đại diện]" width="180px" /></div>
            <div>- Chức vụ: <InlineField tag="CHUCVUBENA" placeholder="[Chức vụ]" width="140px" /></div>
            <div>- Địa chỉ: <InlineField tag="DIACHIBENA" placeholder="[Địa chỉ công ty]" width="480px" /></div>
            <div>- Mã số thuế: <InlineField tag="MSTBENA" placeholder="[Mã số thuế]" width="140px" /></div>
            <div>- Tài khoản số: <InlineField tag="STKBENA" placeholder="[Số tài khoản]" width="140px" /> tại ngân hàng: <InlineField tag="NGANHANGBENA" placeholder="[Ngân hàng]" width="200px" /></div>
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold uppercase">BÊN BÁN (Gọi tắt là Bên B): <InlineField tag="BEN_B" placeholder="[Tên công ty Bên B]" width="380px" /></div>
          <div className="pl-4 space-y-1">
            <div>- Đại diện: <InlineField tag="GIOITINHBENB" placeholder="Ông/Bà" width="60px" /> <InlineField tag="DAIDIENBENB" placeholder="[Họ tên đại diện]" width="180px" /></div>
            <div>- Chức vụ: <InlineField tag="CHUCVUBENB" placeholder="[Chức vụ]" width="140px" /></div>
            <div>- Địa chỉ: <InlineField tag="DIACHIBENB" placeholder="[Địa chỉ công ty]" width="480px" /></div>
            <div>- Mã số thuế: <InlineField tag="MSTBENB" placeholder="[Mã số thuế]" width="140px" /></div>
            <div>- Tài khoản số: <InlineField tag="STKBENB" placeholder="[Số tài khoản]" width="140px" /> tại ngân hàng: <InlineField tag="NGANHANGBENB" placeholder="[Ngân hàng]" width="200px" /></div>
          </div>
        </div>

        <p className="mt-4 font-bold italic">
          Hai bên cùng nhau bàn bạc, thỏa thuận thống nhất ký kết Hợp đồng nguyên tắc với các điều khoản như sau:
        </p>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold">Điều 1: Nội dung hợp đồng</div>
          <p className="pl-4">
            Bên A cung cấp vật tư xây dựng cho bên B phục vụ cho các công trình như sau:
          </p>
          <div className="pl-4">
            <InlineTextArea tag="BANGGIATRIHOPDONG" placeholder="Nhập bảng vật tư, số lượng, chủng loại..." />
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold">Điều 2: Giá trị hợp đồng</div>
          <div className="pl-4 space-y-1">
            <p>
              - Tổng giá trị hợp đồng là: <InlineField tag="GIATRIHOPDONG" placeholder="[Giá trị hợp đồng]" width="160px" /> đ (đã bao gồm thuế GTGT).
            </p>
            <p>
              - Bằng chữ: <InlineField tag="BANGCHUGIATRI" placeholder="[Bằng chữ]" width="420px" />.
            </p>
            <p>- Giá trị trên là giá trị tạm tính. Giá trị thực tế tại công trường là giá trị thanh quyết toán.</p>
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold">Điều 3: Thời gian thực hiện hợp đồng</div>
          <p className="pl-4">- Thời gian thực hiện: kể từ ký hợp đồng.</p>
        </div>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold">Điều 4: Phương thức nghiệm thu khối lượng</div>
          <p className="pl-4" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {formData['dieu4_content'] || 'Căn cứ vào khối lượng bàn giao vật tư thực tế tại công trình, Bên A và Bên B đo đạc, lập Biên bản xác nhận khối lượng vật tư để làm cơ sở thanh toán.'}
          </p>
        </div>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold">Điều 5: Phương thức thanh toán</div>
          <p className="pl-4" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {formData['dieu5_content'] || 'Thanh toán bằng chuyển khoản. Căn cứ vào Biên bản xác nhận khối lượng vật tư, Bên B xuất hóa đơn cho bên A và bên A sẽ thanh toán cho bên B 100% giá trị trong vòng 240 ngày kể từ ngày hai bên đối chiếu và xác nhận công nợ.'}
          </p>
        </div>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold">Điều 6: Trách nhiệm của các bên</div>
          <div className="pl-4 space-y-2">
            <div>
              <div className="font-bold">6.1. Trách nhiệm của Bên A:</div>
              <p className="pl-4 mt-0.5" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {formData['dieu6_a_content'] || `- Kiểm tra số lượng, chủng loại, chất lượng và bốc xếp hàng hoá từ phương tiện chuyên chở vào cửa hàng;\n- Thanh toán đầy đủ theo đơn giá của bên B và đúng thời gian cho bên B;\n- Xác lập lập Biên bản xác nhận khối lượng vật tư thực tế để làm cơ sở thanh toán.\n- Thanh toán kinh phí cho bên B như Điều 5.`}
              </p>
            </div>
            <div className="mt-2">
              <div className="font-bold">6.2. Trách nhiệm của Bên B:</div>
              <p className="pl-4 mt-0.5" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {formData['dieu6_b_content'] || `- Bảo đảm cung ứng đầy đủ cho bên A theo đúng đơn giá đã công bố;\n- Vận chuyển hàng hoá bảo đảm, an toàn đến giao tận địa chỉ đã đăng ký của bên A;\n- Cùng bên B lập Biên bản xác nhận khối lượng vật tư thực tế để làm cơ sở thanh toán và thanh lý hợp đồng.\n- Xuất hóa đơn thuế GTGT cho bên A.`}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold">Điều 7: Điều khoản khác</div>
          <p className="pl-4">
            Hai bên cam kết thực hiện đúng các điều khoản đã thống nhất trong hợp đồng. Trong quá trình thực hiện hợp đồng nếu có gì vướng mắc, phát sinh hay thay đổi, hai bên chủ động gặp nhau bàn bạc giải quyết. Trong trường hợp không giải quyết được sẽ đưa ra tòa án Kinh tế có thẩm quyền để phân xử. Quyết định của tòa án là phán quyết cuối cùng.
          </p>
          <p className="pl-4">
            Hợp đồng này có hiệu lực kể từ ngày ký và hết hiệu lực khi các bên đã thực hiện xong các điều khoản của hợp đồng. Sau khi các bên hoàn thành đầy đủ nghĩa vụ của mình theo thỏa thuận trong hợp đồng thì hợp đồng được xem như thanh lý.
          </p>
          <p className="pl-4">
            Hợp đồng được lập thành 4 bản có giá trị như nhau, Bên A giữ 02 bản, bên B giữ 02 bản và có giá trị pháp lý như nhau.
          </p>
        </div>

        <div className="flex justify-between items-start mt-8 pt-6 border-t border-stone-200 font-sans">
          <div className="text-center w-60">
            <div className="font-bold uppercase">ĐẠI DIỆN BÊN A</div>
            <div className="h-16" />
            <div className="font-bold"><InlineField tag="DAIDIENBENA" placeholder="[Họ tên đại diện A]" width="180px" /></div>
          </div>
          <div className="text-center w-60">
            <div className="font-bold uppercase">ĐẠI DIỆN BÊN B</div>
            <div className="h-16" />
            <div className="font-bold"><InlineField tag="DAIDIENBENB" placeholder="[Họ tên đại diện B]" width="180px" /></div>
          </div>
        </div>
      </div>
    );
  };

  // HDTC Document A4 Layout
  const renderHDTCDocument = () => {
    return (
      <div className="space-y-6 text-stone-900 leading-relaxed text-[13px] text-left">
        <div className="flex justify-between items-start">
          <div className="flex flex-col text-left">
            <InlineField tag="TEN_CTY_VIET_TAT" placeholder="[TÊN CÔNG TY VIẾT TẮT]" width="200px" />
            <div className="text-xs text-stone-600 mt-1 pl-1">
              Số: <InlineField tag="SO_HOPDONG" placeholder="..........." width="140px" />
            </div>
          </div>
          <div className="text-center font-bold">
            <div className="uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div className="text-xs tracking-wider mt-0.5">Độc lập – Tự do – Hạnh phúc</div>
            <div className="text-[10px] text-stone-400 font-sans mt-0.5 font-normal">------o0o------</div>
          </div>
        </div>

        <div className="text-center mt-6 space-y-1">
          <h1 className="text-lg font-bold uppercase tracking-wide">HỢP ĐỒNG THI CÔNG XÂY DỰNG</h1>
          <div className="text-xs italic space-y-1 flex flex-col items-center text-stone-600 mt-2">
            <div>Gói thầu: <InlineField tag="GOITHAU" placeholder="[Gói thầu]" width="280px" /></div>
            <div>Tên công trình: <InlineField tag="TENCONGTRINH" placeholder="[Tên công trình]" width="280px" /></div>
            <div>Địa điểm: <InlineField tag="DIADIEMCONGTRINH" placeholder="[Địa điểm công trình]" width="380px" /></div>
          </div>
        </div>

        <div className="space-y-1 text-xs italic pl-4 border-l-2 border-stone-200 text-stone-600">
          <p>- Căn cứ Luật thương mại và luật dân sự hiện hành.</p>
          <p>- Căn cứ nhu cầu và khả năng của hai bên.</p>
        </div>

        <p className="mt-4">
          Hôm nay, ngày <InlineField tag="DAY_HOPDONG" placeholder="ngày" width="45px" maxLength={2} isNumeric /> tháng <InlineField tag="MONTH_HOPDONG" placeholder="tháng" width="45px" maxLength={2} isNumeric /> năm <InlineField tag="YEAR_HOPDONG" placeholder="năm" width="65px" maxLength={4} isNumeric />, tại văn phòng <InlineField tag="BEN_A" placeholder="[Địa điểm/Văn phòng Bên A]" width="280px" />, chúng tôi gồm có:
        </p>

        <div className="space-y-1.5 mt-3">
          <div className="font-bold uppercase">BÊN GIAO THẦU (Gọi tắt là Bên A): <InlineField tag="BEN_A" placeholder="[Tên công ty Bên A]" width="380px" /></div>
          <div className="pl-4 space-y-1">
            <div>- Đại diện: <InlineField tag="GIOITINHBENA" placeholder="Ông/Bà" width="60px" /> <InlineField tag="DAIDIENBENA" placeholder="[Họ tên đại diện]" width="180px" /></div>
            <div>- Chức vụ: <InlineField tag="CHUCVUBENA" placeholder="[Chức vụ]" width="140px" /></div>
            <div>- Địa chỉ: <InlineField tag="DIACHIBENA" placeholder="[Địa chỉ công ty]" width="480px" /></div>
            <div>- Mã số thuế: <InlineField tag="MSTBENA" placeholder="[Mã số thuế]" width="140px" /></div>
            <div>- Tài khoản số: <InlineField tag="STKBENA" placeholder="[Số tài khoản]" width="140px" /> tại ngân hàng: <InlineField tag="NGANHANGBENA" placeholder="[Ngân hàng]" width="200px" /></div>
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold uppercase">BÊN NHẬN THẦU (Gọi tắt là Bên B): <InlineField tag="BEN_B" placeholder="[Tên công ty Bên B]" width="380px" /></div>
          <div className="pl-4 space-y-1">
            <div>- Đại diện: <InlineField tag="GIOITINHBENB" placeholder="Ông/Bà" width="60px" /> <InlineField tag="DAIDIENBENB" placeholder="[Họ tên đại diện]" width="180px" /></div>
            <div>- Chức vụ: <InlineField tag="CHUCVUBENB" placeholder="[Chức vụ]" width="140px" /></div>
            <div>- Địa chỉ: <InlineField tag="DIACHIBENB" placeholder="[Địa chỉ công ty]" width="480px" /></div>
            <div>- Mã số thuế: <InlineField tag="MSTBENB" placeholder="[Mã số thuế]" width="140px" /></div>
            <div>- Tài khoản số: <InlineField tag="STKBENB" placeholder="[Số tài khoản]" width="140px" /> tại ngân hàng: <InlineField tag="NGANHANGBENB" placeholder="[Ngân hàng]" width="200px" /></div>
          </div>
        </div>

        <p className="mt-4 font-bold italic">
          Hai bên cùng nhau bàn bạc, thỏa thuận thống nhất ký kết Hợp đồng thi công xây dựng công trình với các điều khoản như sau:
        </p>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold">Điều 1: Nội dung hợp đồng</div>
          <p className="pl-4">
            Bên A đồng ý giao cho bên B thi công công trình <InlineField tag="TENCONGTRINH" placeholder="[Tên công trình]" width="220px" /> tại <InlineField tag="DIADIEMCONGTRINH" placeholder="[Địa điểm công trình]" width="280px" /> theo bản vẽ thiết kế đã được chủ đầu tư chấp thuận.
          </p>
        </div>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold">Điều 2: Giá trị hợp đồng</div>
          <div className="pl-4 space-y-1">
            <div className="flex flex-wrap items-center gap-1">
              <span>- Tổng giá trị hợp đồng là:</span>
              <InlineField tag="GIATRIHOPDONG" placeholder="[Giá trị hợp đồng]" width="160px" />
              <span>đ (đã bao gồm thuế GTGT 8%).</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveInvoiceTag?.('GIATRIHOPDONG');
                  setIsInvoiceSelectorOpen?.(true);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-900 hover:bg-stone-800 border border-stone-950 text-white rounded text-[9px] font-black uppercase tracking-wider shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer ml-1"
              >
                <Layers className="size-2.5" /> Lấy từ hóa đơn
              </button>
            </div>
            <p className="mt-1">
              - Bằng chữ: <InlineField tag="BANGCHUGIATRI" placeholder="[Bằng chữ]" width="420px" />.
            </p>
            <p className="mt-1">- Giá trị trên là giá trị tạm tính. Giá trị thực tế tại công trường là giá trị thanh quyết toán.</p>
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold">Điều 3: Thời gian thực hiện hợp đồng</div>
          <p className="pl-4">- Thời gian thực hiện: kể từ ký hợp đồng.</p>
        </div>

        <div className="space-y-1.5 mt-4 text-left">
          <div className="font-bold">Điều 4: Phương thức nghiệm thu khối lượng</div>
          <p className="pl-4" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {formData['dieu4_content'] || 'Căn cứ vào khối lượng thực tế thi công tại công trình, Bên A và Bên B đo đạc, lập biên bản xác nhận khối lượng thi công hoàn thiện để làm cơ sở thanh toán.'}
          </p>
        </div>

        <div className="space-y-1.5 mt-4 text-left">
          <div className="font-bold">Điều 5: Phương thức thanh toán</div>
          <p className="pl-4" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {formData['dieu5_content'] || 'Thanh toán bằng chuyển khoản. Căn cứ vào Biên bản xác nhận khối lượng thi công, Bên B xuất hóa đơn cho bên A và bên A sẽ thanh toán cho bên B 100% giá trị trong vòng 240 ngày kể từ ngày hai bên đối chiếu và xác nhận công nợ.'}
          </p>
        </div>

        <div className="space-y-1.5 mt-4 text-left">
          <div className="font-bold">Điều 6: Trách nhiệm của các bên</div>
          <div className="pl-4 space-y-2">
            <div>
              <div className="font-bold">6.1. Trách nhiệm của Bên A:</div>
              <p className="pl-4 mt-0.5" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {formData['dieu6_a_content'] || `- Giám sát công tác kỹ thuật, chất lượng công trình và tiến độ thi công đối với bên B. Đôn đốc bên B thi công và nghiệm thu đúng quy trình quy phạm và bản vẽ thiết kế thi công đã được phê duyệt;\n- Thanh toán đầy đủ theo đơn giá của bên B và đúng thời gian cho bên B;\n- Phối hợp nhận bàn giao mặt bằng công trình đã giải tỏa và bàn giao lại cho bên B;\n- Xác lập lập Biên bản xác nhận khối lượng thi công thực tế để làm cơ sở thanh toán.\n- Thanh toán kinh phí cho bên B như Điều 5.`}
              </p>
            </div>
            <div className="mt-2">
              <div className="font-bold">6.2. Trách nhiệm của Bên B:</div>
              <p className="pl-4 mt-0.5" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {formData['dieu6_b_content'] || `- Lập tiến độ và phương án tổ chức thi công gửi bên A sau 07 ngày để bên A theo dõi kiểm tra trong thi công;\n- Phối hợp cùng bên A nhận bàn giao mặt bằng thi công, quản lý thống nhất mặt bằng thi công sau khi được bàn giao;\n- Thi công theo đúng Hồ sơ thiết kế, chất lượng đúng quy trình quy phạm hiện hành;\n- Trong quá trình thi công phải đảm bảo vệ sinh môi trường chung, các vật liệu thừa phải thu dọn vận chuyển ngay đi nơi khác theo chỉ dẫn của tư vấn giám sát;\n- Chịu trách nhiệm về an toàn lao động, phòng chống cháy nổ, đảm bảo giao thông, an toàn giao thông trong suốt quá trình thi công tại công trường. Nếu để xảy ra sự cố bên B phải chịu xử lý theo luật định;\n- Cùng bên B lập Biên bản xác nhận khối lượng thi công thực tế để làm cơ sở thanh toán và thanh lý hợp đồng.\n- Xuất hóa đơn thuế GTGT cho bên A.`}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold">Điều 7: Điều khoản khác</div>
          <p className="pl-4">
            Hai bên cam kết thực hiện đúng các điều khoản đã thống nhất trong hợp đồng. Trong quá trình thực hiện hợp đồng nếu có gì vướng mắc, phát sinh hay thay đổi, hai bên chủ động gặp nhau bàn bạc giải quyết. Trong trường hợp không giải quyết được sẽ đưa ra tòa án Kinh tế có thẩm quyền để phân xử. Quyết định của tòa án là phán quyết cuối cùng.
          </p>
          <p className="pl-4">
            Hợp đồng này có hiệu lực kể từ ngày ký và hết hiệu lực khi các bên đã thực hiện xong các điều khoản của hợp đồng. Sau khi các bên hoàn thành đầy đủ nghĩa vụ của mình theo thỏa thuận trong hợp đồng thì hợp đồng được xem như thanh lý.
          </p>
          <p className="pl-4">
            Hợp đồng được lập thành 4 bản có giá trị như nhau, Bên A giữ 02 bản, bên B giữ 02 bản và có giá trị pháp lý như nhau.
          </p>
        </div>

        <div className="flex justify-between items-start mt-8 pt-6 border-t border-stone-200 font-sans">
          <div className="text-center w-60">
            <div className="font-bold uppercase">ĐẠI DIỆN BÊN A</div>
            <div className="h-16" />
            <div className="font-bold"><InlineField tag="DAIDIENBENA" placeholder="[Họ tên đại diện A]" width="180px" /></div>
          </div>
          <div className="text-center w-60">
            <div className="font-bold uppercase">ĐẠI DIỆN BÊN B</div>
            <div className="h-16" />
            <div className="font-bold"><InlineField tag="DAIDIENBENB" placeholder="[Họ tên đại diện B]" width="180px" /></div>
          </div>
        </div>
      </div>
    );
  };

  // HDCM Document A4 Layout
  const renderHDCMDocument = () => {
    return (
      <div className="space-y-6 text-stone-900 leading-relaxed text-[13px] text-left">
        <div className="flex justify-between items-start">
          <div className="flex flex-col text-left">
            <InlineField tag="TEN_CTY_VIET_TAT" placeholder="[TÊN CÔNG TY VIẾT TẮT]" width="200px" />
            <div className="text-xs text-stone-600 mt-1 pl-1">
              Số: <InlineField tag="SO_HOPDONG" placeholder="..........." width="140px" />
            </div>
          </div>
          <div className="text-center font-bold">
            <div className="uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div className="text-xs tracking-wider mt-0.5">Độc lập – Tự do – Hạnh phúc</div>
            <div className="text-[10px] text-stone-400 font-sans mt-0.5 font-normal">------o0o------</div>
          </div>
        </div>

        <div className="text-center mt-6">
          <h1 className="text-lg font-bold uppercase tracking-wide">HỢP ĐỒNG THUÊ XE MÁY</h1>
        </div>

        <div className="space-y-1 text-xs italic pl-4 border-l-2 border-stone-200 text-stone-600">
          <p>- Căn cứ Luật thương mại và luật dân sự hiện hành.</p>
          <p>- Căn cứ nhu cầu và khả năng của hai bên.</p>
        </div>

        <p className="mt-4">
          Hôm nay, ngày <InlineField tag="DAY_HOPDONG" placeholder="ngày" width="45px" maxLength={2} isNumeric /> tháng <InlineField tag="MONTH_HOPDONG" placeholder="tháng" width="45px" maxLength={2} isNumeric /> năm <InlineField tag="YEAR_HOPDONG" placeholder="năm" width="65px" maxLength={4} isNumeric />, tại văn phòng <InlineField tag="BEN_A" placeholder="[Địa điểm/Văn phòng Bên A]" width="280px" />, chúng tôi gồm có:
        </p>

        <div className="space-y-1.5 mt-3">
          <div className="font-bold uppercase">BÊN THUÊ (Gọi tắt là Bên A): <InlineField tag="BEN_A" placeholder="[Tên công ty Bên A]" width="380px" /></div>
          <div className="pl-4 space-y-1">
            <div>- Đại diện: <InlineField tag="GIOITINHBENA" placeholder="Ông/Bà" width="60px" /> <InlineField tag="DAIDIENBENA" placeholder="[Họ tên đại diện]" width="180px" /></div>
            <div>- Chức vụ: <InlineField tag="CHUCVUBENA" placeholder="[Chức vụ]" width="140px" /></div>
            <div>- Địa chỉ: <InlineField tag="DIACHIBENA" placeholder="[Địa chỉ công ty]" width="480px" /></div>
            <div>- Mã số thuế: <InlineField tag="MSTBENA" placeholder="[Mã số thuế]" width="140px" /></div>
            <div>- Tài khoản số: <InlineField tag="STKBENA" placeholder="[Số tài khoản]" width="140px" /> tại ngân hàng: <InlineField tag="NGANHANGBENA" placeholder="[Ngân hàng]" width="200px" /></div>
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold uppercase">BÊN CHO THUÊ (Gọi tắt là Bên B): <InlineField tag="BEN_B" placeholder="[Tên công ty Bên B]" width="380px" /></div>
          <div className="pl-4 space-y-1">
            <div>- Đại diện: <InlineField tag="GIOITINHBENB" placeholder="Ông/Bà" width="60px" /> <InlineField tag="DAIDIENBENB" placeholder="[Họ tên đại diện]" width="180px" /></div>
            <div>- Chức vụ: <InlineField tag="CHUCVUBENB" placeholder="[Chức vụ]" width="140px" /></div>
            <div>- Địa chỉ: <InlineField tag="DIACHIBENB" placeholder="[Địa chỉ công ty]" width="480px" /></div>
            <div>- Mã số thuế: <InlineField tag="MSTBENB" placeholder="[Mã số thuế]" width="140px" /></div>
            <div>- Tài khoản số: <InlineField tag="STKBENB" placeholder="[Số tài khoản]" width="140px" /> tại ngân hàng: <InlineField tag="NGANHANGBENB" placeholder="[Ngân hàng]" width="200px" /></div>
          </div>
        </div>

        <p className="mt-4 font-bold italic">
          Hai bên cùng nhau bàn bạc, thỏa thuận thống nhất ký kết Hợp đồng thuê xe máy với các điều khoản như sau:
        </p>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold">Điều 1: Nội dung hợp đồng</div>
          <p className="pl-4">
            Bên A cung cấp xe máy thi công cho bên B thi công gói công trình: <InlineField tag="TENCONGTRINH" placeholder="[Tên gói công trình]" width="280px" /> như sau:
          </p>
          <div className="pl-4">
            <InlineTextArea tag="BANGGIATRITHUEXE" placeholder="Nhập bảng giá trị thuê xe, danh sách xe, đơn giá ca máy..." />
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold">Điều 2: Giá trị hợp đồng</div>
          <div className="pl-4 space-y-1">
            <p>
              - Tổng giá trị hợp đồng là: <InlineField tag="GIATRIHOPDONG" placeholder="[Giá trị hợp đồng]" width="160px" /> đ (đã bao gồm thuế GTGT 8%).
            </p>
            <p>
              - Bằng chữ: <InlineField tag="BANGCHUGIATRI" placeholder="[Bằng chữ]" width="420px" />.
            </p>
            <p>- Giá trị trên là giá trị tạm tính. Giá trị thực tế tại công trường là giá trị thanh quyết toán.</p>
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold">Điều 3: Thời gian thực hiện hợp đồng</div>
          <p className="pl-4">- Thời gian thực hiện: kể từ ký hợp đồng.</p>
        </div>

        <div className="space-y-1.5 mt-4 text-left">
          <div className="font-bold">Điều 4: Phương thức nghiệm thu khối lượng</div>
          <p className="pl-4" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {formData['dieu4_content'] || 'Căn cứ vào khối lượng thực tế thi công tại công trình, Bên A và Bên B đo đạc, lập Biên bản xác nhận ca máy để làm cơ sở thanh toán.'}
          </p>
        </div>

        <div className="space-y-1.5 mt-4 text-left">
          <div className="font-bold">Điều 5: Phương thức thanh toán</div>
          <p className="pl-4" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {formData['dieu5_content'] || 'Thanh toán bằng chuyển khoản. Căn cứ vào Biên bản xác nhận ca máy, Bên B xuất hóa đơn cho bên A và bên A sẽ thanh toán cho bên B 100% giá trị trong vòng 240 ngày kể từ ngày hai bên đối chiếu và xác nhận công nợ.'}
          </p>
        </div>

        <div className="space-y-1.5 mt-4 text-left">
          <div className="font-bold">Điều 6: Trách nhiệm của các bên</div>
          <div className="pl-4 space-y-2">
            <div>
              <div className="font-bold">6.1. Trách nhiệm của Bên A:</div>
              <p className="pl-4 mt-0.5" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {formData['dieu6_a_content'] || `- Bố trí mặt bằng, địa hình tốt để máy hoạt động đảm bảo an toàn.\n- Sắp xếp lịch làm việc hợp lý để đảm bảo sức khỏe thợ lái máy.\n- Thanh toán tiền thuê máy đúng hạn và tuân thủ các điều khoản của hợp đồng.\n- Xác lập lập Biên bản xác nhận ca máy thực tế để làm cơ sở thanh toán.\n- Cam kết sử dụng máy đúng mục đích thuê.\n- Thanh toán kinh phí cho bên B như Điều 5.`}
              </p>
            </div>
            <div className="mt-2">
              <div className="font-bold">6.2. Trách nhiệm của Bên B:</div>
              <p className="pl-4 mt-0.5" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {formData['dieu6_b_content'] || `- Thiết bị đưa tới công trường phải trong điều kiện hoạt động bình thường tại mọi chế độ.\n- Thợ vận hành máy phải luôn có mặt tại công trường trong giờ làm việc.\n- Đảm bảo máy luôn vận hành tốt. Nếu do lỗi thiết bị, máy phải ngừng hoạt động trên 30 phút thì bên A có trách nhiệm làm bù giờ cho những giờ máy ngừng hoạt động.\n- Đảm bảo tính hợp pháp của thiết bị khi các cơ quan có trách nhiệm kiểm tra.\n- Tuyệt đối tuân thủ và tự chịu trách nhiệm về an toàn lao động trong quá trình vận hành máy tại công trường.\n- Cùng bên B lập Biên bản xác nhận ca máy thực tế để làm cơ sở thanh toán và thanh lý hợp đồng.\n- Xuất hóa đơn thuế GTGT cho bên A.`}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <div className="font-bold">Điều 7: Điều khoản khác</div>
          <p className="pl-4">
            Hai bên cam kết thực hiện đúng các điều khoản đã thống nhất trong hợp đồng. Trong quá trình thực hiện hợp đồng nếu có gì vướng mắc, phát sinh hay thay đổi, hai bên chủ động gặp nhau bàn bạc giải quyết. Trong trường hợp không giải quyết được sẽ đưa ra tòa án Kinh tế có thẩm quyền để phân xử. Quyết định của tòa án là phán quyết cuối cùng.
          </p>
          <p className="pl-4">
            Hợp đồng này có hiệu lực kể từ ngày ký và hết hiệu lực khi các bên đã thực hiện xong các điều khoản của hợp đồng. Sau khi các bên hoàn thành đầy đủ nghĩa vụ của mình theo thỏa thuận trong hợp đồng thì hợp đồng được xem như thanh lý.
          </p>
          <p className="pl-4">
            Hợp đồng được lập thành 4 bản có giá trị như nhau, Bên A giữ 02 bản, bên B giữ 02 bản và có giá trị pháp lý như nhau.
          </p>
        </div>

        <div className="flex justify-between items-start mt-8 pt-6 border-t border-stone-200 font-sans">
          <div className="text-center w-60">
            <div className="font-bold uppercase">ĐẠI DIỆN BÊN A</div>
            <div className="h-16" />
            <div className="font-bold"><InlineField tag="DAIDIENBENA" placeholder="[Họ tên đại diện A]" width="180px" /></div>
          </div>
          <div className="text-center w-60">
            <div className="font-bold uppercase">ĐẠI DIỆN BÊN B</div>
            <div className="h-16" />
            <div className="font-bold"><InlineField tag="DAIDIENBENB" placeholder="[Họ tên đại diện B]" width="180px" /></div>
          </div>
        </div>
      </div>
    );
  };

  // Tự động cập nhật địa chỉ khi ngày/tháng/năm ký thay đổi
  // Categorize tags for better UI
  const { categorizedTags, dateGroups } = useMemo(() => {
    const categories = {
      partyA: [] as string[],
      partyB: [] as string[],
      general: [] as string[]
    };

    // Detect related Day/Month/Year fields to group them
    const groups: Record<string, { day?: string, month?: string, year?: string }> = {};
    const dateTags = new Set<string>();

    tags.forEach(tag => {
      const upper = tag.toUpperCase();

      // Smart detection of date components
      // Patterns: NGAY_KY, THANG_KY, NAM_KY or DAY_CTR, MONTH_CTR, YEAR_CTR
      const datePatterns = [
        { key: 'day', regex: /^(NGAY|DAY|D)_?(.*)$/i },
        { key: 'month', regex: /^(THANG|MONTH|M)_?(.*)$/i },
        { key: 'year', regex: /^(NAM|YEAR|Y)_?(.*)$/i }
      ];

      for (const pattern of datePatterns) {
        const match = upper.match(pattern.regex);
        if (match) {
          const suffix = match[2] || 'DEFAULT';
          if (!groups[suffix]) groups[suffix] = {};
          (groups[suffix] as any)[pattern.key] = tag;
          dateTags.add(tag);
          break;
        }
      }

      if (upper.includes('BEN A') || upper.includes('BENA') || upper.includes('BEN_A') || upper.endsWith('_A') || upper.startsWith('A_')) {
        categories.partyA.push(tag);
      } else if (upper.includes('BEN B') || upper.includes('BENB') || upper.includes('BEN_B') || upper.endsWith('_B') || upper.startsWith('B_')) {
        categories.partyB.push(tag);
      } else {
        categories.general.push(tag);
      }
    });

    // Only keep groups that have at least 2 components
    const finalDateGroups = Object.keys(groups)
      .filter(key => Object.keys(groups[key]).length >= 2)
      .map(key => ({
        id: key,
        label: (() => {
          const uKey = key.toUpperCase();
          if (uKey === 'DEFAULT' || uKey === 'HD' || uKey === 'HOPDONG' || uKey === 'KY') return 'Ngày ký hợp đồng';
          if (uKey === 'BAT_DAU' || uKey === 'BATDAU') return 'Ngày bắt đầu';
          if (uKey === 'KET_THUC' || uKey === 'KETTHUC') return 'Ngày kết thúc';
          return `Ngày ${key.replace(/_/g, ' ')}`;
        })(),
        ...groups[key]
      }));

    // Filter out grouped date tags from main categories to avoid duplication
    const filterGrouped = (list: string[]) => list.filter(t => !dateTags.has(t));

    // Safety for HDTC: ensure DIADIEM and BANGGIATRIHOPDONG are present in categories if template is HDTC
    const currentTags = [...tags];
    if (selectedTemplate === 'HDTC') {
      if (!currentTags.some(t => {
        const u = t.toUpperCase();
        return u === 'DIA_DIEM' || u === 'DIADIEM' || u === 'DIA DIEM';
      })) {
        currentTags.push('DIADIEM');
      }
      if (!currentTags.some(t => t.toUpperCase() === 'BANGGIATRIHOPDONG')) {
        currentTags.push('BANGGIATRIHOPDONG');
      }
    }

    const finalPartyA = filterGrouped(categories.partyA);
    const finalPartyB = filterGrouped(categories.partyB);
    const finalGeneral = filterGrouped(categories.general);

    // Supplement general if DIADIEM / BANGGIATRIHOPDONG was missing in original tags but added via safety
    if (selectedTemplate === 'HDTC') {
      if (!finalGeneral.some(t => {
        const u = t.toUpperCase();
        return u === 'DIA_DIEM' || u === 'DIADIEM' || u === 'DIA DIEM';
      }) && currentTags.includes('DIADIEM')) {
        finalGeneral.push('DIADIEM');
      }
      if (!finalGeneral.some(t => t.toUpperCase() === 'BANGGIATRIHOPDONG') && currentTags.includes('BANGGIATRIHOPDONG')) {
        finalGeneral.push('BANGGIATRIHOPDONG');
      }
    }

    // Identify tags to move to the left column (specifically "Tên công ty viết tắt")
    const movedTags = finalGeneral.filter(tag => {
      const upper = tag.toUpperCase();
      return upper.includes('VIET_TAT') || upper.endsWith('_VT');
    });

    // Remove moved tags from finalGeneral
    const remainingGeneral = finalGeneral.filter(tag => !movedTags.includes(tag));

    // Sort general tags according to template type
    let sortedGeneral = [...remainingGeneral];

    const CONTRACT_NUMBER_VARIANTS = ['SO_HD', 'SO_HOPDONG', 'SOHOPDONG', 'SOHD'];

    if (selectedTemplate === 'HDNT') {
      // Order: Số HD -> Giá trị HD -> Bảng giá trị HD -> Bằng chữ giá trị
      const order = [CONTRACT_NUMBER_VARIANTS, 'GIATRIHOPDONG', 'BANG_GIATRIHOPDONG', 'BANGCHUGIATRI'];
      sortedGeneral.sort((a, b) => {
        const uA = a.toUpperCase();
        const uB = b.toUpperCase();

        const idxA = order.findIndex(o => Array.isArray(o) ? o.includes(uA) : o === uA);
        const idxB = order.findIndex(o => Array.isArray(o) ? o.includes(uB) : o === uB);

        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    } else if (selectedTemplate === 'HDTC') {
      // Order: Số HD -> Địa điểm -> Gói thầu -> Tên công trình -> Giá trị -> Bằng chữ
      const order = [CONTRACT_NUMBER_VARIANTS, 'DIADIEM', 'DIA_DIEM', 'GOITHAU', 'GOI_THAU', 'TENCONGTRINH', 'TEN_CONGTRINH', 'GIATRIHOPDONG', 'BANGGIATRIHOPDONG', 'BANGCHUGIATRI'];
      sortedGeneral.sort((a, b) => {
        const uA = a.toUpperCase();
        const uB = b.toUpperCase();

        const idxA = order.findIndex(o => Array.isArray(o) ? o.includes(uA) : o === uA);
        const idxB = order.findIndex(o => Array.isArray(o) ? o.includes(uB) : o === uB);

        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    } else if (selectedTemplate === 'HDCM') {
      // Order: Số HD -> Giá trị -> Bảng -> Bằng chữ
      const order = [CONTRACT_NUMBER_VARIANTS, 'GIATRIHOPDONG', 'BANG_GIATRIHOPDONG', 'BANGCHUGIATRI'];
      sortedGeneral.sort((a, b) => {
        const uA = a.toUpperCase();
        const uB = b.toUpperCase();

        const idxA = order.findIndex(o => Array.isArray(o) ? o.includes(uA) : o === uA);
        const idxB = order.findIndex(o => Array.isArray(o) ? o.includes(uB) : o === uB);

        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    }

    return {
      categorizedTags: {
        partyA: [...finalPartyA, ...movedTags.filter(t => t.toUpperCase().includes('_A') || t.toUpperCase().includes('BENA'))],
        partyB: [...finalPartyB, ...movedTags.filter(t => t.toUpperCase().includes('_B') || t.toUpperCase().includes('BENB'))],
        general: sortedGeneral,
        moved: movedTags
      },
      dateGroups: finalDateGroups
    };
  }, [tags, selectedTemplate]);

  const getEffectiveAddressWithData = (partner: Partner, data: Record<string, string>) => {
    if (!data) return partner?.address || '';
    // Ưu tiên tìm nhóm ngày là "Ngày ký hợp đồng" hoặc nhóm đầu tiên
    const contractGroup = dateGroups.find(g => g.label === 'Ngày ký hợp đồng') || dateGroups[0];

    let day = '', month = '', year = '';

    if (contractGroup) {
      day = data[contractGroup.day || ''] || '';
      month = data[contractGroup.month || ''] || '';
      year = data[contractGroup.year || ''] || '';
    }

    // Nếu không tìm thấy qua group, thử tìm thủ công qua các key phổ biến (fallback)
    if (!day || !month || !year) {
      const uppercaseData: Record<string, string> = {};
      for (const [k, val] of Object.entries(data)) {
        uppercaseData[k.toUpperCase()] = val;
      }
      const getKeys = (prefix: string) => {
        const variants = [
          `${prefix}_HD`, `${prefix}_KY`, `${prefix}_HOPDONG`, `${prefix}_HOP_DONG`,
          `${prefix}KYHOPDONG`, `${prefix}_KY_HOP_DONG`, prefix
        ];
        for (const v of variants) {
          const upperV = v.toUpperCase();
          if (uppercaseData[upperV]) return uppercaseData[upperV];
        }
        return '';
      };
      day = day || getKeys('NGAY');
      month = month || getKeys('THANG');
      year = year || getKeys('NAM');
    }

    if (!day || !month || !year) return partner.address;

    try {
      const d = parseInt(day);
      const m = parseInt(month) - 1;
      const y = parseInt(year);

      if (isNaN(d) || isNaN(m) || isNaN(y)) return partner.address;

      // Tạo đối tượng ngày để so sánh (không có giờ phút để chuẩn xác)
      const contractDate = new Date(y, m, d);
      contractDate.setHours(0, 0, 0, 0);

      const comparisonDate = new Date(MERGER_DATE);
      comparisonDate.setHours(0, 0, 0, 0);

      if (contractDate >= comparisonDate && partner.addressPostMerger) {
        return partner.addressPostMerger;
      }
    } catch (e) {
      console.error("Error comparing dates:", e);
    }
    return partner.address;
  };

  const getEffectiveAddressByCurrentDate = (partner: Partner) => {
    return getEffectiveAddressWithData(partner, formData);
  };

  const commonItemProps = {
    formData,
    vtLinks,
    setFormData,
    setVtLinks,
    setActiveInvoiceTag,
    setIsInvoiceSelectorOpen,
    selectedPartyAId,
    selectedPartyBId,
    partners,
    toast,
    handleFieldChange,
    getEffectiveAddressByCurrentDate
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const CONTRACT_TEMPLATES = [
    { id: 'HDNT', name: 'Hợp đồng Nguyên Tắc', file: 'Template_HDNT.docx', folder: 'templatesHopDong' },
    { id: 'HDTC', name: 'Hợp đồng Thi Công', file: 'Template_HDTC.docx', folder: 'templatesHopDong' },
    { id: 'HDCM', name: 'Hợp đồng Ca Máy', file: 'Template_HDCM.docx', folder: 'templatesHopDong' },
    { id: 'GDNTT', name: 'Giấy đề nghị thanh toán / tạm ứng', file: 'Template GDN TT.docx', folder: 'templates_muc_phu' }
  ];

  const handleTemplateChange = async (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = CONTRACT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    try {
      let basePath = (import.meta as any).env?.BASE_URL || './';
      if (basePath === './') {
        const pathSegments = window.location.pathname.split('/');
        basePath = pathSegments.slice(0, -1).join('/') + '/';
      }
      if (!basePath.endsWith('/')) basePath += '/';

      const folderName = (template as any).folder || 'templatesHopDong';
      const finalPath = `${basePath}${folderName}/${template.file}`.replace(/\/+/g, '/');
      const response = await fetch(finalPath);
      if (!response.ok) throw new Error('Không thể tải template: ' + finalPath);
      const buffer = await response.arrayBuffer();
      setTemplateBuffer(buffer);
      const extractedTags = extractTags(buffer);
      setTags(extractedTags);

      let finalTags = [...extractedTags];

      // For GDNTT: consolidate BEN_DUOC_DE_NGHI_TITLE / BEN_DE_NGHI_TITLE → base versions
      if (templateId === 'GDNTT') {
        const gdnFiltered: string[] = [];
        let hasBenDuoc = false, hasBenDeNghi = false;
        finalTags.forEach(tag => {
          const u = tag.toUpperCase();
          if (u === 'BEN_DUOC_DE_NGHI_TITLE' || u === 'BEN_DUOC_DE_NGHI') { hasBenDuoc = true; }
          else if (u === 'BEN_DE_NGHI_TITLE' || u === 'BEN_DE_NGHI') { hasBenDeNghi = true; }
          else if (u !== 'TAMUNG-THANHTOAN_TITLE') { gdnFiltered.push(tag); }
        });
        if (hasBenDuoc) gdnFiltered.push('BEN_DUOC_DE_NGHI');
        if (hasBenDeNghi) gdnFiltered.push('BEN_DE_NGHI');
        finalTags = gdnFiltered;
      }

      // HDTC needs DIADIEM and BANGGIATRIHOPDONG fields even if not in template tags
      if (templateId === 'HDTC') {
        if (!finalTags.some(t => {
          const u = t.toUpperCase();
          return u === 'DIA_DIEM' || u === 'DIADIEM' || u === 'DIA DIEM' || u === 'DIADIEMCONGTRINH';
        })) {
          finalTags.push('DIADIEM');
        }
        if (!finalTags.some(t => t.toUpperCase() === 'BANGGIATRIHOPDONG')) {
          finalTags.push('BANGGIATRIHOPDONG');
        }
      }

      setTags(finalTags);

      // When switching templates, we only initialize missing tags for the NEW template's specific data
      setFormData((oldDataForThisTemplate: Record<string, string>) => {
        const next = { ...oldDataForThisTemplate };
        finalTags.forEach(tag => {
          if (next[tag] === undefined) next[tag] = '';
        });

        // Initialize default clauses for Hợp đồng Nguyên tắc (HDNT), Hợp đồng Thi Công (HDTC), Hợp đồng Ca Máy (HDCM)
        if (templateId === 'HDNT') {
          if (!next['dieu4_content']) {
            next['dieu4_content'] = 'Căn cứ vào khối lượng bàn giao vật tư thực tế tại công trình, Bên A và Bên B đo đạc, lập Biên bản xác nhận khối lượng vật tư để làm cơ sở thanh toán.';
          }
          if (!next['dieu5_content']) {
            next['dieu5_content'] = 'Thanh toán bằng chuyển khoản. Căn cứ vào Biên bản xác nhận khối lượng vật tư, Bên B xuất hóa đơn cho bên A và bên A sẽ thanh toán cho bên B 100% giá trị trong vòng 240 ngày kể từ ngày hai bên đối chiếu và xác nhận công nợ.';
          }
          if (!next['dieu6_a_content']) {
            next['dieu6_a_content'] = '- Kiểm tra số lượng, chủng loại, chất lượng và bốc xếp hàng hoá từ phương tiện chuyên chở vào cửa hàng;\n- Thanh toán đầy đủ theo đơn giá của bên B và đúng thời gian cho bên B;\n- Xác lập lập Biên bản xác nhận khối lượng vật tư thực tế để làm cơ sở thanh toán.\n- Thanh toán kinh phí cho bên B như Điều 5.';
          }
          if (!next['dieu6_b_content']) {
            next['dieu6_b_content'] = '- Bảo đảm cung ứng đầy đủ cho bên A theo đúng đơn giá đã công bố;\n- Vận chuyển hàng hoá bảo đảm, an toàn đến giao tận địa chỉ đã đăng ký của bên A;\n- Cùng bên B lập Biên bản xác nhận khối lượng vật tư thực tế để làm cơ sở thanh toán và thanh lý hợp đồng.\n- Xuất hóa đơn thuế GTGT cho bên A.';
          }
        } else if (templateId === 'HDTC') {
          if (!next['dieu4_content']) {
            next['dieu4_content'] = 'Căn cứ vào khối lượng thực tế thi công tại công trình, Bên A và Bên B đo đạc, lập biên bản xác nhận khối lượng thi công hoàn thiện để làm cơ sở thanh toán.';
          }
          if (!next['dieu5_content']) {
            next['dieu5_content'] = 'Thanh toán bằng chuyển khoản. Căn cứ vào Biên bản xác nhận khối lượng thi công, Bên B xuất hóa đơn cho bên A và bên A sẽ thanh toán cho bên B 100% giá trị trong vòng 240 ngày kể từ ngày hai bên đối chiếu và xác nhận công nợ.';
          }
          if (!next['dieu6_a_content']) {
            next['dieu6_a_content'] = '- Giám sát công tác kỹ thuật, chất lượng công trình và tiến độ thi công đối với bên B. Đôn đốc bên B thi công và nghiệm thu đúng quy trình quy phạm và bản vẽ thiết kế thi công đã được phê duyệt;\n- Thanh toán đầy đủ theo đơn giá của bên B và đúng thời gian cho bên B;\n- Phối hợp nhận bàn giao mặt bằng công trình đã giải tỏa và bàn giao lại cho bên B;\n- Xác lập lập Biên bản xác nhận khối lượng thi công thực tế để làm cơ sở thanh toán.\n- Thanh toán kinh phí cho bên B như Điều 5.';
          }
          if (!next['dieu6_b_content']) {
            next['dieu6_b_content'] = '- Lập tiến độ và phương án tổ chức thi công gửi bên A sau 07 ngày để bên A theo dõi kiểm tra trong thi công;\n- Phối hợp cùng bên A nhận bàn giao mặt bằng thi công, quản lý thống nhất mặt bằng thi công sau khi được bàn giao;\n- Thi công theo đúng Hồ sơ thiết kế, chất lượng đúng quy trình quy phạm hiện hành;\n- Trong quá trình thi công phải đảm bảo vệ sinh môi trường chung, các vật liệu thừa phải thu dọn vận chuyển ngay đi nơi khác theo chỉ dẫn của tư vấn giám sát;\n- Chịu trách nhiệm về an toàn lao động, phòng chống cháy nổ, đảm bảo giao thông, an toàn giao thông trong suốt quá trình thi công tại công trường. Nếu để xảy ra sự cố bên B phải chịu xử lý theo luật định;\n- Cùng bên B lập Biên bản xác nhận khối lượng thi công thực tế để làm cơ sở thanh toán và thanh lý hợp đồng.\n- Xuất hóa đơn thuế GTGT cho bên A.';
          }
        } else if (templateId === 'HDCM') {
          if (!next['dieu4_content']) {
            next['dieu4_content'] = 'Căn cứ vào khối lượng thực tế thi công tại công trình, Bên A và Bên B đo đạc, lập Biên bản xác nhận ca máy để làm cơ sở thanh toán.';
          }
          if (!next['dieu5_content']) {
            next['dieu5_content'] = 'Thanh toán bằng chuyển khoản. Căn cứ vào Biên bản xác nhận ca máy, Bên B xuất hóa đơn cho bên A và bên A sẽ thanh toán cho bên B 100% giá trị trong vòng 240 ngày kể từ ngày hai bên đối chiếu và xác nhận công nợ.';
          }
          if (!next['dieu6_a_content']) {
            next['dieu6_a_content'] = '- Bố trí mặt bằng, địa hình tốt để máy hoạt động đảm bảo an toàn.\n- Sắp xếp lịch làm việc hợp lý để đảm bảo sức khỏe thợ lái máy.\n- Thanh toán tiền thuê máy đúng hạn và tuân thủ các điều khoản của hợp đồng.\n- Xác lập lập Biên bản xác nhận ca máy thực tế để làm cơ sở thanh toán.\n- Cam kết sử dụng máy đúng mục đích thuê.\n- Thanh toán kinh phí cho bên B như Điều 5.';
          }
          if (!next['dieu6_b_content']) {
            next['dieu6_b_content'] = '- Thiết bị đưa tới công trường phải trong điều kiện hoạt động bình thường tại mọi chế độ.\n- Thợ vận hành máy phải luôn có mặt tại công trường trong giờ làm việc.\n- Đảm bảo máy luôn vận hành tốt. Nếu do lỗi thiết bị, máy phải ngừng hoạt động trên 30 phút thì bên A có trách nhiệm làm bù giờ cho những giờ máy ngừng hoạt động.\n- Đảm bảo tính hợp pháp của thiết bị khi các cơ quan có trách nhiệm kiểm tra.\n- Tuyệt đối tuân thủ và tự chịu trách nhiệm về an toàn lao động trong quá trình vận hành máy tại công trường.\n- Cùng bên B lập Biên bản xác nhận ca máy thực tế để làm cơ sở thanh toán và thanh lý hợp đồng.\n- Xuất hóa đơn thuế GTGT cho bên A.';
          }
        }
        return next;
      });

      setSelectedPartyAId('');
      setSelectedPartyBId('');
    } catch (error) {
      console.error(error);
      toast('Lỗi khi đọc template: ' + (error instanceof Error ? error.message : String(error)), 'error');
    }
  };

  const getMappingForPartner = (partner: Partner, prefix: 'A' | 'B') => {
    const isA = prefix === 'A';
    const abbrName = abbreviateCompanyName(partner.name);
    const effectiveAddress = getEffectiveAddressByCurrentDate(partner);

    const mapping: Record<string, string> = {
      [`${prefix}_TEN`]: partner.name,
      [`${prefix}_TEN_VT`]: abbrName,
      [`BEN_${prefix}`]: partner.name,
      [`BEN${prefix}`]: partner.name,
      [`TEN_CTY_${prefix}`]: partner.name,
      [`TEN_CTY_${prefix}_VT`]: abbrName,
      [`DIA_CHI_${prefix}`]: effectiveAddress,
      [`DIACHI_${prefix}`]: effectiveAddress,
      [`DIA_CHI_${isA ? 'A' : 'B'}`]: effectiveAddress,
      [`DIACHI_${isA ? 'A' : 'B'}`]: effectiveAddress,
      [`MST_${prefix}`]: partner.taxCode,
      [`MST${prefix}`]: partner.taxCode,
      [`DAI_DIEN_${prefix}`]: partner.representative || '',
      [`DAIDIEN_${prefix}`]: partner.representative || '',
      [`CHUC_VU_${prefix}`]: partner.position || '',
      [`CHUCVU_${prefix}`]: partner.position || '',
      [`GIOI_TINH_${prefix}`]: partner.gender || 'Ông',
      [`STK_${prefix}`]: partner.accountNumber || '',
      [`NH_${prefix}`]: partner.bankName || '',
      // Common variations
      [`${isA ? 'BENA' : 'BENB'}`]: partner.name,
      [`${isA ? 'BENA' : 'BENB'}_VT`]: abbrName,
      [`DIA_CHI_${isA ? 'BEN_A' : 'BEN_B'}`]: effectiveAddress,
      [`DIACHI_${isA ? 'BEN_A' : 'BEN_B'}`]: effectiveAddress,
      [`MST_${isA ? 'BEN_A' : 'BEN_B'}`]: partner.taxCode,
      [`DAI_DIEN_${isA ? 'BEN_A' : 'BEN_B'}`]: partner.representative || '',
      [`CHUC_VU_${isA ? 'BEN_A' : 'BEN_B'}`]: partner.position || '',
    };

    if (isA) {
      mapping['BEN_DUOC_DE_NGHI'] = toVietnameseTitleCase(partner.name);
      mapping['BEN_DUOC_DE_NGHI_TITLE'] = partner.name.toUpperCase();
    } else {
      mapping['BEN_DE_NGHI'] = toVietnameseTitleCase(partner.name);
      mapping['BEN_DE_NGHI_TITLE'] = toVietnameseTitleCase(partner.name);
      mapping['DAI_DIEN_BEN_DE_NGHI'] = partner.representative || '';
      mapping['STK_BEN_DE_NGHI'] = partner.accountNumber || '';
      mapping['NGAN_HANG_BEN_DE_NGHI'] = partner.bankName || '';
      mapping['TEN_CTY_VIET_TAT'] = abbrName;
    }

    return mapping;
  };

  const handlePartyChange = (partnerId: string, type: 'A' | 'B') => {
    if (type === 'A') setSelectedPartyAId(partnerId);
    else setSelectedPartyBId(partnerId);

    const partner = partners.find(p => p.id === partnerId);
    if (!partner) return;

    const newFormData = { ...formData };
    const mapping = getMappingForPartner(partner, type);

    // Chúng ta lặp qua danh sách tag từ template + các tag ảo để đảm bảo cập nhật đầy đủ
    const allTags = new Set([...tags, 'DIA_CHI_A', 'DIA_CHI_B', 'DIACHI_A', 'DIACHI_B', 'DIA_CHI_BEN_A', 'DIA_CHI_BEN_B', 'BEN_DUOC_DE_NGHI_TITLE', 'BEN_DE_NGHI_TITLE', 'TEN_CTY_VIET_TAT']);

    allTags.forEach(tag => {
      const upperTag = tag.toUpperCase();
      // Try direct match from mapping
      if (mapping[upperTag]) {
        newFormData[tag] = mapping[upperTag]!;
      } else {
        // Try fuzzy matching for common patterns - use stricter checks
        const isSideA = upperTag.includes('BENA') || upperTag.includes('BEN_A') || upperTag.includes('BEN A') || upperTag.endsWith('_A') || upperTag.startsWith('A_') || upperTag.includes('BEN_DUOC_DE_NGHI') || upperTag.includes('BENDUOCDENGHI');
        const isSideB = upperTag.includes('BENB') || upperTag.includes('BEN_B') || upperTag.includes('BEN B') || upperTag.endsWith('_B') || upperTag.startsWith('B_') || (upperTag.includes('BEN_DE_NGHI') && !upperTag.includes('BEN_DUOC_DE_NGHI')) || (upperTag.includes('BENDENGHI') && !upperTag.includes('BENDUOCDENGHI'));

        const isCorrectSide = (type === 'A' && isSideA) || (type === 'B' && isSideB);

        if (isCorrectSide) {
          const abbrName = abbreviateCompanyName(partner.name);
          if (upperTag.includes('TEN_VT') || upperTag.endsWith('_VT')) newFormData[tag] = abbrName;
          else if (upperTag.includes('TEN') || upperTag === 'BENA' || upperTag === 'BENB') newFormData[tag] = partner.name;
          else if (upperTag.includes('DIA_CHI') || upperTag.includes('DIACHI')) {
            newFormData[tag] = getEffectiveAddressByCurrentDate(partner);
          }
          else if (upperTag.includes('MST')) newFormData[tag] = partner.taxCode;
          else if (upperTag.includes('DAI_DIEN') || upperTag.includes('DAIDIEN')) newFormData[tag] = partner.representative;
          else if (upperTag.includes('CHUC_VU') || upperTag.includes('CHUCVU')) newFormData[tag] = partner.position;
          else if (upperTag.includes('GIOI_TINH') || upperTag.includes('GIOITINH')) newFormData[tag] = partner.gender || 'Ông';
          else if (upperTag.includes('STK')) newFormData[tag] = partner.accountNumber;
          else if (upperTag.includes('NH')) newFormData[tag] = partner.bankName;
        }
      }
    });

    // Reactive update for linked shortcut tags
    Object.keys(vtLinks).forEach(tag => {
      const party = vtLinks[tag];
      if (party) {
        const targetPartnerId = party === 'A' ? (type === 'A' ? partnerId : selectedPartyAId) : (type === 'B' ? partnerId : selectedPartyBId);
        const p = partners.find(ptr => ptr.id === targetPartnerId);
        if (p) {
          const uTag = tag.toUpperCase();
          if (uTag.includes('DIA_CHI') || uTag.includes('DIACHI')) {
            newFormData[tag] = getEffectiveAddressByCurrentDate(p);
          } else {
            newFormData[tag] = abbreviateCompanyName(p.name);
          }
        }
      }
    });

    setFormData(newFormData);
    toast(`Đã cập nhật thông tin Bên ${type}: ${partner.name}`, "success");
  };

  const forceUpdateAddresses = useCallback(() => {
    setFormData(prevFormData => {
      const newFormData = { ...prevFormData };
      let needsUpdateTotal = false;

      const parties: Array<{ id: string, type: 'A' | 'B' }> = [
        { id: selectedPartyAId, type: 'A' },
        { id: selectedPartyBId, type: 'B' }
      ];

      parties.forEach(({ id, type }) => {
        if (!id) return;
        const partner = partners.find(p => p.id === id);
        if (!partner) return;

        // Pass prevFormData to ensure we use current values in the calculation
        const effectiveAddress = getEffectiveAddressWithData(partner, prevFormData);

        const allPossibleTags = new Set([
          ...Object.keys(newFormData),
          'DIA_CHI_A', 'DIA_CHI_B', 'DIACHI_A', 'DIACHI_B',
          'DIA_CHI_BEN_A', 'DIA_CHI_BEN_B', 'DIA_CHI_BEN A', 'DIA_CHI_BEN B',
          'DAI_DIEN_A', 'DAI_DIEN_B', 'DAIDIEN_A', 'DAIDIEN_B',
          'DAI_DIEN_BEN_A', 'DAI_DIEN_BEN_B'
        ]);

        allPossibleTags.forEach(tag => {
          const upperTag = tag.toUpperCase();
          const isAddressTag = upperTag.includes('DIA_CHI') || upperTag.includes('DIACHI');
          const isRepTag = upperTag.includes('DAI_DIEN') || upperTag.includes('DAIDIEN');

          if (!isAddressTag && !isRepTag) return;

          // Stricter check for Side A/B to prevent cross-contamination (e.g. _B matching _BENA)
          const isSideA =
            upperTag.endsWith('_A') ||
            upperTag.includes('BEN_A') ||
            upperTag.includes('BEN A') ||
            upperTag.includes('BENA') ||
            upperTag.startsWith('A_') ||
            upperTag.includes('BEN_DUOC_DE_NGHI') ||
            upperTag.includes('BENDUOCDENGHI');

          const isSideB =
            upperTag.endsWith('_B') ||
            upperTag.includes('BEN_B') ||
            upperTag.includes('BEN B') ||
            upperTag.includes('BENB') ||
            upperTag.startsWith('B_') ||
            (upperTag.includes('BEN_DE_NGHI') && !upperTag.includes('BEN_DUOC_DE_NGHI')) ||
            (upperTag.includes('BENDENGHI') && !upperTag.includes('BENDUOCDENGHI'));

          const isCorrectSide = (type === 'A' && isSideA) || (type === 'B' && isSideB);

          if (isCorrectSide) {
            const targetVal = isAddressTag ? effectiveAddress : (partner.representative || '');
            const currentVal = newFormData[tag] || '';
            if (currentVal !== targetVal) {
              newFormData[tag] = targetVal;
              needsUpdateTotal = true;
            }
          }
        });
      });

      if (needsUpdateTotal) {
        return newFormData;
      }
      return prevFormData;
    });
    return true; // Assume we want to show toast if called manually
  }, [selectedPartyAId, selectedPartyBId, partners]);

  // Track date-related keys to trigger updates
  const dateValuesString = useMemo(() => {
    const keys: string[] = [];
    dateGroups.forEach(g => {
      if (g.day) keys.push(formData[g.day] || '');
      if (g.month) keys.push(formData[g.month] || '');
      if (g.year) keys.push(formData[g.year] || '');
    });
    return keys.join('|');
  }, [dateGroups, formData]);

  useEffect(() => {
    forceUpdateAddresses();
  }, [dateValuesString, selectedPartyAId, selectedPartyBId, forceUpdateAddresses]);

  const getTagType = (tag: string) => {
    const u = tag.toUpperCase();
    if (u === 'BENA' || u === 'BENB' || u.includes('TEN_CTY') || u === 'BEN_A' || u === 'BEN_B') return 'company';
    if (u.includes('GIOI_TINH') || u.includes('GIOITINH')) return 'gender';
    if (u.includes('DAI_DIEN') || u.includes('DAIDIEN')) return 'rep';
    if (u.includes('CHUC_VU') || u.includes('CHUCVU')) return 'pos';
    if (u.includes('STK') || u.includes('SO_TAI_KHOAN') || u.includes('SOTAIKHOAN')) return 'stk';
    if (u === 'NH' || u.startsWith('NH_') || u.endsWith('_NH') || u.includes('_NH_') || u.includes('NGAN_HANG') || u.includes('NGANHANG')) return 'bank';
    if (u.includes('DIA_CHI') || u.includes('DIACHI')) return 'address';
    return 'other';
  };

  const renderCategorizedPartyTags = (sideTags: string[]) => {
    const groups: {
      company: string[],
      row2: { gender: string | null, rep: string | null, pos: string | null },
      row3: { stk: string | null, bank: string | null },
      others: string[],
      address: string[]
    } = {
      company: [],
      row2: { gender: null, rep: null, pos: null },
      row3: { stk: null, bank: null },
      others: [],
      address: []
    };

    sideTags.forEach(tag => {
      const type = getTagType(tag);
      if (type === 'company') groups.company.push(tag);
      else if (type === 'gender') groups.row2.gender = tag;
      else if (type === 'rep') groups.row2.rep = tag;
      else if (type === 'pos') groups.row2.pos = tag;
      else if (type === 'stk') groups.row3.stk = tag;
      else if (type === 'bank') groups.row3.bank = tag;
      else if (type === 'address') groups.address.push(tag);
      else groups.others.push(tag);
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5">
        {/* Row 1: Company */}
        {groups.company.map(tag => (
          <div key={tag} className="md:col-span-12">
            <TagRenderItem tag={tag} {...commonItemProps} />
          </div>
        ))}

        {/* Row 2: Gender, Rep, Pos */}
        {(groups.row2.gender || groups.row2.rep || groups.row2.pos) && (
          <React.Fragment>
            {groups.row2.gender && (
              <div className="md:col-span-3">
                <TagRenderItem tag={groups.row2.gender} {...commonItemProps} />
              </div>
            )}
            {groups.row2.rep && (
              <div className={cn(
                groups.row2.gender && groups.row2.pos ? "md:col-span-5" :
                  groups.row2.gender || groups.row2.pos ? "md:col-span-9" : "md:col-span-12"
              )}>
                <TagRenderItem tag={groups.row2.rep} {...commonItemProps} />
              </div>
            )}
            {groups.row2.pos && (
              <div className={cn(
                groups.row2.gender && groups.row2.rep ? "md:col-span-4" :
                  groups.row2.gender || groups.row2.rep ? "md:col-span-7" : "md:col-span-12"
              )}>
                <TagRenderItem tag={groups.row2.pos} {...commonItemProps} />
              </div>
            )}
          </React.Fragment>
        )}

        {/* Row 3: STK, Bank */}
        {(groups.row3.stk || groups.row3.bank) && (
          <React.Fragment>
            {groups.row3.stk && (
              <div className={cn(groups.row3.bank ? "md:col-span-5" : "md:col-span-12")}>
                <TagRenderItem tag={groups.row3.stk} {...commonItemProps} />
              </div>
            )}
            {groups.row3.bank && (
              <div className={cn(groups.row3.stk ? "md:col-span-7" : "md:col-span-12")}>
                <TagRenderItem tag={groups.row3.bank} {...commonItemProps} />
              </div>
            )}
          </React.Fragment>
        )}

        {/* Others */}
        {groups.others.map(tag => (
          <div key={tag} className="md:col-span-6">
            <TagRenderItem tag={tag} {...commonItemProps} />
          </div>
        ))}

        {/* Address (Bottom) */}
        {groups.address.map(tag => (
          <div key={tag} className="md:col-span-12">
            <TagRenderItem tag={tag} {...commonItemProps} />
          </div>
        ))}
      </div>
    );
  };

  const handleGenerate = async () => {
    if (!templateBuffer || !selectedTemplate) return;
    setIsGenerating(true);
    try {
      const out = await generateDocxBlobForContract(selectedTemplate, formData, templateBuffer);
      const templateName = CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate)?.name || 'Hợp đồng';
      const partnerA = partners.find(p => p.id === selectedPartyAId);
      const partnerB = partners.find(p => p.id === selectedPartyBId);
      const abbrA = partnerA ? abbreviateCompanyName(partnerA.name) : 'Bên A';
      const abbrB = partnerB ? abbreviateCompanyName(partnerB.name) : 'Bên B';

      const rawSignDate = getContractSignDateStandalone(formData);
      const signDateFormatted = rawSignDate ? rawSignDate.replace(/\//g, '-') : new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');

      const fileName = `${templateName}_${abbrA}_${abbrB}_${signDateFormatted}.docx`;
      const contractFolderName = fileName.replace(/\.docx$/i, '');

      saveAs(out, fileName);

      let driveUrl = '';
      let fileId = '';
      const gasUrl = (import.meta as any).env.VITE_GAS_WEB_APP_URL;

      if (gasUrl) {
        try {
          const base64Data = await blobToBase64(out);
          const gasRes = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, // Using text/plain to avoid CORS preflight constraints in GAS
            body: JSON.stringify({
              action: 'save_contract_file',
              base64Data,
              fileName,
              contractFolder: contractFolderName
            })
          });

          if (gasRes.ok) {
            const gasJson = await gasRes.json();
            if (gasJson.success) {
              driveUrl = gasJson.driveUrl;
              fileId = gasJson.fileId;
            }
          }
        } catch (e) {
          console.error("Lỗi khi tải tệp lên Google Drive:", e);
        }
      }

      const finalFormData = {
        ...formData,
        ...(driveUrl ? { _driveUrl: driveUrl } : {}),
        ...(fileId ? { _driveFileId: fileId } : {})
      };

      // Save metadata to Supabase
      await onContractSaved({
        templateId: selectedTemplate,
        partyAId: selectedPartyAId,
        partyBId: selectedPartyBId,
        formData: finalFormData,
        fileName: fileName
      });

      toast(driveUrl ? "Đã tạo hợp đồng, lưu vào hệ thống và tải lên Google Drive!" : "Đã tạo hợp đồng và lưu vào hệ thống!", "success");
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.properties?.errors?.map((e: any) => e.message).join(', ') || error.message;
      toast('Lỗi khi tạo hợp đồng: ' + errorMessage, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDateGroupChange = (groupId: string, dateStr: string) => {
    const group = dateGroups.find(g => g.id === groupId);
    if (!group) return;

    if (!dateStr) {
      setFormData(prev => {
        const next = { ...prev };
        if (group.day) next[group.day] = '';
        if (group.month) next[group.month] = '';
        if (group.year) next[group.year] = '';
        return next;
      });
      return;
    }

    const date = new Date(dateStr);
    const d = date.getDate().toString();
    const m = (date.getMonth() + 1).toString();
    const y = date.getFullYear().toString();

    setFormData(prev => {
      const next = { ...prev };
      if (group.day) next[group.day] = d;
      if (group.month) next[group.month] = m;
      if (group.year) next[group.year] = y;
      return next;
    });
  };

  return (
    <ContractFormContext.Provider value={{ selectedTemplate, formData, handleFieldChange, setActiveInvoiceTag, setIsInvoiceSelectorOpen }}>
      <div className="flex flex-col h-full gap-1">
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-between bg-card-dark p-2 rounded-2xl shadow-sm border border-border-dark">
          <div className="space-y-0 text-left">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PlusSquare className="size-5 text-primary" />
              Tạo Hợp Đồng Chuyên Nghiệp
            </h2>
            <p className="text-[11px] text-text-dim">Soạn thảo hợp đồng nhanh chóng với mẫu có sẵn</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                updateContractForm({
                  selectedTemplate: '',
                  tags: [],
                  templateFormData: {
                    'HDNT': {},
                    'HDTC': {},
                    'HDCM': {}
                  },
                  selectedPartyAId: '',
                  selectedPartyBId: '',
                  templateBuffer: null,
                  vtLinks: {}
                });
              }}
              className="px-3 py-1.5 text-xs font-medium text-text-dim hover:bg-white/5 hover:text-white rounded-lg transition-colors border border-border-dark"
            >
              Làm mới
            </button>
            {selectedTemplate && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold hover:bg-primary/30 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                {isGenerating ? 'Đang tạo...' : 'Xuất Hợp Đồng (.docx)'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0">
          {/* Left Column: Template & Parties Selection */}
          <div className="lg:col-span-4 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            <div className="card bg-transparent border-none p-2 space-y-2">
              <h3 className="font-black text-white text-[10px] uppercase tracking-wider flex items-center gap-2">
                <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="size-3.5" />
                </div>
                1. Mẫu văn bản
              </h3>
              <div className="space-y-1">
                {CONTRACT_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTemplateChange(t.id)}
                    className={cn(
                      "w-full text-left p-2 rounded-xl border transition-all flex items-center justify-between group",
                      selectedTemplate === t.id
                        ? "bg-primary/10 border-primary/50 shadow-sm"
                        : "bg-white/5 border-border-dark hover:border-primary/50 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "size-8 rounded-lg flex items-center justify-center border",
                        selectedTemplate === t.id ? "bg-primary text-white border-primary" : "bg-white/5 text-text-dim group-hover:bg-primary/10 group-hover:text-primary border-border-dark"
                      )}>
                        <FileText className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className={cn("text-xs font-black leading-tight", selectedTemplate === t.id ? "text-primary" : "text-white")}>{t.name}</span>
                        <span className="text-[9px] text-text-dim font-mono">{t.file}</span>
                      </div>
                    </div>
                    {selectedTemplate === t.id && (
                      <div className="size-4 bg-primary rounded-full flex items-center justify-center">
                        <Check className="size-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="card bg-transparent border-none p-2 space-y-2">
              <h3 className="font-black text-white text-[10px] uppercase tracking-wider flex items-center gap-2">
                <div className="size-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Users className="size-3.5" />
                </div>
                2. Các bên liên quan
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-text-dim uppercase tracking-widest pl-1 block">Bên A (Chủ đầu tư/Thuê)</label>
                  <div className="relative group">
                    <select
                      value={selectedPartyAId}
                      onChange={(e) => handlePartyChange(e.target.value, 'A')}
                      disabled={!selectedTemplate}
                      className="w-full pl-8 pr-4 py-1.5 bg-sidebar-dark border border-border-dark rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer disabled:opacity-50 text-white"
                    >
                      <option value="">-- Chọn Bên A --</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 size-4 flex items-center justify-center font-black text-primary text-[9px] bg-primary/10 rounded border border-primary/20">A</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-text-dim uppercase tracking-widest pl-1 block">Bên B (Đơn vị thực hiện/Cho thuê)</label>
                  <div className="relative group">
                    <select
                      value={selectedPartyBId}
                      onChange={(e) => handlePartyChange(e.target.value, 'B')}
                      disabled={!selectedTemplate}
                      className="w-full pl-8 pr-4 py-1.5 bg-sidebar-dark border border-border-dark rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer disabled:opacity-50 text-white"
                    >
                      <option value="">-- Chọn Bên B --</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 size-4 flex items-center justify-center font-black text-primary text-[9px] bg-primary/10 rounded border border-primary/20">B</div>
                  </div>
                </div>

                {categorizedTags.moved.length > 0 && (
                  <div className="pt-2 border-t border-border-dark space-y-2">
                    <div className="grid grid-cols-1 gap-2">
                      {categorizedTags.moved.map(tag => (
                        <TagInput
                          key={tag}
                          tag={tag}
                          value={formData[tag] || ''}
                          activeParty={vtLinks[tag]}
                          onChange={(val) => handleFieldChange(tag, val)}
                          onOpenSelector={() => {
                            setActiveInvoiceTag?.(tag);
                            setIsInvoiceSelectorOpen?.(true);
                          }}
                          onAutoFill={(party) => {
                            const partnerId = party === 'A' ? selectedPartyAId : selectedPartyBId;
                            const partner = partners.find(p => p.id === partnerId);
                            if (partner) {
                              const val = abbreviateCompanyName(partner.name);
                              handleFieldChange(tag, val);
                              setVtLinks(p => ({ ...p, [tag]: party }));
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {(selectedTemplate === 'HDNT' || selectedTemplate === 'HDTC' || selectedTemplate === 'HDCM') && (
                  <div className="pt-3 border-t border-border-dark space-y-3 text-left">
                    <h4 className="text-[10px] font-black uppercase text-white tracking-wider flex items-center gap-1.5 justify-start">
                      <PenTool className="size-3.5 text-primary" />
                      Hiệu Chỉnh Điều Khoản {selectedTemplate === 'HDNT' ? 'HĐNT' : selectedTemplate === 'HDTC' ? 'HĐTC' : 'HĐCM'}
                    </h4>
                    
                    <div className="space-y-3">
                      {/* Điều 4 */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-text-dim tracking-wider">
                          Điều 4: Phương thức nghiệm thu
                        </label>
                        <textarea
                          className="w-full min-h-[60px] bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none transition-all custom-scrollbar resize-y leading-relaxed font-sans"
                          value={formData['dieu4_content'] || ''}
                          onChange={(e) => handleFieldChange('dieu4_content', e.target.value)}
                          placeholder="Nhập nội dung Điều 4..."
                        />
                      </div>

                      {/* Điều 5 */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-text-dim tracking-wider">
                          Điều 5: Phương thức thanh toán
                        </label>
                        <textarea
                          className="w-full min-h-[60px] bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none transition-all custom-scrollbar resize-y leading-relaxed font-sans"
                          value={formData['dieu5_content'] || ''}
                          onChange={(e) => handleFieldChange('dieu5_content', e.target.value)}
                          placeholder="Nhập nội dung Điều 5..."
                        />
                      </div>

                      {/* Điều 6.1 */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-text-dim tracking-wider">
                          Điều 6.1: Trách nhiệm Bên A
                        </label>
                        <textarea
                          className="w-full min-h-[90px] bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none transition-all custom-scrollbar resize-y leading-relaxed font-sans"
                          value={formData['dieu6_a_content'] || ''}
                          onChange={(e) => handleFieldChange('dieu6_a_content', e.target.value)}
                          placeholder="Nhập trách nhiệm Bên A..."
                        />
                      </div>

                      {/* Điều 6.2 */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-text-dim tracking-wider">
                          Điều 6.2: Trách nhiệm Bên B
                        </label>
                        <textarea
                          className="w-full min-h-[90px] bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none transition-all custom-scrollbar resize-y leading-relaxed font-sans"
                          value={formData['dieu6_b_content'] || ''}
                          onChange={(e) => handleFieldChange('dieu6_b_content', e.target.value)}
                          placeholder="Nhập trách nhiệm Bên B..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Data Entry */}
          <div className="lg:col-span-8 flex flex-col min-h-0">
            {!selectedTemplate ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-sidebar-dark rounded-2xl border-2 border-dashed border-border-dark">
                <div className="size-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                  <PlusSquare className="size-10 text-text-dim" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Sẵn sàng khởi tạo</h4>
                <p className="text-sm text-text-dim max-w-sm">Vui lòng chọn một mẫu hợp đồng từ danh sách bên trái để bắt đầu nhập liệu và phát hiện các trường dữ liệu tự động.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col bg-sidebar-dark relative rounded-2xl overflow-hidden border border-border-dark shadow-sm min-h-0">
                {/* Header */}
                <div className="bg-card-dark border-b border-border-dark px-4 py-3 flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center font-black text-sm shadow-md">3</div>
                    <div>
                      <h3 className="font-black text-sm text-white tracking-tight">Soạn thảo trực quan trên A4</h3>
                      <p className="text-[10px] text-text-dim">Nhập dữ liệu trực tiếp vào các ô trống nét đứt trong văn bản</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-wider">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Chế độ soạn thảo trực tiếp
                  </div>
                </div>

                {/* A4 Scrollable Container */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-stone-950/60 custom-scrollbar flex flex-col justify-start min-h-0">

                  <div className="w-full max-w-[800px] mx-auto bg-white text-stone-900 shadow-[0_10px_35px_rgba(0,0,0,0.5)] border border-stone-200 rounded-lg p-8 md:p-14 font-serif text-[13px] leading-relaxed relative select-text mb-6">
                    <div className="absolute right-8 top-8 text-[9px] font-sans font-bold text-stone-400 border border-stone-300 px-2 py-0.5 rounded uppercase tracking-widest select-none pointer-events-none">
                      Khổ A4 • Bản nháp
                    </div>

                    {selectedTemplate === 'GDNTT' && renderGdnDocument()}
                    {selectedTemplate === 'HDNT' && renderHDNTDocument()}
                    {selectedTemplate === 'HDTC' && renderHDTCDocument()}
                    {selectedTemplate === 'HDCM' && renderHDCMDocument()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ContractFormContext.Provider>
  );
};

const PartnersView = ({ partners, onEdit, onBatchEdit, onDelete }: {
  partners: Partner[],
  onEdit: (p: Partner) => void,
  onBatchEdit: () => void,
  onDelete: (id: string) => void
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddressTool, setShowAddressTool] = useState(false);
  const [convInput, setConvInput] = useState('');
  const [convResult, setConvResult] = useState<any>(null);

  // State cho Context Menu
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, partner: Partner | null } | null>(null);

  const filteredPartners = partners.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.taxCode.includes(searchTerm) ||
    (p.representative && p.representative.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleContextMenu = (e: React.MouseEvent, partner: Partner) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, partner });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleConvert = (val: string) => {
    setConvInput(val);
    if (val.trim().length > 5) {
      setConvResult(smartConvertAddress(val));
    } else {
      setConvResult(null);
    }
  };

  return (
    <div className="space-y-6" onClick={closeContextMenu}>
      <div className="flex justify-between items-center bg-card-dark p-6 rounded-[24px] border border-border-dark shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Users className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tighter uppercase">Đối tác & Khách hàng</h2>
            <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mt-1">
              {partners.length} Công ty liên kết
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              type="text"
              placeholder="Tìm kiếm đối tác..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-2.5 bg-sidebar-dark border border-border-dark rounded-2xl text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all w-72 text-white placeholder:text-text-dim"
            />
          </div>
          <div className="w-px h-8 bg-border-dark" />
          <button
            onClick={() => setShowAddressTool(!showAddressTool)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border shadow-sm",
              showAddressTool
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                : "bg-white/5 border-border-dark text-text-dim hover:text-white hover:bg-white/10"
            )}
          >
            <MapPin className="size-4" />
            AI Address
          </button>
          <button
            onClick={() => onEdit({ id: 'new', name: '', taxCode: '', address: '' })}
            className="btn-primary"
          >
            <Plus className="size-4" />
            THÊM MỚI
          </button>
          <button
            onClick={onBatchEdit}
            className="btn-secondary"
          >
            <Edit2 className="size-4" />
            CHỈNH SỬA
          </button>
        </div>
      </div>

      {/* Address Converter Tool - 3 Parts Output */}
      <AnimatePresence>
        {showAddressTool && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-8 bg-sidebar-dark border-border-dark shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 size-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <MapPin className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-widest">Chuyển đổi địa chỉ 2 cấp</h3>
                    <p className="text-text-dim text-[10px] font-bold uppercase tracking-widest mt-1">Chuẩn hóa dữ liệu theo nghị định mới nhất 2025</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-text-dim uppercase tracking-widest px-1">Nhập địa chỉ cần phân tách</div>
                  <textarea
                    value={convInput}
                    onChange={(e) => handleConvert(e.target.value)}
                    placeholder="Ví dụ: Ấp 5, Phạm Văn Hai, Bình Chánh, TP.HCM..."
                    className="w-full px-4 py-4 bg-white/5 border border-border-dark rounded-xl text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all min-h-[120px] resize-none text-white"
                  />
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-black text-text-dim uppercase tracking-widest px-1">Phân tách thông minh (Real-time)</div>
                  {convResult ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 border border-border-dark rounded-2xl">
                          <div className="text-[9px] font-bold text-text-dim uppercase mb-2">1. Xã/Phường gốc</div>
                          <div className="text-sm font-black text-white">{convResult.oldWard}</div>
                        </div>
                        <div className="p-4 bg-white/5 border border-border-dark rounded-2xl">
                          <div className="text-[9px] font-bold text-text-dim uppercase mb-2">2. Địa chỉ cũ (3 cấp)</div>
                          <div className="text-xs font-bold text-text-dim leading-relaxed">
                            {convResult.oldFullAddress || `${convResult.detail ? convResult.detail + ', ' : ''}${convResult.oldWard}, ${convResult.oldDistrict}, ${convResult.province}`}
                          </div>
                        </div>
                      </div>

                      <div className="p-5 bg-orange-500/5 border border-orange-500/20 rounded-2xl shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <CheckCircle2 className="size-16 text-orange-500" />
                        </div>
                        <div className="text-[9px] font-black text-orange-500 uppercase mb-2 tracking-widest">3. Kết quả đã chuyển đổi (Sang 2 cấp)</div>
                        <div className="text-base font-black text-white mb-3 leading-relaxed">{convResult.fullAddress}</div>
                        <div className="flex gap-2">
                          <div className={cn(
                            "rounded px-2 py-1 text-[10px] font-bold border uppercase tracking-tighter",
                            convResult.isConverted ? "bg-primary/20 text-primary border-primary/30" : "bg-white/5 text-text-dim border-border-dark"
                          )}>
                            {convResult.isConverted ? "Khớp bảng ánh xạ 2025" : "Chưa có dữ liệu chính xác"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 border-2 border-dashed border-border-dark rounded-2xl flex flex-col items-center justify-center text-text-dim gap-2">
                      <MapPin className="size-8 opacity-20" />
                      <div className="text-xs font-bold uppercase tracking-widest opacity-40">Chờ nhập dữ liệu…</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.4)] border border-white/10 bg-card-dark/80 backdrop-blur-xl rounded-[40px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-8 py-6 text-[11px] font-black text-primary uppercase tracking-[0.25em] w-[22%]">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 opacity-70" /> Thông tin công ty
                  </div>
                </th>
                <th className="px-8 py-6 text-[11px] font-black text-primary uppercase tracking-[0.25em] w-[35%]">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 opacity-70" /> Địa chỉ liên hệ
                  </div>
                </th>
                <th className="px-8 py-6 text-[11px] font-black text-primary uppercase tracking-[0.25em] w-[15%]">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 opacity-70" /> Tài khoản thanh toán
                  </div>
                </th>
                <th className="px-8 py-6 text-[11px] font-black text-primary uppercase tracking-[0.25em] w-[18%]">
                  <div className="flex items-center gap-2">
                    <UserCheck className="size-4 opacity-70" /> Đại diện pháp luật
                  </div>
                </th>
                <th className="py-6 pl-8 pr-[60px] text-[11px] font-black text-primary uppercase tracking-[0.25em] text-right w-[10%]">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Users className="size-16 text-white" />
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-white">Chưa có dữ liệu đối tác</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPartners.map((partner) => (
                  <tr
                    key={partner.id}
                    onContextMenu={(e) => handleContextMenu(e, partner)}
                    className="hover:bg-primary/5 transition-all duration-300 group relative"
                  >
                    <td className="px-8 py-8 relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative z-10">
                        <div className="font-bold text-white group-hover:text-primary transition-colors text-[15px] tracking-tight leading-tight mb-2">
                          {partner.name}
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg group-hover:border-primary/30 transition-all">
                          <Hash className="size-3 text-primary/60" />
                          <span className="text-[12px] font-black text-text-dim uppercase tracking-widest">MST: {partner.taxCode}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-8">
                      <div className="space-y-4 max-w-md">
                        <div className="flex gap-3 group/item">
                          <div className="shrink-0 size-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover/item:border-primary/20 transition-all">
                            <History className="size-3.5 text-text-dim" />
                          </div>
                          <div className="text-[13px] font-bold text-text-dim leading-relaxed group-hover:text-white/80 transition-colors">
                            <span className="text-[9px] font-black text-primary/40 uppercase block mb-1 tracking-widest">Địa chỉ cũ</span>
                            {partner.address}
                          </div>
                        </div>
                        {partner.addressPostMerger && (
                          <div className="flex gap-3 group/item p-4 bg-primary/5 rounded-2xl border border-primary/20 shadow-[0_10px_30px_rgba(249,115,22,0.1)]">
                            <div className="shrink-0 size-8 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                              <MapPin className="size-3.5 text-primary" />
                            </div>
                            <div className="text-[13px] font-black text-primary leading-relaxed">
                              <span className="text-[9px] font-black text-primary/60 uppercase block mb-1 tracking-widest">Địa chỉ mới (2025)</span>
                              {partner.addressPostMerger}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-8 py-8">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-white font-black text-sm group-hover:text-primary transition-colors">
                          <CreditCard className="size-3.5 opacity-50" />
                          {partner.accountNumber || '---'}
                        </div>
                        <div className="text-[10px] text-text-dim uppercase font-black tracking-widest leading-tight pl-5 opacity-60">
                          {partner.bankName || '---'}
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-8 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-full bg-gradient-to-tr from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-lg group-hover:border-primary/30 transition-all">
                            <UserIcon className="size-4 text-text-dim group-hover:text-primary" />
                          </div>
                          <div>
                            <div className="text-white font-black text-sm flex items-center gap-1.5">
                              <span className="text-primary/60">
                                {(() => {
                                  const g = partner.gender?.toLowerCase();
                                  if (g === 'nam' || g === 'm' || g === 'male' || g === 'ông') return 'Ông.';
                                  if (g === 'nữ' || g === 'f' || g === 'female' || g === 'bà') return 'Bà.';
                                  return '';
                                })()}
                              </span>
                              {partner.representative || '---'}
                            </div>
                            <div className="text-[10px] text-text-dim font-black uppercase mt-1 italic tracking-wider opacity-60">
                              {partner.position || 'Giám đốc'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-6 pl-8 pr-[60px] text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                        <button
                          onClick={() => onEdit(partner)}
                          className="size-11 bg-white/5 border border-white/10 text-text-dim rounded-2xl flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all shadow-xl active:scale-90"
                          title="Chỉnh sửa hồ sơ"
                        >
                          <Edit3 className="size-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onDelete(partner.id);
                          }}
                          className="size-11 bg-red-500/5 border border-red-500/10 text-text-dim rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-xl active:scale-90"
                          title="Xóa đối tác"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Context Menu Thật sự - Được gắn vào body hoặc container riêng để tránh bị cắt bởi table overflow */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[9999] bg-card-dark border border-border-dark shadow-2xl rounded-xl py-2 w-44 overflow-hidden"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 border-b border-border-dark mb-1">
              <div className="text-[9px] font-bold text-text-dim uppercase truncate" title={contextMenu.partner?.name}>
                {contextMenu.partner?.name}
              </div>
            </div>
            <button
              onClick={() => {
                if (contextMenu.partner) onEdit(contextMenu.partner);
                closeContextMenu();
              }}
              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-primary/20 hover:text-primary flex items-center gap-3 transition-colors font-medium"
            >
              <Edit2 className="size-4" />
              Chỉnh sửa
            </button>
            <button
              onClick={() => {
                if (contextMenu.partner) {
                  if (confirm(`Bạn có chắc chắn muốn xóa đối tác "${contextMenu.partner.name}"?`)) {
                    onDelete(contextMenu.partner.id);
                  }
                }
                closeContextMenu();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-3 transition-colors font-medium"
            >
              <Trash2 className="size-4" />
              Xóa đối tác
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- View: Generated Docs ---
const DocsView = ({ items, onDelete, onBulkDelete, onDeleteAll, invoices, partners }: { items: GeneratedDoc[], onDelete: (id: string) => void, onBulkDelete: (ids: string[]) => void, onDeleteAll: () => void, invoices: Invoice[], partners: Partner[] }) => {
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(d => d.id));
    }
  };

  const downloadDocZip = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDownloading(true);

    try {
      const zip = new JSZip();
      const itemsMap = new Map(items.map(d => [d.id, d]));
      const invoicesMap = new Map(invoices.map(i => [i.id, i]));
      const partnersTaxMap = new Map(partners.map(p => [p.taxCode, p]));

      for (const id of selectedIds) {
        const genDoc = itemsMap.get(id);
        if (!genDoc) continue;

        const inv = invoicesMap.get(genDoc.invoiceId);
        if (!inv) continue;

        const pA = partnersTaxMap.get(inv.extractedData?.seller?.taxCode) || {};
        const pB = partnersTaxMap.get(inv.extractedData?.buyer?.taxCode) || {};

        try {
          const templateBuffer = await getTemplateBuffer(genDoc.templateType);
          const blob = await generateDocxBlob({
            templateBuffer,
            templateType: genDoc.templateType,
            data: inv.extractedData,
            partnerA: pA,
            partnerB: pB,
            contractNumber: inv.contractNumber,
            contractDate: inv.contractDate
          });
          zip.file(genDoc.fileName, blob);
        } catch (err) {
          console.error(`Error generating doc ${genDoc.id}:`, err);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `TaiLieu_DaChon_${new Date().getTime()}.zip`);
    } catch (err: any) {
      alert("Lỗi khi tải hàng loạt: " + err.message);
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const handleBulkDelete = () => {
    if (!isDeletingBulk) {
      setIsDeletingBulk(true);
      setTimeout(() => setIsDeletingBulk(false), 3000);
      return;
    }

    console.log("handleBulkDelete logic executing with selectedIds:", selectedIds);
    if (selectedIds.length === 0) return;

    onBulkDelete(selectedIds);
    setSelectedIds([]);
    setIsDeletingBulk(false);
  };

  const confirmDeleteAll = () => {
    if (!isDeletingAll) {
      setIsDeletingAll(true);
      setTimeout(() => setIsDeletingAll(false), 3000); // Reset sau 3s nếu không bấm
      return;
    }

    console.log("confirmDeleteAll executing...");
    onDeleteAll();
    setSelectedIds([]);
    setIsDeletingAll(false);
  };

  const downloadDoc = async (genDoc: GeneratedDoc) => {
    const inv = invoices.find(i => i.id === genDoc.invoiceId);
    if (!inv) {
      alert("Không tìm thấy dữ liệu hóa đơn gốc để tạo lại file.");
      return;
    }

    setIsDownloading(genDoc.id);
    try {
      const pA = partners.find(p => p.taxCode === inv.extractedData?.seller?.taxCode) || {};
      const pB = partners.find(p => p.taxCode === inv.extractedData?.buyer?.taxCode) || {};

      const templateBuffer = await getTemplateBuffer(genDoc.templateType);
      const blob = await generateDocxBlob({
        templateBuffer,
        templateType: genDoc.templateType,
        data: inv.extractedData,
        partnerA: pA,
        partnerB: pB,
        contractNumber: inv.contractNumber,
        contractDate: inv.contractDate
      });

      saveAs(blob, genDoc.fileName);
    } catch (err: any) {
      alert("Lỗi khi tải file: " + err.message);
    } finally {
      setIsDownloading(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-card-dark rounded-xl border border-border-dark p-12 text-center">
        <div className="size-16 bg-sidebar-dark rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="text-text-dim size-8" />
        </div>
        <h3 className="text-white font-bold mb-1">Chưa có tài liệu nào</h3>
        <p className="text-text-dim text-xs">Vui lòng tạo biên bản từ tab Dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-center bg-card-dark p-4 rounded-xl border border-border-dark shadow-sm">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedIds.length === items.length && items.length > 0}
              onChange={toggleSelectAll}
              className="size-4 rounded border-border-dark text-primary focus:ring-primary bg-sidebar-dark"
            />
            <span className="text-xs font-bold text-white uppercase tracking-widest">
              Chọn tất cả ({items.length})
            </span>
          </label>
        </div>
        <button
          onClick={confirmDeleteAll}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest border",
            isDeletingAll
              ? "bg-red-600 border-red-600 text-white animate-pulse"
              : "text-red-500 hover:bg-red-50 border-red-100"
          )}
        >
          <Trash2 size={14} />
          {isDeletingAll ? "Bấm lại để xác nhận" : "Xóa tất cả"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((docItem) => (
          <div
            key={docItem.id}
            className={cn(
              "card p-4 transition-all group relative flex gap-4 border-2 bg-card-dark text-white",
              selectedIds.includes(docItem.id) ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/30" : "hover:border-primary/50 border-transparent shadow-sm"
            )}
            onClick={() => toggleSelect(docItem.id)}
          >
            <div
              className="pt-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(docItem.id)}
                onChange={() => toggleSelect(docItem.id)}
                className="size-5 rounded-md border-border-dark text-primary focus:ring-primary cursor-pointer shadow-sm bg-sidebar-dark"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="size-10 bg-primary/20 text-primary border border-primary/30 rounded flex items-center justify-center shrink-0">
                  <FileText className="size-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate pr-4 text-white" title={docItem.fileName}>{docItem.fileName}</div>
                  <div className="text-[10px] text-text-dim uppercase font-bold tracking-tight">{docItem.templateType}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-3 border-t border-border-dark">
                <span className="text-text-dim flex items-center gap-1" suppressHydrationWarning>
                  <Clock className="size-3 opacity-40" />
                  {docItem.createdAt?.toDate ? new Date(docItem.createdAt.toDate()).toLocaleDateString() : '…'}
                </span>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    disabled={isDownloading === docItem.id}
                    onClick={() => downloadDoc(docItem)}
                    className="text-primary font-bold bg-primary/20 border border-primary/30 hover:bg-primary/30 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-2"
                  >
                    {isDownloading === docItem.id ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
                    Tải về
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDelete(docItem.id);
                    }}
                    className="size-8 text-text-dim hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all flex items-center justify-center shrink-0"
                    title="Xóa tài liệu"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-sidebar-dark/95 backdrop-blur-md text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6 z-50 border border-border-dark w-fit"
          >
            <div className="flex items-center gap-3 border-r border-border-dark pr-6 mr-1">
              <div className="size-7 bg-primary rounded-full flex items-center justify-center text-[11px] font-black shadow-lg text-white">
                {selectedIds.length}
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-text-dim">Đã chọn</span>
            </div>

            <button
              onClick={downloadDocZip}
              disabled={isBulkDownloading}
              className="flex items-center gap-2 text-primary hover:text-primary/80 hover:bg-white/5 px-4 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50"
            >
              {isBulkDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download size={18} />}
              Tải về (.zip)
            </button>

            <button
              onClick={handleBulkDelete}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-widest",
                isDeletingBulk
                  ? "bg-red-600 text-white animate-pulse"
                  : "text-red-400 hover:text-red-300 hover:bg-white/5"
              )}
            >
              <Trash2 size={18} />
              {isDeletingBulk ? "Bấm lại để xóa" : "Xóa đã chọn"}
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="text-[10px] text-text-dim hover:text-white transition-all uppercase font-bold tracking-widest ml-2"
            >
              Hủy bỏ
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Bulk Export Modal ---
const BulkExportModal = ({
  invoices,
  partners,
  onClose,
  rankMap
}: {
  invoices: Invoice[],
  partners: Partner[],
  onClose: () => void,
  rankMap: Map<string, number>
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [bulkSearch, setBulkSearch] = useState("");

  const completedInvoices = invoices.filter(inv => inv.status === 'completed');

  // Sort and Enrich invoices
  const enrichedInvoices = useMemo(() => {
    return completedInvoices
      .map(inv => getEnrichedInvoice(inv, rankMap))
      .sort((a, b) => (a.computedRank || 0) - (b.computedRank || 0));
  }, [completedInvoices, rankMap]);

  // Filter invoices based on search
  const filteredInvoices = useMemo(() => {
    const term = bulkSearch.toLowerCase().trim();
    if (!term) return enrichedInvoices;

    return enrichedInvoices.filter(inv => {
      // 1. Match Invoice Number (starts with or includes)
      const invNum = (inv.computedInvoiceNumber || '').toLowerCase();
      if (invNum.includes(term)) return true;

      // 2. Match Seller/Buyer
      const seller = (inv.extractedData?.seller?.name || '').toLowerCase();
      const buyer = (inv.extractedData?.buyer?.name || '').toLowerCase();
      if (seller.includes(term) || buyer.includes(term)) return true;

      // 3. Match Original File Name (not with prefix)
      const fileName = (inv.fileName || '').toLowerCase();
      if (fileName.includes(term)) return true;

      return false;
    });
  }, [enrichedInvoices, bulkSearch]);

  const pdfList = filteredInvoices.filter(inv => inv.fileType === 'pdf');
  const xmlList = filteredInvoices.filter(inv => inv.fileType === 'xml');

  const handleSelectAll = (list: any[]) => {
    const listIds = list.map(i => i.id);
    const allSelected = listIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !listIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...listIds])));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkExport = async () => {
    if (selectedIds.length === 0) return;
    setIsExporting(true);
    setExportProgress(0);

    const zip = new JSZip();
    const folder = zip.folder("bien_ban_hang_loat");
    let successCount = 0;
    const completedInvoicesMap = new Map(completedInvoices.map(invoice => [invoice.id, invoice]));
    const partnersTaxMap = new Map(partners.map(p => [p.taxCode, p]));

    for (let i = 0; i < selectedIds.length; i++) {
      const invId = selectedIds[i];
      const inv = completedInvoicesMap.get(invId);
      if (!inv || !inv.extractedData) {
        setExportProgress(Math.round(((i + 1) / selectedIds.length) * 100));
        continue;
      }

      const pA = partnersTaxMap.get(inv.extractedData?.seller?.taxCode) || {};
      const pB = partnersTaxMap.get(inv.extractedData?.buyer?.taxCode) || {};

      let templateType = 'BB_CM';
      if (inv.extractedData?.classification) {
        if (inv.extractedData.classification.includes('VT')) templateType = 'BB_VT';
        else if (inv.extractedData.classification.includes('TC')) templateType = 'BB_TC';
      }

      try {
        const templateBuffer = await getTemplateBuffer(templateType);
        const blob = await generateDocxBlob({
          templateBuffer,
          templateType,
          data: inv.extractedData,
          partnerA: pA,
          partnerB: pB,
          contractNumber: inv.contractNumber || "",
          contractDate: inv.contractDate || ""
        });

        const safeFileName = inv.fileName.replace(/[\\/:*?"<>|]/g, '_').split('.')[0];
        const fileName = `BienBan_${safeFileName}.docx`;
        folder?.file(fileName, blob);
        successCount++;
      } catch (err) {
        console.error("Export error for invoice:", inv.fileName, err);
      }
      setExportProgress(Math.round(((i + 1) / selectedIds.length) * 100));
    }

    if (successCount === 0) {
      alert("Không có file nào được tạo thành công. Vui lòng kiểm tra lại mẫu văn bản.");
    } else {
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `DocuForge_BulkExport_${new Date().getTime()}.zip`);
    }

    setIsExporting(false);
    onClose();
  };

  const renderList = (list: any[], title: string, icon: any, color: string) => (
    <div className="flex-1 flex flex-col min-w-0 bg-card-dark rounded-2xl border border-border-dark overflow-hidden">
      <div className="px-4 py-3 bg-sidebar-dark border-b border-border-dark flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", color.replace('text-', 'bg-').concat('/10'))}>
            {React.createElement(icon, { className: cn("size-4", color) })}
          </div>
          <span className="font-black text-[10px] uppercase tracking-widest text-white">{title}</span>
          <span className="text-[10px] font-bold text-text-dim bg-white/5 px-1.5 py-0.5 rounded-md">{list.length}</span>
        </div>
        <button
          onClick={() => handleSelectAll(list)}
          className="text-[10px] font-black uppercase text-primary hover:underline"
        >
          {list.length > 0 && list.every(i => selectedIds.includes(i.id)) ? "Bỏ chọn" : "Chọn hết"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {list.length > 0 ? (
          list.map((inv, index) => (
            <div
              key={inv.id}
              onClick={() => handleToggleSelect(inv.id)}
              className={cn(
                "p-3 rounded-xl border transition-all cursor-pointer group hover:shadow-md",
                selectedIds.includes(inv.id)
                  ? "bg-card-dark border-primary shadow-lg ring-1 ring-primary/10"
                  : "bg-card-dark border-border-dark hover:border-border-dark/80"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "size-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                  selectedIds.includes(inv.id) ? "bg-primary border-primary shadow-sm" : "border-border-dark group-hover:border-border-dark/80"
                )}>
                  {selectedIds.includes(inv.id) && <CheckCircle2 className="size-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-xs text-white truncate mb-1">
                    {index + 1}. Hóa đơn số: {inv.computedInvoiceSymbol ? `${inv.computedInvoiceSymbol}-` : ''}{inv.computedInvoiceNumber || '---'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0",
                      inv.fileType === 'pdf' ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    )}>
                      {inv.fileType}
                    </span>
                    <span className="text-[9px] text-text-dim">•</span>
                    <span className="text-[9px] font-bold text-text-dim uppercase">HĐ: {inv.computedInvoiceNumber || '---'}</span>
                    <span className="text-[9px] text-text-dim">•</span>
                    <span className="text-[9px] font-bold text-text-dim">Ngày: {formatDisplayDate(inv.extractedData?.invoice?.date || inv.extractedData?.date || '---')}</span>
                  </div>
                </div>
                {inv.extractedData?.classification && (
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm shrink-0",
                    inv.extractedData.classification === 'BB_TC' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                      inv.extractedData.classification === 'BB_CM' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                        'bg-green-500/10 text-green-500 border border-green-500/20'
                  )}>
                    {inv.extractedData.classification === 'BB_TC' ? 'Thi công' :
                      inv.extractedData.classification === 'BB_CM' ? 'Ca máy' : 'Vật tư'}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center">
            <p className="text-[10px] font-bold uppercase text-text-dim tracking-widest">Trống</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-card-dark rounded-[32px] shadow-2xl w-full max-w-[1100px] overflow-hidden flex flex-col h-[85vh] border border-white/20"
      >
        <div className="p-6 border-b border-border-dark flex justify-between items-center bg-sidebar-dark">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
              <Download className="size-6" />
            </div>
            <div>
              <h3 className="font-black text-xl text-white tracking-tight">Xuất biên bản hàng loạt</h3>
              <p className="text-sm text-text-dim font-medium italic">Tạo tệp .zip chứa các biên bản đã được xử lý tự động</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-10 flex items-center justify-center rounded-xl text-text-dim hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Controls */}
          <div className="px-6 py-4 bg-sidebar-dark border-b border-border-dark flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-text-dim" />
              <input
                type="text"
                placeholder="Tìm theo Số CT, Tên file, Đơn vị bán..."
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-card-dark border border-border-dark rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-text-dim shadow-sm text-white"
              />
              {bulkSearch && (
                <button
                  onClick={() => setBulkSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim hover:text-white p-1"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-6 px-4">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest leading-none mb-1">Tổng cộng</span>
                <span className="text-xl font-black text-white leading-none">{completedInvoices.length}</span>
              </div>
              <div className="w-px h-8 bg-border-dark"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Đã chọn</span>
                <span className="text-xl font-black text-primary leading-none">{selectedIds.length}</span>
              </div>
            </div>
          </div>

          {/* Unified Column View */}
          <div className="flex-1 flex overflow-hidden p-6 gap-6">
            {renderList(filteredInvoices, "Danh sách hóa đơn hệ thống (PDF & XML)", Library, "text-primary")}
          </div>
        </div>

        <div className="p-8 bg-sidebar-dark border-t border-border-dark">
          {isExporting ? (
            <div className="space-y-4 max-w-md mx-auto">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <div className="text-xs font-black text-primary uppercase tracking-widest">Đang xây dựng tệp ZIP…</div>
                  <div className="text-[10px] font-bold text-text-dim">Vui lòng không đóng cửa sổ lúc này</div>
                </div>
                <div className="text-2xl font-black text-white">{exportProgress}%</div>
              </div>
              <div className="h-3 bg-border-dark rounded-full overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-primary shadow-primary/20"
                  initial={{ width: 0 }}
                  animate={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-4 max-w-2xl mx-auto">
              <button
                onClick={handleBulkExport}
                disabled={selectedIds.length === 0}
                className={cn(
                  "flex-[2] py-4 rounded-2xl font-black text-sm text-white shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group",
                  selectedIds.length > 0 ? "bg-primary hover:bg-primary/80 shadow-primary/20" : "bg-border-dark cursor-not-allowed shadow-none text-text-dim"
                )}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Download className="size-5 relative" />
                <span className="relative">XUẤT {selectedIds.length} BIÊN BẢN (.ZIP)</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-4 border-2 border-border-dark rounded-2xl font-black text-sm text-text-dim hover:bg-white/5 hover:text-white transition-all active:scale-95 shadow-sm"
              >
                HỦY
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- Constants ---

// --- Helpers ---
const getTemplateBuffer = async (templateId: string): Promise<ArrayBuffer> => {
  try {
    // Determine the best base path for templates
    let basePath = (import.meta as any).env?.BASE_URL || './';
    if (basePath === './') {
      // Fallback: try to derive from window.location for GitHub Pages subdirectories
      const pathSegments = window.location.pathname.split('/');
      // If pathname is /Quanlyhoadon/index.html or /Quanlyhoadon/, the base is /Quanlyhoadon/
      basePath = pathSegments.slice(0, -1).join('/') + '/';
    }

    if (!basePath.endsWith('/')) basePath += '/';
    const finalPath = `${basePath}templates/${templateId}.docx`.replace(/\/+/g, '/');

    console.log("Fetching template from:", finalPath);
    const res = await fetch(finalPath);
    if (!res.ok) throw new Error(`Template ${templateId} không tìm thấy trong hệ thống.`);
    return await res.arrayBuffer();
  } catch (error: any) {
    console.error("Error loading template buffer:", error);
    throw new Error(`Không thể tải mẫu [${templateId}]: ${error.message}`);
  }
};

const TAB_CONFIG: Record<Tab, { hash: string, label: string }> = {
  dashboard: { hash: 'tong-quan', label: 'Bảng điều khiển' },
  upload: { hash: 'tai-len', label: 'Tải lên hóa đơn' },
  partners: { hash: 'doi-tac', label: 'Đối tác & Khách hàng' },
  docs: { hash: 'tai-lieu-da-tao', label: 'Tài liệu đã tạo' },
  contract: { hash: 'tao-hop-dong', label: 'Tạo hợp đồng' },
  system: { hash: 'theo-doi-he-thong', label: 'Theo dõi hệ thống' }
};

// Helper to remove Vietnamese diacritics while preserving case
const removeTones = (str: string) => {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
  str = str.replace(/\u02C6|\u0306|\u031B/g, "");
  return str;
};

const fixNgocTham = (str: any) => {
  if (typeof str !== 'string' || !str) return str;
  return str.replace(/NGỌC THÁM|NGỌC THẨM/gi, (match) => {
    if (match === match.toUpperCase()) return 'NGỌC THẮM';
    if (match === match.toLowerCase()) return 'ngọc thắm';
    return 'Ngọc Thắm';
  });
};

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [dashboardSubTab, setDashboardSubTab] = useState<'invoices' | 'contracts'>('invoices');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([]);
  const [contracts, setContracts] = useState<SmartContract[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [multiPartnerEdit, setMultiPartnerEdit] = useState<{
    isOpen: boolean;
    currentIndex: number;
    drafts: Record<string, Partial<Partner>>;
    showExitConfirm: boolean;
  } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [showBulkExport, setShowBulkExport] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const timeLeftRef = useRef(0);
  const timerRef = useRef<any>(null);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [pendingReview, setPendingReview] = useState<{ file: File, docRef: any, data: any } | null>(null);
  const { toast, clearToasts, removeToast } = useToast();
  const [fileSearchTerm, setFileSearchTerm] = useState('');

  // Contract Tab States (Lifted for persistence)
  const [contractForm, setContractForm] = useState({
    selectedTemplate: '',
    tags: [] as string[],
    // Store form data separate for each template ID
    templateFormData: {} as Record<string, Record<string, string>>,
    selectedPartyAId: '',
    selectedPartyBId: '',
    templateBuffer: null as ArrayBuffer | null,
    vtLinks: {} as Record<string, 'A' | 'B' | null>
  });

  const updateContractForm = (updates: any) => {
    setContractForm(prev => ({ ...prev, ...(typeof updates === 'function' ? updates(prev) : updates) }));
  };

  const [isInvoiceSelectorOpen, setIsInvoiceSelectorOpen] = useState(false);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [activeInvoiceTag, setActiveInvoiceTag] = useState<string | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [invoiceFilterMode, setInvoiceFilterMode] = useState<'all' | 'seller' | 'buyer'>('all');
  const [selectorSearch, setSelectorSearch] = useState('');

  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    if (invoices && invoices.length > 0) {
      const sorted = [...invoices].sort((a, b) => {
        const dbDateA = a.extractedData?.invoice?.date || a.extractedData?.date;
        const dbDateB = b.extractedData?.invoice?.date || b.extractedData?.date;
        const tA = parseInvoiceDate(dbDateA) || a.createdAt?.toMillis?.() || 0;
        const tB = parseInvoiceDate(dbDateB) || b.createdAt?.toMillis?.() || 0;
        return tA - tB;
      });
      sorted.forEach((inv, index) => {
        map.set(inv.id, index + 1);
      });
    }
    return map;
  }, [invoices]);

  // Helper to get current template data
  const currentFormData = useMemo(() => {
    return contractForm.templateFormData[contractForm.selectedTemplate] || {};
  }, [contractForm.templateFormData, contractForm.selectedTemplate]);

  const setContractFormData = (updater: any) => {
    setContractForm(prev => {
      const currentId = prev.selectedTemplate;
      if (!currentId) return prev;

      const oldData = prev.templateFormData[currentId] || {};
      const newData = typeof updater === 'function' ? updater(oldData) : updater;

      return {
        ...prev,
        templateFormData: {
          ...prev.templateFormData,
          [currentId]: newData
        }
      };
    });
  };

  // --- Supabase Database Fetch Functions ---
  const fetchPartners = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('owner_id', uid)
        .order('updated_at', { ascending: false });
      if (error) {
        throw error;
      }
      setPartners((data || []).map(p => ({
        id: p.id,
        name: fixNgocTham(p.name),
        taxCode: p.tax_code,
        address: p.address,
        addressPostMerger: p.address_post_merger,
        accountNumber: p.account_number,
        bankName: p.bank_name,
        representative: p.representative,
        position: p.position,
        gender: p.gender,
        ownerId: p.owner_id,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      } as Partner)));
    } catch (err: any) {
      console.error("Lỗi khi tải danh sách đối tác:", err.message);
    }
  };

  const fetchInvoices = async (uid: string) => {
    try {
      setIsLoadingInvoices(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('owner_id', uid)
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }

      // Automatically identify and delete duplicate PDF invoices if an XML invoice exists with the same number and total amount
      const rawList = data || [];
      const xmlInvoicesMap = new Map<string, any>();
      const pdfDuplicatesToDelete: string[] = [];

      // Step 1: Record XML invoices
      rawList.forEach(inv => {
        if (inv.file_type === 'xml') {
          let num = inv.extracted_data?.invoice?.number || inv.extracted_data?.soHoaDon || '';
          if (!num) {
            const match = inv.file_name?.match(/(\d+)(?=\.(pdf|xml)$)/i);
            if (match && match[1]) num = match[1];
          }
          const displayNum = num ? num.toString().replace(/^0+/, '') : '';
          const amt = Number(inv.total_amount || inv.extracted_data?.totals?.grandTotal || 0);

          if (displayNum && amt > 0) {
            const key = `${displayNum}_${amt}`;
            xmlInvoicesMap.set(key, inv);
          }
        }
      });

      // Step 2: Identify duplicate PDFs
      rawList.forEach(inv => {
        if (inv.file_type === 'pdf') {
          let num = inv.extracted_data?.invoice?.number || inv.extracted_data?.soHoaDon || '';
          if (!num) {
            const match = inv.file_name?.match(/(\d+)(?=\.(pdf|xml)$)/i);
            if (match && match[1]) num = match[1];
          }
          const displayNum = num ? num.toString().replace(/^0+/, '') : '';
          const amt = Number(inv.total_amount || inv.extracted_data?.totals?.grandTotal || 0);

          if (displayNum && amt > 0) {
            const key = `${displayNum}_${amt}`;
            if (xmlInvoicesMap.has(key)) {
              pdfDuplicatesToDelete.push(inv.id);
            }
          }
        }
      });

      if (pdfDuplicatesToDelete.length > 0) {
        console.log("Dọn dẹp hóa đơn PDF trùng lặp từ Supabase:", pdfDuplicatesToDelete);
        supabase.from('invoices').delete().in('id', pdfDuplicatesToDelete).then(({ error: delErr }) => {
          if (delErr) console.error("Lỗi dọn dẹp hóa đơn PDF trùng lặp:", delErr.message);
        });
      }

      const filteredList = rawList.filter(inv => !pdfDuplicatesToDelete.includes(inv.id));

      setInvoices(filteredList.map(inv => {
        const rawExtData = inv.extracted_data;
        const extractedData = rawExtData ? { ...rawExtData } : undefined;
        if (extractedData) {
          if (extractedData.seller) {
            extractedData.seller = {
              ...extractedData.seller,
              name: fixNgocTham(extractedData.seller.name)
            };
          }
          if (extractedData.buyer) {
            extractedData.buyer = {
              ...extractedData.buyer,
              name: fixNgocTham(extractedData.buyer.name)
            };
          }
        }
        return {
          id: inv.id,
          fileName: inv.file_name,
          fileType: inv.file_type,
          fileURL: extractedData?.fileURL || inv.file_name,
          status: inv.status,
          contractNumber: inv.contract_number,
          contractDate: inv.contract_date,
          sellerName: fixNgocTham(inv.seller_name),
          buyerName: fixNgocTham(inv.buyer_name),
          sellerTaxCode: inv.seller_tax_code,
          buyerTaxCode: inv.buyer_tax_code,
          type: inv.type,
          category: inv.category,
          totalAmount: inv.total_amount,
          extractedData,
          lineItems: inv.line_items,
          ownerId: inv.owner_id,
          createdAt: { toMillis: () => new Date(inv.created_at).getTime() } as any,
          updatedAt: inv.updated_at
        } as Invoice;
      }));
    } catch (err: any) {
      console.error("Lỗi khi tải danh sách hóa đơn:", err.message);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const fetchGeneratedDocs = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('generated_docs')
        .select('*')
        .eq('owner_id', uid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGeneratedDocs((data || []).map(d => ({
        id: d.id,
        invoiceId: d.invoice_id,
        templateType: d.template_type,
        fileName: d.file_name,
        downloadUrl: d.download_url,
        ownerId: d.owner_id,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      } as GeneratedDoc)));
    } catch (err: any) {
      console.error("Lỗi khi tải danh sách biên bản:", err.message);
    }
  };

  const fetchContracts = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('owner_id', uid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setContracts((data || []).map(c => ({
        id: c.id,
        templateId: c.template_id,
        partyAId: c.party_a_id,
        partyBId: c.party_b_id,
        formData: c.form_data,
        fileName: c.file_name,
        ownerId: c.owner_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      } as SmartContract)));
    } catch (err: any) {
      console.error("Lỗi khi tải danh sách hợp đồng:", err.message);
    }
  };

  const handleContractFieldChange = (tag: string, val: string) => {
    const upperTag = tag.toUpperCase();
    const tags = contractForm.tags || [];

    const isTableTag = (upperTag.includes('BANG') || upperTag.includes('TABLE')) &&
      !upperTag.includes('BANG_CHU') && !upperTag.includes('BANGCHU');

    // Check if this is a currency/number field
    const isCurrencyField = !isTableTag && [
      'GIATRI', 'GIA_TRI', 'SO_TIEN', 'TONG_TIEN', 'THANH_TIEN', 'PHI', 'PHIDICHVU', 'GIA_TRI_HD', 'GIATRIHOPDONG'
    ].some(v => upperTag.includes(v));

    let finalVal = val;
    let autoWords = '';

    if (isCurrencyField) {
      // Format with thousands separator
      finalVal = formatThousands(val);

      // Calculate words if possible
      const numericString = val.replace(/\D/g, '');
      if (numericString) {
        const num = parseInt(numericString, 10);
        if (!isNaN(num)) {
          autoWords = numberToVietnameseWords(num);
        }
      }
    }

    setContractFormData((prev: Record<string, string>) => {
      const next = { ...prev, [tag]: finalVal };

      // If we generated words, try to find a word field to populate
      if (autoWords) {
        const wordTag = tags.find(t => {
          const u = t.toUpperCase();
          return (u.includes('BANG_CHU') || u.includes('BANGCHU')) && !u.includes('LICH');
        });
        if (wordTag) {
          next[wordTag] = autoWords;
        }
      }

      return next;
    });

    if (contractForm.vtLinks[tag]) {
      setContractForm(prev => ({
        ...prev,
        vtLinks: { ...prev.vtLinks, [tag]: null }
      }));
    }
  };

  const handleContractInvoiceIntegration = (invoiceIds: string[]) => {
    if (!activeInvoiceTag) return;

    const selectedDatas = invoices.filter(inv => invoiceIds.includes(inv.id));
    if (selectedDatas.length === 0) return;

    // Map selected invoices to structured JSON array and save under _invoicesList
    const mappedInvoices = selectedDatas.map(inv => {
      const data = (inv as any).extractedData || {};
      const number = data.invoice?.number || (inv as any).invoiceNo || (inv as any).invoice_number || '';
      const date = data.invoice?.date || (inv as any).invoiceDate || (inv as any).invoice_date || '';
      const amount = data.totals?.grandTotal || data.totals?.totalAmount || (inv as any).totalAmount || (inv as any).total_amount || 0;
      const note = data.seller?.name || (inv as any).sellerName || (inv as any).seller_name || '';
      return {
        id: inv.id || Math.random().toString(36).substring(2, 9),
        number,
        date,
        amount,
        note
      };
    });
    setContractFormData((prev: any) => ({
      ...prev,
      _invoicesList: JSON.stringify(mappedInvoices)
    }));

    const template = contractForm.selectedTemplate;
    const isSpecialContract = template === 'HDNT' || template === 'HDCM';

    // --- Smart Extraction from Invoice Content ---
    const allItems: any[] = [];
    selectedDatas.forEach(inv => {
      const data = inv.extractedData || {};
      const items = data.items || data.lineItems || inv.lineItems || [];
      allItems.push(...items);
    });
    const allDescriptions = allItems.map(item => (item.description || item.name || '')).join(' ');

    if (allDescriptions && !isSpecialContract) {
      const smartUpdates: Record<string, string> = {};
      const currentTags = contractForm.tags || [];

      // 0. RESET LOGIC: Identify and reset all autofill-capable tags first
      const autofillKeys = [
        'TENCONGTRINH', 'TEN_CONGTRINH',
        'GOITHAU', 'GOI_THAU',
        'DIADIEM', 'DIA_DIEM',
        'SO_HD', 'SO_HOPDONG', 'SOHOPDONG', 'SOHD'
      ];

      currentTags.forEach(tag => {
        const u = tag.toUpperCase();
        const isDateContract = (u.startsWith('NGAY') || u.startsWith('DAY') || u.startsWith('THANG') || u.startsWith('MONTH') || u.startsWith('NAM') || u.startsWith('YEAR')) &&
          (u.includes('KY') || u.includes('HD') || u.includes('HOPDONG') || u.endsWith('KY'));
        if (autofillKeys.includes(u) || isDateContract) {
          smartUpdates[tag] = '';
        }
      });

      // 1. PROJECT NAME / TÊN CÔNG TRÌNH
      // Improved regex to avoid grabbing trailing garbage or other fields
      const projectMatch = allDescriptions.match(/(?:Dự án|Tên dự án|Công trình|Tên công trình|Dự án đầu tư):\s*((?:(?!Địa điểm|Địa chỉ|Đại điểm|Tại|Gói thầu|Hạng mục|Hợp đồng|Số HĐ|Số:|Giá trị|Khối lượng|Quyết toán|Thanh toán).)+)/i);
      if (projectMatch) {
        let val = projectMatch[1].trim();
        // Strict cleanup of unwanted trailers
        val = val.replace(/[\s\-\,\.:]+$/, '').trim();
        // If it still ends with a minus surrounded by spaces, clean it
        if (val.endsWith(' -')) val = val.substring(0, val.length - 2).trim();

        const tag = currentTags.find(t => {
          const u = t.toUpperCase();
          return u === 'TENCONGTRINH' || u === 'TEN_CONGTRINH';
        });
        if (tag) smartUpdates[tag] = val;
      }

      // 2. PACKAGE / GÓI THẦU
      const packageMatch = allDescriptions.match(/(?:Gói thầu|Hạng mục):\s*((?:(?!Dự án|Tên dự án|Công trình|Tên công trình|Địa điểm|Địa chỉ|Đại điểm|Tại|Hợp đồng|Giá trị|Khối lượng).)+)/i);
      if (packageMatch) {
        let val = packageMatch[1].trim();
        val = val.replace(/[\s\-\,\.:]+$/, '').trim();
        if (val.endsWith(' -')) val = val.substring(0, val.length - 2).trim();

        const tag = currentTags.find(t => {
          const u = t.toUpperCase();
          return u === 'GOITHAU' || u === 'GOI_THAU';
        });
        if (tag) smartUpdates[tag] = val;
      }

      // 2.1 LOCATION / ĐỊA ĐIỂM
      const locationMatch = allDescriptions.match(/(?:Địa điểm|Địa chỉ|Đại điểm|Tại):\s*((?:(?!Gói thầu|Hạng mục|Dự án|Tên dự án|Công trình|Hợp đồng|Số HĐ|Số:|Giá trị|Khối lượng|Quyết toán|Thanh toán).)+)/i);
      if (locationMatch) {
        let val = locationMatch[1].trim();
        val = val.replace(/[\s\-\,\.:]+$/, '').trim();
        if (val.endsWith(' -')) val = val.substring(0, val.length - 2).trim();

        const tag = currentTags.find(t => {
          const u = t.toUpperCase();
          return u === 'DIADIEM' || u === 'DIA_DIEM' || u === 'DIADIEMCONGTRINH';
        });
        if (tag) smartUpdates[tag] = val;
      }

      // 3. SỐ HỢP ĐỒNG & NGÀY KÝ
      const contractNumMatch = allDescriptions.match(/(?:Hợp đồng Số|Số HĐ|Số):\s*([^\s;,]+)/i);
      if (contractNumMatch) {
        const val = contractNumMatch[1].trim();
        const tag = currentTags.find(t => {
          const u = t.toUpperCase();
          return ['SO_HD', 'SO_HOPDONG', 'SOHOPDONG', 'SOHD'].includes(u);
        });
        if (tag) smartUpdates[tag] = val;

        // Find date after the contract number
        const textAfterNum = allDescriptions.substring(allDescriptions.indexOf(contractNumMatch[0]));
        const dateMatch = textAfterNum.match(/ngày\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/i);
        if (dateMatch) {
          const [d, m, y] = dateMatch[1].split(/[\/-]/);

          const dayTag = currentTags.find(t => {
            const u = t.toUpperCase();
            return (u.startsWith('NGAY') || u.startsWith('DAY')) && (u.includes('KY') || u.includes('HD') || u.includes('HOPDONG') || u.endsWith('KY'));
          });
          const monthTag = currentTags.find(t => {
            const u = t.toUpperCase();
            return (u.startsWith('THANG') || u.startsWith('MONTH')) && (u.includes('KY') || u.includes('HD') || u.includes('HOPDONG') || u.endsWith('KY'));
          });
          const yearTag = currentTags.find(t => {
            const u = t.toUpperCase();
            return (u.startsWith('NAM') || u.startsWith('YEAR')) && (u.includes('KY') || u.includes('HD') || u.includes('HOPDONG') || u.endsWith('KY'));
          });

          if (dayTag) smartUpdates[dayTag] = d.padStart(2, '0');
          if (monthTag) smartUpdates[monthTag] = m.padStart(2, '0');
          if (yearTag) smartUpdates[yearTag] = y;
        }
      }

      // If we are selecting a new invoice, we ALREADY reset all possible smart-tags in smartUpdates above.
      // So regardless of whether we found a match, the setContractFormData will clear old values.
      setContractFormData(prev => ({ ...prev, ...smartUpdates }));
    }
    // --- End Smart Extraction ---

    const upperTag = activeInvoiceTag.toUpperCase();
    const isTableTag = upperTag.includes('BANG');

    if (isTableTag) {
      const template = contractForm.selectedTemplate;
      const isSpecialContract = template === 'HDNT' || template === 'HDCM';

      const safeParse = (v: any) => {
        if (typeof v === 'number') return v;
        const s = String(v || '0').replace(/[^0-9]/g, '');
        return parseInt(s, 10) || 0;
      };

      let itemsToDisplay: any[] = [];
      const rawItems: any[] = [];

      selectedDatas.forEach(inv => {
        const data = inv.extractedData || {};
        const items = data.items || data.lineItems || inv.lineItems || [];
        
        // Find VAT rate of this invoice
        const sub = Number(inv.extractedData?.totals?.subtotal) || 0;
        const vat = Number(inv.extractedData?.totals?.vatAmount) || 0;
        let r = inv.extractedData?.invoice?.vatRate;
        if (r === undefined || r === null) {
          if (sub > 0) {
            r = Math.round((vat / sub) * 100);
          }
        }
        const invoiceVatRate = (r !== undefined && r !== null && !isNaN(r)) ? r : 8;

        items.forEach((item: any) => {
          rawItems.push({
            ...item,
            invoiceVatRate
          });
        });
      });

      // Filter out items where quantity, price/unitPrice, and total are all 0
      const filteredRawItems = rawItems.filter(item => {
        const qty = safeParse(item.quantity || item.SL || '0');
        const price = safeParse(item.unitPrice || item.Don_Gia || '0');
        const totalLine = safeParse(item.total || item.Thanh_Tien || item.amount || (qty * price));
        return !(qty === 0 && price === 0 && totalLine === 0);
      });

      if (isSpecialContract) {
        // Merge items logic: Group by (Name/Description, Unit, Price, VAT rate)
        const mergedMap = new Map<string, any>();

        filteredRawItems.forEach(item => {
          const desc = (item.description || item.name || '---').trim();
          const unit = (item.unit || item.DVT || '---').trim();
          const price = safeParse(item.unitPrice || item.Don_Gia || '0');
          const itemVatRate = item.invoiceVatRate || 8;

          // Create a unique key for grouping
          const key = `${desc.toLowerCase()}|${unit.toLowerCase()}|${price}|${itemVatRate}`;

          const qty = safeParse(item.quantity || item.SL || '0');
          const totalLine = safeParse(item.total || item.Thanh_Tien || item.amount || (qty * price));

          if (mergedMap.has(key)) {
            const existing = mergedMap.get(key);
            existing.quantity += qty;
            existing.total += totalLine;
          } else {
            mergedMap.set(key, {
              description: desc,
              unit: unit,
              unitPrice: price,
              quantity: qty,
              total: totalLine,
              vatRate: itemVatRate
            });
          }
        });

        itemsToDisplay = Array.from(mergedMap.values());
      } else {
        itemsToDisplay = filteredRawItems.map(item => {
          const qty = safeParse(item.quantity || item.SL || '0');
          const price = safeParse(item.unitPrice || item.Don_Gia || '0');
          return {
            description: item.description || item.name || '---',
            unit: item.unit || item.DVT || '---',
            quantity: qty,
            unitPrice: price,
            total: safeParse(item.total || item.Thanh_Tien || item.amount || (qty * price))
          };
        });
      }

      // Calculate the actual VAT rate and tax amount from selected invoices
      let totalSubtotal = 0;
      let totalVatAmount = 0;
      const ratesList: number[] = [];

      selectedDatas.forEach(inv => {
        const sub = Number(inv.extractedData?.totals?.subtotal) || 0;
        const vat = Number(inv.extractedData?.totals?.vatAmount) || 0;
        const gTotal = Number(inv.extractedData?.totals?.grandTotal || inv.extractedData?.totals?.grand_total) || 0;

        if (sub > 0) {
          totalSubtotal += sub;
          totalVatAmount += vat;
        } else if (gTotal > 0) {
          totalSubtotal += (gTotal - vat);
          totalVatAmount += vat;
        }

        let r = inv.extractedData?.invoice?.vatRate;
        if (r === undefined || r === null) {
          if (sub > 0) {
            r = Math.round((vat / sub) * 100);
          }
        }
        if (r !== undefined && r !== null && !isNaN(r)) {
          ratesList.push(r);
        }
      });

      // Determine displayVatRate (default 8)
      const uniqueRates = Array.from(new Set(ratesList));
      let displayVatRate = 8;
      if (uniqueRates.length === 1) {
        displayVatRate = uniqueRates[0];
      } else if (totalSubtotal > 0) {
        displayVatRate = Math.round((totalVatAmount / totalSubtotal) * 100);
      } else if (uniqueRates.length > 1) {
        displayVatRate = uniqueRates[0];
      }

      // 0. Build visual table markdown based on contract type
      let markdownTable = '';
      if (template === 'HDCM') {
        markdownTable = "| STT | NỘI DUNG | ĐVT | KHỐI LƯỢNG | ĐƠN GIÁ VNĐ | THỜI GIAN THUÊ (tháng) | THÀNH TIỀN | VAT 8% | TỔNG CỘNG |\n";
        markdownTable += "|:---:|:---|:---:|---:|---:|---:|---:|---:|---:|\n";
      } else if (template === 'HDNT') {
        markdownTable = "| STT | Nội dung | ĐVT | Khối lượng | Đơn giá (VNĐ) | Thành tiền | VAT 8% | VAT 10% | Tổng cộng |\n";
        markdownTable += "|:---:|:---|:---:|---:|---:|---:|---:|---:|---:|\n";
      } else {
        markdownTable = "| STT | Nội dung hàng hóa, dịch vụ | ĐVT | Số lượng | Đơn giá | Thành tiền |\n";
        markdownTable += "|:---:|:---|:---:|---:|---:|---:|\n";
      }

      let count = 1;
      let total = 0;

      itemsToDisplay.forEach((item: any) => {
        const itemTotal = item.total;
        total += itemTotal;

        if (template === 'HDCM') {
          const vat8 = Math.round(itemTotal * 0.08);
          const tongCong = itemTotal + vat8;
          markdownTable += `| ${count++} | ${item.description} | ${item.unit} | ${item.quantity} | ${formatThousands(String(item.unitPrice))} | 1 | ${formatThousands(String(itemTotal))} | ${formatThousands(String(vat8))} | ${formatThousands(String(tongCong))} |\n`;
        } else if (template === 'HDNT') {
          const rowVatRate = item.vatRate || displayVatRate;
          const vat8 = rowVatRate === 8 ? Math.round(itemTotal * 0.08) : 0;
          const vat10 = rowVatRate === 10 ? Math.round(itemTotal * 0.10) : 0;
          const tongCong = itemTotal + vat8 + vat10;
          
          const vat8Str = rowVatRate === 8 ? (vat8 > 0 ? formatThousands(String(vat8)) : '') : '-';
          const vat10Str = rowVatRate === 10 ? (vat10 > 0 ? formatThousands(String(vat10)) : '') : '-';
          markdownTable += `| ${count++} | ${item.description} | ${item.unit} | ${item.quantity} | ${formatThousands(String(item.unitPrice))} | ${formatThousands(String(itemTotal))} | ${vat8Str} | ${vat10Str} | ${formatThousands(String(tongCong))} |\n`;
        } else {
          markdownTable += `| ${count++} | ${item.description} | ${item.unit} | ${item.quantity} | ${formatThousands(String(item.unitPrice))} | ${formatThousands(String(itemTotal))} |\n`;
        }
      });

      let grandTotalValue = total;
      if (template === 'HDCM') {
        const totalVat = Math.round(total * 0.08);
        const tongCong = total + totalVat;
        grandTotalValue = tongCong;
        markdownTable += `| | Tổng cộng | | | | | ${formatThousands(String(total))} | ${formatThousands(String(totalVat))} | ${formatThousands(String(tongCong))} |`;
      } else if (template === 'HDNT') {
        let totalVat8 = 0;
        let totalVat10 = 0;
        itemsToDisplay.forEach((item: any) => {
          const rowVatRate = item.vatRate || displayVatRate;
          const vatAmount = Math.round(item.total * rowVatRate / 100);
          if (rowVatRate === 8) {
            totalVat8 += vatAmount;
          } else if (rowVatRate === 10) {
            totalVat10 += vatAmount;
          }
        });
        const tongCong = total + totalVat8 + totalVat10;
        grandTotalValue = tongCong;
        
        const vat8Str = totalVat8 > 0 ? formatThousands(String(totalVat8)) : '-';
        const vat10Str = totalVat10 > 0 ? formatThousands(String(totalVat10)) : '-';
        
        markdownTable += `| | Tổng cộng | | | | ${formatThousands(String(total))} | ${vat8Str} | ${vat10Str} | ${formatThousands(String(tongCong))} |`;
      } else {
        const hasVAT = selectedDatas.some(inv => (Number(inv.extractedData?.totals?.vatAmount) || 0) > 0);
        if (hasVAT) {
          const totalVat = totalVatAmount > 0 ? totalVatAmount : Math.round(total * (displayVatRate / 100));
          const tongCong = total + totalVat;
          grandTotalValue = tongCong;
          markdownTable += `| | TỔNG CỘNG TIỀN HÀNG | | | | ${formatThousands(String(total))} |\n`;
          markdownTable += `| | THUẾ GIÁ TRỊ GIA TĂNG (${displayVatRate}%) | | | | ${formatThousands(String(totalVat))} |\n`;
          markdownTable += `| | TỔNG CỘNG TIỀN THANH TOÁN | | | | ${formatThousands(String(tongCong))} |`;
        } else {
          markdownTable += `| | TỔNG CỘNG | | | | ${formatThousands(String(total))} |`;
        }
      }

      // Update grand total value field
      const valueTag = contractForm.tags.find(t => {
        const u = t.toUpperCase();
        return (u.includes('GIATRI') || u.includes('SO_TIEN')) && !u.includes('BANG') && !u.includes('CHU');
      });
      if (valueTag) {
        handleContractFieldChange(valueTag, String(grandTotalValue));
      }

      handleContractFieldChange(activeInvoiceTag, markdownTable);
    } else {
      // Sum value for numeric field
      const safeParse = (v: any) => {
        if (typeof v === 'number') return v;
        let str = String(v || '0').trim();
        // If there are multiple dots, they are thousands separators, so strip them
        if ((str.match(/\./g) || []).length > 1) {
          str = str.replace(/\./g, '');
        }
        // If there are multiple commas, they are thousands separators, so strip them
        if ((str.match(/,/g) || []).length > 1) {
          str = str.replace(/,/g, '');
        }
        // Handle mixed separators (dot and comma)
        if (str.includes('.') && str.includes(',')) {
          if (str.indexOf('.') < str.indexOf(',')) {
            // Vietnamese/German: 1.234.567,89 -> strip dots, change comma to dot
            str = str.replace(/\./g, '').replace(/,/g, '.');
          } else {
            // US: 1,234,567.89 -> strip commas
            str = str.replace(/,/g, '');
          }
        } else if (str.includes(',') && !str.includes('.')) {
          // Vietnamese single comma decimal: 1234,56 -> change comma to dot
          str = str.replace(/,/g, '.');
        }
        return parseFloat(str.replace(/[^0-9.-]/g, '')) || 0;
      };

      const totalSum = selectedDatas.reduce((acc, inv) => {
        const data = inv.extractedData || {};
        const amt = data.totals?.grandTotal || data.totals?.totalAmount || data.totalAmount || inv.totalAmount || 0;
        return acc + safeParse(amt);
      }, 0);
      handleContractFieldChange(activeInvoiceTag, formatThousands(String(totalSum)));
    }

    setIsInvoiceSelectorOpen(false);
    setActiveInvoiceTag(null);
    setSelectedInvoices([]);
    toast(`Đã cập nhật dữ liệu từ ${selectedDatas.length} hóa đơn`, "success");
  };

  const getInvoiceCategory = (inv: Invoice) => {
    const r = inv.category || inv.extractedData?.classification;
    if (!r) return null;
    const t = typeof r === 'object' ? r.type : r;
    switch (t) {
      case 'BB_VT':
      case 'Vật tư':
        return 'Vật tư';
      case 'BB_CM':
      case 'Ca máy':
        return 'Ca máy';
      case 'BB_TC':
      case 'Thi công':
        return 'Thi công';
      default:
        return t;
    }
  };

  const getContractCategory = () => {
    switch (contractForm.selectedTemplate) {
      case 'HDNT': return 'Vật tư';
      case 'HDTC': return 'Thi công';
      case 'HDCM': return 'Ca máy';
      default: return null;
    }
  };
  const downloadDoc = async (genDoc: GeneratedDoc) => {
    const inv = invoices.find(i => i.id === genDoc.invoiceId);
    if (!inv) {
      toast("Không tìm thấy dữ liệu hóa đơn gốc để tạo lại file.", "error");
      return;
    }

    // Since we don't store binary in DB, we re-generate on download
    // or use downloadUrl if it existed (but here we re-generate for accuracy)
    try {
      const pA = partners.find(p => p.taxCode === inv.extractedData?.seller?.taxCode) || {};
      const pB = partners.find(p => p.taxCode === inv.extractedData?.buyer?.taxCode) || {};

      const templateBuffer = await getTemplateBuffer(genDoc.templateType);
      const blob = await generateDocxBlob({
        templateBuffer,
        templateType: genDoc.templateType,
        data: inv.extractedData,
        partnerA: pA,
        partnerB: pB,
        contractNumber: inv.contractNumber,
        contractDate: inv.contractDate
      });

      saveAs(blob, genDoc.fileName);
    } catch (err: any) {
      toast("Lỗi khi tải file: " + err.message, "error");
    }
  };

  const downloadContract = async (contract: SmartContract) => {
    try {
      const fileId = contract.formData?._driveFileId;
      const gasUrl = (import.meta as any).env.VITE_GAS_WEB_APP_URL;

      if (fileId && gasUrl) {
        toast("Đang tải tệp hợp đồng từ Google Drive...", "success");
        const gasRes = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'download_file',
            fileId: fileId
          })
        });

        if (gasRes.ok) {
          const gasJson = await gasRes.json();
          if (gasJson.success && gasJson.base64Data) {
            // Decode base64 using proper binary array buffer decoding to guarantee no structure corruption
            const byteCharacters = atob(gasJson.base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

            saveAs(blob, contract.fileName || gasJson.fileName || "Hop_Dong.docx");
            toast("Đã tải hợp đồng từ Google Drive thành công!", "success");
            return;
          }
        }
      }

      // Fallback: local client-side generation
      toast("Đang tự động khởi tạo và tải xuống bản sao hợp đồng cục bộ...", "success");
      const buffer = await fetchTemplateBuffer(contract.templateId);
      const blob = await generateDocxBlobForContract(contract.templateId, contract.formData, buffer);
      saveAs(blob, contract.fileName);
      toast("Đã tải hợp đồng!", "success");
    } catch (err: any) {
      toast("Lỗi khi tải hợp đồng: " + err.message, "error");
    }
  };

  // Sync state with Hash on mount
  useEffect(() => {
    const handleHashChange = () => {
      const currentFullHash = window.location.hash.replace('#/', '');
      const parts = currentFullHash.split('/');
      const path = parts[0];
      const sub = parts[1];
      const slug = parts[2];

      const foundTab = (Object.keys(TAB_CONFIG) as Tab[]).find(
        key => TAB_CONFIG[key].hash === path
      );

      if (foundTab) {
        setActiveTab(foundTab);

        // Handle dashboard sub-tabs
        if (foundTab === 'dashboard') {
          if (sub === 'Quan-ly-hop-dong') setDashboardSubTab('contracts');
          else if (sub === 'Quan-ly-hoa-don') setDashboardSubTab('invoices');
        }

        const actualSlug = foundTab === 'dashboard' ? (parts.length > 2 ? parts[parts.length - 1] : slug) : slug;

        // Special handling for dashboard detail view
        if (foundTab === 'dashboard' && actualSlug && !['Quan-ly-hoa-don', 'Quan-ly-hop-dong'].includes(actualSlug)) {
          const sParts = actualSlug.split('-');
          const id = sParts[sParts.length - 1];

          if (invoices.length > 0) {
            const inv = invoices.find(i => i.id === id);
            if (inv) {
              setSelectedInvoice(inv);
            }
          }
        } else if (foundTab === 'dashboard' && !slug) {
          setSelectedInvoice(null);
        }

        // Special handling for partners edit view
        if (foundTab === 'partners') {
          if (sub === 'batch' || sub === 'edit') {
            const isBatch = sub === 'batch';
            const actualSlug = slug || '';
            const subParts = actualSlug.split('-');
            const taxCode = subParts[0];

            if (partners.length > 0 && taxCode) {
              const pIndex = partners.findIndex(p => p.taxCode === taxCode);
              if (pIndex !== -1) {
                const p = partners[pIndex];
                if (isBatch) {
                  setMultiPartnerEdit(prev => (prev?.isOpen ? { ...prev, currentIndex: pIndex } : { isOpen: true, currentIndex: pIndex, drafts: {}, showExitConfirm: false }));
                  setEditingPartner(null);
                } else {
                  setEditingPartner(p);
                  setMultiPartnerEdit(null);
                }
              }
            }
          } else {
            setEditingPartner(null);
            setMultiPartnerEdit(null);
          }
        }
      } else if (!currentFullHash || currentFullHash === '/') {
        window.location.hash = `#/${TAB_CONFIG.dashboard.hash}/`;
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [invoices.length, partners.length]); // Re-run when invoices or partners are loaded to catch direct links

  // Sync Hash with Multi-Partner Edit
  useEffect(() => {
    if (multiPartnerEdit?.isOpen) {
      const currentPartner = partners[multiPartnerEdit.currentIndex];
      if (currentPartner) {
        const cleanName = removeTones(currentPartner.name).replace(/\s+/g, '').toUpperCase();
        window.location.hash = `#/${TAB_CONFIG.partners.hash}/batch/${currentPartner.taxCode}-${cleanName}/`;
      }
    }
  }, [multiPartnerEdit?.currentIndex, multiPartnerEdit?.isOpen, partners]);

  // Update Hash when Tab changes manually
  const handleTabChange = (tab: Tab) => {
    if (tab === 'dashboard') {
      const sub = dashboardSubTab === 'invoices' ? 'Quan-ly-hoa-don' : 'Quan-ly-hop-dong';
      window.location.hash = `#/${TAB_CONFIG[tab].hash}/${sub}/`;
    } else {
      window.location.hash = `#/${TAB_CONFIG[tab].hash}/`;
    }
    setActiveTab(tab);
    if (tab === 'dashboard') {
      setSelectedInvoice(null);
    }
  };

  const handleDashboardSubTabChange = (subTab: 'invoices' | 'contracts') => {
    const sub = subTab === 'invoices' ? 'Quan-ly-hoa-don' : 'Quan-ly-hop-dong';
    window.location.hash = `#/${TAB_CONFIG.dashboard.hash}/${sub}/`;
  };

  const handleInvoiceSelect = (inv: Invoice | null) => {
    const sub = dashboardSubTab === 'invoices' ? 'Quan-ly-hoa-don' : 'Quan-ly-hop-dong';
    if (inv) {
      // Get filename without extension
      const baseName = inv.fileName.replace(/\.[^/.]+$/, "");
      // Remove tones but preserve case
      const cleanFileName = removeTones(baseName);

      window.location.hash = `#/${TAB_CONFIG.dashboard.hash}/${sub}/${cleanFileName}-${inv.id}/`;
      setSelectedInvoice(inv);
    } else {
      window.location.hash = `#/${TAB_CONFIG.dashboard.hash}/${sub}/`;
      setSelectedInvoice(null);
    }
  };

  const handlePartnerEditSelect = (p: Partner | null) => {
    if (p) {
      const cleanName = removeTones(p.name).replace(/\s+/g, '').toUpperCase();
      window.location.hash = `#/${TAB_CONFIG.partners.hash}/edit/${p.taxCode}-${cleanName}/`;
      setEditingPartner(p);
      setMultiPartnerEdit(null);
    } else {
      window.location.hash = `#/${TAB_CONFIG.partners.hash}/`;
      setEditingPartner(null);
    }
  };

  const handleBatchPartnerEditStart = () => {
    if (partners.length === 0) {
      toast("Không có đối tác nào để chỉnh sửa", "info");
      return;
    }
    const firstPartner = partners[0];
    const cleanName = removeTones(firstPartner.name).replace(/\s+/g, '').toUpperCase();
    window.location.hash = `#/${TAB_CONFIG.partners.hash}/batch/${firstPartner.taxCode}-${cleanName}/`;
    setMultiPartnerEdit({
      isOpen: true,
      currentIndex: 0,
      drafts: {},
      showExitConfirm: false
    });
    setEditingPartner(null);
  };


  useEffect(() => {
    if (requestCount > 0) {
      if (timeLeftRef.current === 0) {
        timeLeftRef.current = 60;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          if (timeLeftRef.current > 0) {
            timeLeftRef.current -= 1;
          } else {
            clearInterval(timerRef.current);
            setRequestCount(0);
          }
        }, 1000);
      }
    } else {
      timeLeftRef.current = 0;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [requestCount]);


  const handleUpdatePartner = async (id: string, updates: Partial<Partner>) => {
    if (!user) return;
    try {
      const mapped = cleanObject({
        name: updates.name,
        tax_code: updates.taxCode,
        address: updates.address,
        address_post_merger: updates.addressPostMerger,
        account_number: updates.accountNumber,
        bank_name: updates.bankName,
        representative: updates.representative,
        position: updates.position,
        gender: updates.gender,
        owner_id: user.uid,
        updated_at: new Date().toISOString()
      });

      if (id === 'new') {
        const { error } = await supabase.from('partners').insert({
          ...mapped,
          created_at: new Date().toISOString()
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('partners').update(mapped).eq('id', id);
        if (error) throw error;
      }
      fetchPartners(user.uid);
    } catch (error: any) {
      console.error("Lỗi khi cập nhật đối tác:", error);
      toast("Lỗi khi cập nhật đối tác: " + error.message, "error");
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!user) return;
    console.log("handleDeletePartner called with id:", id);
    try {
      const { error } = await supabase.from('partners').delete().eq('id', id);
      if (error) throw error;
      toast("Đã xóa đối tác thành công", "success");
      fetchPartners(user.uid);
    } catch (error: any) {
      console.error("Delete partner error:", error);
      toast("Lỗi khi xóa đối tác: " + error.message, "error");
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!user) return;
    console.log("handleDeleteInvoice called with id:", id);
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      console.log("Invoice deleted successfully");
      fetchInvoices(user.uid);
    } catch (error: any) {
      console.error("Delete invoice error:", error);
      toast("Lỗi khi xóa hóa đơn: " + error.message, "error");
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!user) return;
    console.log("Attempting to delete doc:", id);
    try {
      const { error } = await supabase.from('generated_docs').delete().eq('id', id);
      if (error) throw error;
      toast('Đã xóa 1 tài liệu');
      fetchGeneratedDocs(user.uid);
    } catch (error: any) {
      console.error("Delete doc error:", error);
      toast(`Lỗi khi xóa tài liệu: ${error.message || 'Không xác định'}`, 'error');
    }
  };

  const handleBulkDeleteDocs = async (ids: string[]) => {
    if (!user || !ids || ids.length === 0) return;
    console.log("Attempting to bulk delete docs:", ids);
    try {
      setIsProcessing(true);
      const { error } = await supabase.from('generated_docs').delete().in('id', ids);
      if (error) throw error;
      toast(`Đã xóa ${ids.length} tài liệu thành công`);
      fetchGeneratedDocs(user.uid);
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast(`Lỗi khi xóa hàng loạt: ${error.message || 'Không xác định'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAllDocs = async () => {
    if (generatedDocs.length === 0) return;
    const allIds = generatedDocs.map(d => d.id);
    await handleBulkDeleteDocs(allIds);
  };

  const handleContractSave = async (data: Omit<SmartContract, 'id' | 'ownerId' | 'createdAt'>) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('contracts').insert({
        template_id: data.templateId,
        party_a_id: data.partyAId || null,
        party_b_id: data.partyBId || null,
        form_data: data.formData,
        file_name: data.fileName,
        owner_id: user.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      fetchContracts(user.uid);
    } catch (err: any) {
      console.error("Lỗi khi lưu hợp đồng:", err);
      toast("Lỗi khi lưu hợp đồng: " + err.message, "error");
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!user) return;
    if (!confirm("Bạn có chắc chắn muốn xóa hợp đồng này?")) return;

    const contract = contracts.find(c => c.id === id);

    try {
      const { error } = await supabase.from('contracts').delete().eq('id', id);
      if (error) throw error;
      toast("Đã xóa hợp đồng", "success");
      fetchContracts(user.uid);

      if (contract) {
        const gasUrl = (import.meta as any).env.VITE_GAS_WEB_APP_URL;
        const fileId = contract.formData?._driveFileId || '';
        const pdfFileId = contract.formData?._pdfFileId || '';
        const folderName = contract.formData?._contractFolder || contract.fileName?.replace(/\.docx$/i, '') || '';

        if (gasUrl && (folderName || fileId || pdfFileId)) {
          (async () => {
            try {
              const gasRes = await fetch(gasUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                  action: 'delete_contract_folder',
                  folderName,
                  fileId,
                  pdfFileId
                })
              });
              if (gasRes.ok) {
                const gasJson = await gasRes.json();
                if (gasJson.success) {
                  console.log("Đã đồng bộ xóa thành công thư mục/tệp hợp đồng trên Google Drive.");
                } else {
                  console.warn("GAS Delete Contract Warn:", gasJson.error);
                }
              }
            } catch (driveErr) {
              console.error("Lỗi xóa tệp hợp đồng trên Drive:", driveErr);
            }
          })();
        }
      }
    } catch (err: any) {
      toast("Lỗi khi xóa hợp đồng: " + err.message, "error");
    }
  };

  const handleUpdateContractFormData = async (id: string, updatedFormData: Record<string, string>) => {
    if (!user) return;
    try {
      // 1. Update Supabase with form data immediately for instant UI feedback
      const { error } = await supabase
        .from('contracts')
        .update({
          form_data: updatedFormData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
      toast("Đã cập nhật thông tin hợp đồng", "success");
      fetchContracts(user.uid);

      // 2. Lookup contract in state to trigger Drive file update
      const contract = contracts.find(c => c.id === id);
      if (!contract) return;

      const gasUrl = (import.meta as any).env.VITE_GAS_WEB_APP_URL;
      if (gasUrl) {
        // Run sync asynchronously so it doesn't block the UI
        (async () => {
          toast("Đang đồng bộ tệp lên Google Drive...", "success");
          try {
            // Fetch template binary buffer
            const buffer = await fetchTemplateBuffer(contract.templateId);

            // Generate updated DOCX Blob on the fly using latest edits
            const docxBlob = await generateDocxBlobForContract(contract.templateId, updatedFormData, buffer);
            const base64Data = await blobToBase64(docxBlob);

            const fileId = updatedFormData._driveFileId || '';
            const action = fileId ? 'update_contract_file' : 'save_contract_file';

            const gasRes = await fetch(gasUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify({
                action,
                base64Data,
                fileName: contract.fileName,
                ...(fileId ? { fileId } : {})
              })
            });

            if (gasRes.ok) {
              const gasJson = await gasRes.json();
              if (gasJson.success) {
                // Save returned drive details into form_data JSONB in Supabase
                const finalFormData = {
                  ...updatedFormData,
                  _driveUrl: gasJson.driveUrl,
                  _driveFileId: gasJson.fileId
                };

                await supabase
                  .from('contracts')
                  .update({
                    form_data: finalFormData,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', id);

                fetchContracts(user.uid);
                toast("Đã đồng bộ thành công lên Google Drive!", "success");
              } else {
                toast("Lỗi đồng bộ tệp Drive: " + (gasJson.error || "Không rõ"), "error");
              }
            } else {
              toast("Không thể kết nối đến máy chủ đồng bộ Google Drive", "error");
            }
          } catch (e: any) {
            console.error("Lỗi đồng bộ Google Drive:", e);
            toast("Lỗi khi đồng bộ Google Drive: " + e.message, "error");
          }
        })();
      }
    } catch (err: any) {
      toast("Lỗi khi cập nhật hợp đồng: " + err.message, "error");
    }
  };

  const handleBulkDeleteContracts = async (ids: string[]) => {
    if (!user || !ids || ids.length === 0) return;
    if (!confirm(`Bạn có chắc muốn xóa ${ids.length} hợp đồng?`)) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('contracts').delete().in('id', ids);
      if (error) throw error;
      toast(`Đã xóa ${ids.length} hợp đồng thành công`, "success");
      fetchContracts(user.uid);
    } catch (err: any) {
      toast("Lỗi khi xóa hàng loạt: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const runFirebaseToSupabaseMigration = async (uid: string) => {
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('./lib/firebase');

      console.log('🔄 Checking if Firebase Firestore data needs to be migrated to Supabase...');

      // Query Firestore invoices
      const invQuery = query(collection(db, 'invoices'), where('ownerId', '==', uid));
      const invSnap = await getDocs(invQuery);

      if (invSnap.empty) {
        console.log('✅ No Firebase invoices found to migrate.');
        localStorage.setItem(`migrated_to_supabase_${uid}`, 'true');
        return;
      }

      // We have data in Firebase! Let's check if Supabase is indeed empty or if we should sync
      const { data: supabaseInvs, error: sbError } = await supabase
        .from('invoices')
        .select('id')
        .eq('owner_id', uid)
        .limit(1);

      if (sbError) throw sbError;

      if (supabaseInvs && supabaseInvs.length > 0) {
        console.log('✅ Supabase already has invoice data. Skipping auto-migration.');
        localStorage.setItem(`migrated_to_supabase_${uid}`, 'true');
        return;
      }

      console.log(`🚀 Found ${invSnap.size} invoices in Firebase. Starting one-time migration to Supabase...`);
      setIsProcessing(true);
      setProcessingStatus('Đang di chuyển dữ liệu từ Firebase sang Supabase...');

      // A. Migrate Partners
      const partnerQuery = query(collection(db, 'partners'), where('ownerId', '==', uid));
      const partnerSnap = await getDocs(partnerQuery);
      console.log(`Partners to migrate: ${partnerSnap.size}`);
      for (const docSnap of partnerSnap.docs) {
        const d = docSnap.data();
        const partnerData = {
          id: docSnap.id,
          name: d.name || '',
          tax_code: d.taxCode || '',
          address: d.address || '',
          address_post_merger: d.addressPostMerger || null,
          account_number: d.accountNumber || null,
          bank_name: d.bankName || null,
          representative: d.representative || null,
          position: d.position || null,
          gender: d.gender || null,
          owner_id: uid,
          created_at: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
          updated_at: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : new Date().toISOString()
        };
        await supabase.from('partners').insert(partnerData);
      }

      // B. Migrate Invoices
      for (const docSnap of invSnap.docs) {
        const d = docSnap.data();
        const invoiceData = {
          id: docSnap.id,
          file_name: d.fileName || '',
          file_type: d.fileType || 'pdf',
          status: d.status || 'completed',
          contract_number: d.contractNumber || null,
          contract_date: d.contractDate || null,
          seller_name: d.sellerName || null,
          buyer_name: d.buyerName || null,
          seller_tax_code: d.sellerTaxCode || null,
          buyer_tax_code: d.buyerTaxCode || null,
          type: d.type || null,
          category: d.category || null,
          total_amount: d.totalAmount || null,
          extracted_data: d.extractedData || null,
          line_items: d.lineItems || null,
          owner_id: uid,
          created_at: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
          updated_at: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : new Date().toISOString()
        };
        await supabase.from('invoices').insert(invoiceData);
      }

      // C. Migrate Generated Docs
      const genDocQuery = query(collection(db, 'generated_docs'), where('ownerId', '==', uid));
      const genDocSnap = await getDocs(genDocQuery);
      console.log(`Generated docs to migrate: ${genDocSnap.size}`);
      for (const docSnap of genDocSnap.docs) {
        const d = docSnap.data();
        const genDocData = {
          id: docSnap.id,
          invoice_id: d.invoiceId || null,
          template_type: d.templateType || '',
          file_name: d.fileName || '',
          download_url: d.downloadUrl || null,
          owner_id: uid,
          created_at: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await supabase.from('generated_docs').insert(genDocData);
      }

      // D. Migrate Contracts
      const contractQuery = query(collection(db, 'contracts'), where('ownerId', '==', uid));
      const contractSnap = await getDocs(contractQuery);
      console.log(`Contracts to migrate: ${contractSnap.size}`);
      for (const docSnap of contractSnap.docs) {
        const d = docSnap.data();
        const contractData = {
          id: docSnap.id,
          template_id: d.templateId || '',
          party_a_id: d.partyAId || null,
          party_b_id: d.partyBId || null,
          form_data: d.formData || {},
          file_name: d.fileName || '',
          owner_id: uid,
          created_at: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await supabase.from('contracts').insert(contractData);
      }

      console.log('🎉 Firebase to Supabase migration completed successfully!');
      localStorage.setItem(`migrated_to_supabase_${uid}`, 'true');
      toast("Đã chuyển đổi toàn bộ dữ liệu từ Firebase sang Supabase thành công!", "success");

      // Reload Supabase data to refresh UI
      await Promise.all([
        fetchPartners(uid),
        fetchInvoices(uid),
        fetchGeneratedDocs(uid),
        fetchContracts(uid)
      ]);

    } catch (error: any) {
      console.error('❌ Error migrating data from Firebase to Supabase:', error);
      toast("Lỗi khi chuyển đổi dữ liệu từ Firebase: " + error.message, "error");
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  useEffect(() => {
    (window as any).debugInvoiceSystem = async () => {
      console.log("%c=== DIAGNOSTIC SYSTEM STARTING ===", "color: #ff007f; font-weight: bold; font-size: 14px;");

      // 1. Check Supabase Client Config
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
      console.log("1. Environment variables:");
      console.log(" - VITE_SUPABASE_URL:", supabaseUrl);
      console.log(" - VITE_SUPABASE_ANON_KEY:", supabaseAnonKey ? "Configured (Length: " + supabaseAnonKey.length + ")" : "MISSING!");

      // 2. Check Auth Status
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn("2. Firebase Auth: NOT logged in! Please log in first.");
        console.log("%c=== DIAGNOSTIC SYSTEM ENDED ===", "color: #ff007f; font-weight: bold; font-size: 14px;");
        return;
      }
      console.log("2. Firebase Auth User:");
      console.log(" - Email:", currentUser.email);
      console.log(" - UID:", currentUser.uid);

      // 3. Check Supabase REST Headers
      console.log("3. Supabase REST Headers:");
      console.log(" - Info: x-custom-user-id is managed dynamically via fetch interceptor. (supabase.rest.headers is expected to be undefined/frozen)");

      // 3b. Call RPC get_my_headers to verify what Supabase database actually receives
      console.log("3b. Inspecting headers received by Postgres:");
      try {
        const { data: headersData, error: headersError } = await supabase.rpc('get_my_headers');
        if (headersError) {
          console.error(" - RPC get_my_headers failed:", headersError);
        } else {
          console.log(" - Headers received by database:", headersData ? JSON.parse(headersData) : null);
        }
      } catch (rpcErr) {
        console.error(" - RPC get_my_headers threw exception:", rpcErr);
      }

      // 3c. Call RPC get_custom_user_id directly
      console.log("3c. Calling public.get_custom_user_id() via RPC:");
      try {
        const { data: uidData, error: uidError } = await supabase.rpc('get_custom_user_id');
        if (uidError) {
          console.error(" - RPC get_custom_user_id failed:", uidError);
        } else {
          console.log(" - public.get_custom_user_id() returned:", uidData);
        }
      } catch (rpcErr) {
        console.error(" - RPC get_custom_user_id threw exception:", rpcErr);
      }

      // 4. Test database connection & RLS by fetching records
      console.log("4. Fetching database count...");
      try {
        const { count, error } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.error(" - Error reading invoices table:", error);
        } else {
          console.log(" - Connection successful. Read access to 'invoices' table OK.");
          console.log(" - Total invoices readable by this user:", count);
        }
      } catch (err: any) {
        console.error(" - Fetch failed due to exception:", err);
      }

      // 5. Query system usage or public RPC to check DB size
      console.log("5. Testing System Monitor RPC...");
      try {
        const { data, error } = await supabase.rpc('get_supabase_usage');
        if (error) {
          console.warn(" - get_supabase_usage RPC failed or returned error:", error);
        } else {
          console.log(" - get_supabase_usage RPC output:", data);
        }
      } catch (err) {
        console.warn(" - get_supabase_usage RPC threw exception:", err);
      }

      // 6. UID matching advice
      console.log("6. Resolution Guide:");
      console.log(" If the count is 0, but the database has data, the owner_id of the existing records in the database does not match your Firebase UID.");
      console.log(" To fix this, run the following SQL command in your Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/owcpriabrmkfubuulmrp/sql/new):");
      console.log(`%cUPDATE public.invoices SET owner_id = '${currentUser.uid}';
UPDATE public.partners SET owner_id = '${currentUser.uid}';
UPDATE public.generated_docs SET owner_id = '${currentUser.uid}';
UPDATE public.contracts SET owner_id = '${currentUser.uid}';`, "color: #00ff66; font-weight: bold; background: #222; padding: 8px; border-radius: 4px; display: block; margin: 4px 0;");

      console.log("%c=== DIAGNOSTIC SYSTEM ENDED ===", "color: #ff007f; font-weight: bold; font-size: 14px;");
    };

    console.log("[DEBUG] useEffect auth hook mounted. Firebase auth object:", auth);
    console.log("[DEBUG] Current Firebase currentUser:", auth.currentUser);

    getRedirectResult(auth)
      .then((result) => {
        console.log("[DEBUG] getRedirectResult successfully completed. Result:", result);
        if (result?.user) {
          console.log("[DEBUG] Google Redirect Sign-In successful. User:", result.user.email);
        } else {
          console.log("[DEBUG] getRedirectResult returned null (no redirect payload found in URL/cookies).");
        }
      })
      .catch((error) => {
        console.error("[DEBUG] Google Redirect Sign-In error:", error);
        toast(`Lỗi đăng nhập: ${error.message}`, "error");
      });

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      console.log("[DEBUG] onAuthStateChanged fired. User:", u ? u.email : "null");
      setUser(u);
      if (u) {
        setIsLoadingInvoices(true);

        // Pass the Firebase UID securely through custom dynamic fetch header to PostgreSQL RLS
        try {
          setCustomUserId(u.uid);
        } catch (headerErr) {
          console.error("[DEBUG] Failed to set custom user header:", headerErr);
        }

        // Fetch data from Supabase once authenticated via custom header
        await Promise.all([
          fetchPartners(u.uid),
          fetchInvoices(u.uid),
          fetchGeneratedDocs(u.uid),
          fetchContracts(u.uid)
        ]);
        setIsLoadingInvoices(false);

        // One-time automatic migration check
        const migrationKey = `migrated_to_supabase_${u.uid}`;
        if (localStorage.getItem(migrationKey) !== 'true') {
          await runFirebaseToSupabaseMigration(u.uid);
        }
      } else {
        setPartners([]);
        setInvoices([]);
        setGeneratedDocs([]);
        setContracts([]);
        try {
          setCustomUserId(null);
        } catch (e) {
          // Silent catch
        }
      }
    });

    return () => {
      unsubAuth();
    };
  }, []);

  // Helper: Normalize extracted data (Fix typos, common AI mistakes)
  const normalizeExtractedData = (data: any) => {
    if (!data) return data;

    // Helper to fix string values
    const fixString = (str: any) => {
      if (typeof str !== 'string' || !str) return str;

      // Clear values if they are just dots or dashes
      if (str.match(/^[.\- ]+$/)) return "";

      // Fix "Ngọc Thám" or "Ngọc Thẩm" to "Ngọc Thắm" (misreading tone mark)
      return fixNgocTham(str);
    };

    const fixNumber = (val: any) => {
      if (val === undefined || val === null || val === "") return null;
      if (typeof val === 'number') return val;
      const s = String(val).trim();
      if (!s || s.match(/^[.\- ]+$/)) return null;
      const cleanStr = s.replace(/[^0-9.-]/g, '');
      const num = parseFloat(cleanStr);
      return isNaN(num) ? null : num;
    };

    const newData = { ...data };

    // Ensure totals are numbers and calculate vatRate if missing or using default
    if (newData.totals) {
      const sub = fixNumber(newData.totals.subtotal || newData.totals.Subtotal || newData.totals.sub_total) || 0;
      const vat = fixNumber(newData.totals.vatAmount || newData.totals.VatAmount || newData.totals.vat_amount) || 0;
      const total = fixNumber(newData.totals.grandTotal || newData.totals.GrandTotal || newData.totals.grand_total);

      // Calculate vatRate: (Total - Subtotal) / Subtotal or Vat / Subtotal
      if (sub > 0) {
        const calculatedVat = (total !== null && total !== 0) ? Math.abs(total - sub) : vat;
        const calculatedRate = Math.round((calculatedVat / sub) * 100);

        if (!newData.invoice) newData.invoice = {};
        newData.invoice.vatRate = calculatedRate;

        // Ensure vatAmount is also consistent if it was 0
        if (vat === 0 && total !== null) newData.totals.vatAmount = calculatedVat;

        // If total was missing, use sub + vat
        if (total === null || total === 0) newData.totals.grandTotal = sub + vat;
      }
    }

    // Fix Seller & Buyer names and addresses
    if (newData.seller) {
      newData.seller.name = fixString(newData.seller.name);
      newData.seller.address = fixString(newData.seller.address);
    }
    if (newData.buyer) {
      newData.buyer.name = fixString(newData.buyer.name);
      newData.buyer.address = fixString(newData.buyer.address);
    }

    // Fix items description, unit, quantity
    if (newData.items && Array.isArray(newData.items)) {
      newData.items = newData.items.map((item: any) => ({
        ...item,
        name: fixString(item.name || item.description),
        description: fixString(item.description || item.name),
        unit: fixString(item.unit || item.DVT || item.DVTinh),
        quantity: fixNumber(item.quantity || item.SL || item.SLuong)
      }));
    }

    return newData;
  };

  // Helper: Remove undefined fields recursively for Firestore
  const cleanObject = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;

    // Tránh làm hỏng các đối tượng đặc biệt của Firestore (như serverTimestamp)
    const constructorName = obj.constructor?.name;
    if (constructorName && constructorName !== 'Object' && constructorName !== 'Array') {
      return obj;
    }

    if (Array.isArray(obj)) return obj.map(cleanObject);

    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanObject(v)])
    );
  };

  const [isTokenLimited, setIsTokenLimited] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Helper: Merge duplicate items with same price and name
  const mergeDuplicateItems = (items: any[]) => {
    if (!items || !Array.isArray(items)) return [];

    const mergedMap = new Map();

    items.forEach(item => {
      const desc = (item.description || item.name || '').trim();
      const price = parseFloat(String(item.unitPrice || 0).replace(/[^0-9.-]/g, ''));
      const key = `${desc}_${price}`;

      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key);
        existing.quantity = (parseFloat(existing.quantity) || 0) + (parseFloat(item.quantity) || 0);
        existing.amount = (parseFloat(existing.amount) || parseFloat(existing.total) || 0) +
          (parseFloat(item.amount) || parseFloat(item.total) || 0);
      } else {
        mergedMap.set(key, { ...item });
      }
    });

    return Array.from(mergedMap.values());
  };

  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<{ file: File, reason: string }[]>([]);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const handleFileUpload = (accepted: File[], rejections: any[]) => {
    if (!user) {
      toast("Vui lòng đăng nhập trước khi thực hiện.", "error");
      return;
    }

    console.log("Files dropped:", { accepted: accepted.length, rejections: rejections.length });

    // Handle rejections from Dropzone (e.g. wrong type)
    const newRejections = rejections.map(rej => ({
      file: rej.file,
      reason: rej.errors[0]?.message || "Định dạng không được hỗ trợ"
    }));

    setRejectedFiles(prev => [...prev, ...newRejections]);

    // Check for duplicates and add to valid queue
    const validFiles: File[] = [];
    accepted.forEach(file => {
      const isDuplicate = invoices.some(inv => inv.fileName === file.name) ||
        uploadQueue.some(q => q.name === file.name);

      if (isDuplicate) {
        setRejectedFiles(prev => [...prev, { file, reason: "Hóa đơn này đã tồn tại trong hệ thống" }]);
      } else {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'pdf' || ext === 'xml' || file.type.startsWith('image/')) {
          validFiles.push(file);
        } else {
          setRejectedFiles(prev => [...prev, { file, reason: "Định dạng tệp không hợp lệ" }]);
        }
      }
    });

    if (validFiles.length > 0) {
      setUploadQueue(prev => [...prev, ...validFiles]);
      toast(`Đã thêm ${validFiles.length} tệp vào hàng chờ`, "success");
    }
  };

  const removeFromQueue = (fileName: string) => {
    setUploadQueue(prev => prev.filter(f => f.name !== fileName));
  };

  const removeRejectedFile = (fileName: string) => {
    setRejectedFiles(prev => prev.filter(f => f.file.name !== fileName));
  };

  const processQueue = async () => {
    if (uploadQueue.length === 0) return;

    // Kiểm tra dung lượng Supabase trước khi trích xuất
    try {
      const { data: usageData, error: usageError } = await supabase.rpc('get_supabase_usage');
      if (!usageError && usageData && usageData.length > 0) {
        const usage = usageData[0];
        if (usage.usage_percentage > 95) {
          toast(`Hệ thống không thể tiếp tục trích xuất do dung lượng lưu trữ Supabase gần đầy (Đã dùng ${usage.usage_percentage}%). Vui lòng dọn dẹp dữ liệu để tiếp tục.`, 'error');
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to pre-check database usage:", e);
    }

    const filesToProcess = [...uploadQueue];
    const isBatchProcessing = filesToProcess.length > 1;
    setUploadQueue([]); // Clear queue before starting
    setIsProcessing(true);
    setProcessingStatus('Khởi tạo hàng chờ...');

    let loadingToastId: string | null = null;
    const updateLoading = (msg: string) => {
      setProcessingStatus(msg);
      if (loadingToastId) removeToast(loadingToastId);
      loadingToastId = toast(msg, 'loading');
    };

    try {
      for (let i = 0; i < filesToProcess.length; i++) {
        let file = filesToProcess[i];
        updateLoading(`Đang xử lý [${i + 1}/${filesToProcess.length}]: ${file.name}`);
        console.log(`Processing file ${i + 1}/${filesToProcess.length}: ${file.name}`);

        // Image Compression for image files
        if (file.type.startsWith('image/')) {
          try {
            setProcessingStatus(`Đang nén ảnh: ${file.name}`);
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true
            };
            file = await imageCompression(file, options);
            console.log(`Compressed ${file.name} to ${file.size / 1024 / 1024} MB`);
          } catch (error) {
            console.warn("Compression failed, using original file:", error);
          }
        }

        if (i > 0) {
          updateLoading(`Tạm nghỉ giữa các tệp...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        let docRef: any = null;
        try {
          const fileExt = file.name.split('.').pop()?.toLowerCase();
          const fileURL = URL.createObjectURL(file);
          const filePath = `drive://pending_gas_save/${file.name}`;

          // Step 1: Create Supabase record
          updateLoading(`Đang đăng ký hóa đơn: ${file.name}`);
          const initialInvoiceData: any = {
            file_name: file.name,
            file_type: fileExt,
            status: 'processing',
            owner_id: user.uid,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          const { data: insertedInv, error: insertError } = await supabase
            .from('invoices')
            .insert(initialInvoiceData)
            .select('id')
            .single();

          if (insertError || !insertedInv) throw new Error("Không thể khởi tạo bản ghi trong Supabase: " + (insertError?.message || "unknown"));
          docRef = { id: insertedInv.id };
          fetchInvoices(user.uid);

          let extractedData: any;
          if (fileExt === 'xml') {
            updateLoading(`Đang phân tích XML: ${file.name}`);
            setRequestCount(prev => prev + 1);
            const text = await file.text();
            extractedData = await parseInvoiceXml(text);
            extractedData = normalizeExtractedData(extractedData);

            if (extractedData.items) {
              try {
                const { classifyInvoice } = await import('./lib/mistral');
                extractedData.classification = await classifyInvoice(extractedData.items);
              } catch (e) {
                console.error("Classification failed:", e);
              }
            }
          } else {
            updateLoading(`Đang trích xuất AI: ${file.name}`);
            setRequestCount(prev => prev + 1);
            try {
              const rawExtracted = await extractFromInvoice(file);
              extractedData = normalizeExtractedData(rawExtracted);
            } catch (err: any) {
              const errMsg = err.message || "";
              if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota")) {
                setIsTokenLimited(true);
                setCountdown(60);
                toast("Lỗi giới hạn Token AI. Đang tạm dừng...", "error");

                const timer = setInterval(() => {
                  setCountdown(prev => {
                    if (prev <= 1) {
                      clearInterval(timer);
                      return 0;
                    }
                    return prev - 1;
                  });
                }, 1000);

                await new Promise(resolve => setTimeout(resolve, 60000));
                setIsTokenLimited(false);
                i--; // Retry same file
                if (docRef) await supabase.from('invoices').delete().eq('id', docRef.id);
                continue;
              }
              throw err;
            }

            if (extractedData && (extractedData.items || extractedData.items_list)) {
              try {
                const { classifyInvoice } = await import('./lib/mistral');
                const items = extractedData.items || extractedData.items_list || [];
                extractedData.classification = await classifyInvoice(items);
              } catch (e) {
                console.error("Local classification failed:", e);
              }
            }
          }

          if (extractedData) {
            updateLoading(`Đang lưu kết quả: ${file.name}`);
            if (extractedData.seller) extractedData.seller.name = fixNgocTham(extractedData.seller.name);
            if (extractedData.buyer) extractedData.buyer.name = fixNgocTham(extractedData.buyer.name);
            if (extractedData.items) extractedData.items = mergeDuplicateItems(extractedData.items);

            if (isBatchProcessing) {
              const updates = cleanObject({ status: 'completed', extractedData });
              const mapped = mapInvoiceToSupabase(updates);
              const { error: updateError } = await supabase
                .from('invoices')
                .update(mapped)
                .eq('id', docRef.id);
              if (updateError) throw updateError;
              fetchInvoices(user.uid);

              const { seller, buyer, invoice } = extractedData;
              const invDate = invoice?.date ? new Date(invoice.date) : new Date();
              const cutOffDate = new Date('2025-07-01');
              const isPostMerger = invDate > cutOffDate;

              if (seller) await upsertPartner(seller, isPostMerger);
              if (buyer) await upsertPartner(buyer, isPostMerger);

              console.log(`Successfully auto-processed ${file.name}`);
            } else {
              if (loadingToastId) removeToast(loadingToastId);
              clearToasts();
              setPendingReview({ file, docRef, data: extractedData });
              setIsProcessing(false);
              setProcessingStatus('');
              return; // Stop here and show Review Modal
            }
          }

        } catch (innerError: any) {
          console.error(`Inner processing error for ${file.name}:`, innerError);
          toast(`Lỗi tệp ${file.name}: ${innerError.message}`, "error");
          if (docRef) {
            try {
              const updates = {
                status: 'error',
                extracted_data: { error: innerError.message }
              };
              await supabase.from('invoices').update(updates).eq('id', docRef.id);
            } catch (e) {
              console.error("Failed to update error status", e);
            }
          }
        }
      }
      toast("Đã hoàn thành xử lý danh sách hóa đơn", "success");
    } catch (outerError: any) {
      console.error("Outer processing error:", outerError);
      toast(`Lỗi hệ thống: ${outerError.message}`, "error");
    } finally {
      if (loadingToastId) removeToast(loadingToastId);
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleCancelReview = async () => {
    if (!pendingReview) return;
    const { docRef } = pendingReview;

    try {
      // Xóa bản ghi tạm khỏi Supabase nếu người dùng hủy
      const { error } = await supabase.from('invoices').delete().eq('id', docRef.id);
      if (error) throw error;
      if (user) fetchInvoices(user.uid);
      toast("Đã hủy bỏ và không lưu hóa đơn", "info");
    } catch (error) {
      console.error("Lỗi khi xóa bản ghi tạm:", error);
    } finally {
      setPendingReview(null);
      clearToasts();
    }
  };

  const upsertPartner = async (p: any, isPostMerger: boolean) => {
    if (!p || !p.taxCode || !user) return;
    try {
      const { data: existingDocs, error: queryError } = await supabase
        .from('partners')
        .select('*')
        .eq('owner_id', user.uid)
        .eq('tax_code', p.taxCode);
      if (queryError) throw queryError;

      const existing = existingDocs && existingDocs[0];

      // Address handling and conversion
      const rawAddress = p.address || "";
      let finalAddress = "";
      let finalAddressPostMerger = "";

      // Determine which field to fill based on invoice date
      if (isPostMerger) {
        finalAddressPostMerger = rawAddress;
        // Auto-convert for post-merger invoices to ensure 2nd level normalization
        const converted = smartConvertAddress(rawAddress);
        if (converted.isConverted) {
          finalAddressPostMerger = converted.fullAddress;
        }
      } else {
        finalAddress = rawAddress;
      }

      const partnerData: any = {
        name: fixNgocTham(p.name) || "",
        tax_code: p.taxCode,
        address: finalAddress,
        address_post_merger: finalAddressPostMerger,
        account_number: p.accountNumber || "",
        bank_name: p.bankName || "",
        position: p.position || "Giám đốc",
        updated_at: new Date().toISOString(),
        owner_id: user.uid
      };

      if (!existing) {
        const { error: insertError } = await supabase
          .from('partners')
          .insert({
            ...partnerData,
            created_at: new Date().toISOString()
          });
        if (insertError) throw insertError;
      } else {
        const current = existing;
        const updates: any = {};

        // Update fields ONLY if they are currently empty or null
        if (isPostMerger && !current.address_post_merger && finalAddressPostMerger) {
          updates.address_post_merger = finalAddressPostMerger;
        }
        if (!isPostMerger && !current.address && finalAddress) {
          updates.address = finalAddress;
        }
        if (!current.account_number && p.accountNumber) {
          updates.account_number = p.accountNumber;
        }
        if (!current.bank_name && p.bankName) {
          updates.bank_name = p.bankName;
        }
        if (!current.position) {
          updates.position = "Giám đốc";
        }

        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          const { error: updateError } = await supabase
            .from('partners')
            .update(updates)
            .eq('id', existing.id);
          if (updateError) throw updateError;
        }
      }
      fetchPartners(user.uid);
    } catch (err: any) {
      console.error("Lỗi khi lưu/cập nhật đối tác:", err.message);
    }
  };

  const handleExtractDraftInvoice = async (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv || !user) return;

    // Kiểm tra dung lượng Supabase trước khi trích xuất
    try {
      const { data: usageData, error: usageError } = await supabase.rpc('get_supabase_usage');
      if (!usageError && usageData && usageData.length > 0) {
        const usage = usageData[0];
        if (usage.usage_percentage > 95) {
          toast(`Hệ thống không thể tiếp tục trích xuất do dung lượng lưu trữ Supabase gần đầy (Đã dùng ${usage.usage_percentage}%). Vui lòng dọn dẹp dữ liệu để tiếp tục.`, 'error');
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to pre-check database usage:", e);
    }

    const gasUrl = (import.meta as any).env.VITE_GAS_WEB_APP_URL;
    if (!gasUrl) {
      toast("Chưa cấu hình Google Apps Script URL.", "error");
      return;
    }

    const toastId = toast(`Đang chạy AI bóc tách: ${inv.fileName}...`, "loading");
    try {
      // Step 1: Update status to 'processing' in Supabase
      await supabase.from('invoices').update({ status: 'processing' }).eq('id', id);
      fetchInvoices(user.uid);

      // Step 2: Request GAS to extract file directly from Google Drive
      const res = await fetch(gasUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'extract_file',
          fileName: inv.fileName
        })
      });

      if (!res.ok) throw new Error("Yêu cầu trích xuất từ GAS thất bại.");
      const responseText = await res.text();
      let extractedData;
      try {
        extractedData = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Dữ liệu trả về từ GAS không hợp lệ.");
      }

      if (extractedData.error) {
        throw new Error(extractedData.error);
      }

      // Step 3: Update Supabase with completed status and clean mapped fields
      const { seller, buyer, invoice } = extractedData;
      const invDate = invoice?.date ? new Date(invoice.date) : new Date();
      const cutOffDate = new Date('2025-07-01');
      const isPostMerger = invDate > cutOffDate;

      if (seller) await upsertPartner(seller, isPostMerger);
      if (buyer) await upsertPartner(buyer, isPostMerger);

      const updates = cleanObject({
        status: 'completed',
        extractedData: extractedData
      });

      const mapped = mapInvoiceToSupabase(updates);
      const { error } = await supabase.from('invoices').update(mapped).eq('id', id);
      if (error) throw error;

      removeToast(toastId);
      toast("Bóc tách AI và đồng bộ hóa đơn thành công!", "success");
      fetchInvoices(user.uid);

    } catch (err: any) {
      console.error("Draft extraction error:", err);
      removeToast(toastId);
      toast("Lỗi trích xuất: " + (err.message || err.toString()), "error");
      // Revert status to draft in case of failure so the user can retry
      await supabase.from('invoices').update({ status: 'draft' }).eq('id', id);
      fetchInvoices(user.uid);
    }
  };

  const finalizeInvoice = async (updatedData: any) => {
    if (!pendingReview) return;
    const { docRef } = pendingReview;
    setIsProcessing(true);
    try {
      const updates = cleanObject({
        status: 'completed',
        extractedData: updatedData
      });

      // Chỉ cập nhật fileURL nếu có link Drive từ GAS thành công
      const newUrl = updatedData.driveUrl || pendingReview.data.driveUrl;
      if (newUrl) {
        updates.fileURL = newUrl;
      }

      const mapped = mapInvoiceToSupabase(updates);
      const { error } = await supabase.from('invoices').update(mapped).eq('id', docRef.id);
      if (error) throw error;
      if (user) fetchInvoices(user.uid);

      // Sync Partner check
      const { seller, buyer, invoice } = updatedData;
      const invDate = invoice?.date ? new Date(invoice.date) : new Date();
      const cutOffDate = new Date('2025-07-01');
      const isPostMerger = invDate > cutOffDate;

      if (seller) await upsertPartner(seller, isPostMerger);
      if (buyer) await upsertPartner(buyer, isPostMerger);

      toast("Đã lưu hóa đơn thành công!", "success");
      setPendingReview(null);
      clearToasts(); // Xóa sạch toast khi xong
      handleTabChange('dashboard');
    } catch (error: any) {
      console.error(error);
      toast("Lỗi khi lưu hóa đơn: " + error.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const exportInvoicesToExcel = () => {
    if (invoices.length === 0) return;
    setIsExportingExcel(true);

    try {
      const excelData = invoices
        .filter(inv => inv.status === 'completed')
        .map(inv => {
          const data = inv.extractedData || {};
          return {
            'Ngày hóa đơn': data.invoice?.date || '',
            'Số hóa đơn': data.invoice?.number || '',
            'Ký hiệu': data.invoice?.serial || '',
            'Đơn vị bán': data.seller?.name || '',
            'MST Người bán': data.seller?.taxCode || '',
            'Đơn vị mua': data.buyer?.name || '',
            'MST Người mua': data.buyer?.taxCode || '',
            'Tiền hàng': data.totals?.subtotal || 0,
            'Tiền thuế': data.totals?.vatAmount || 0,
            'Tổng cộng': data.totals?.grandTotal || 0,
            'Phân loại': (() => {
              const r = data.classification;
              const t = typeof r === 'object' ? r.type : (r || 'BB_VT');
              switch (t) {
                case 'BB_VT': return 'Vật tư';
                case 'BB_CM': return 'Ca máy';
                case 'BB_TC': return 'Thi công';
                default: return t;
              }
            })(),
            'Tên tệp': inv.fileName
          };
        });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách hóa đơn");

      // Auto-size columns
      const maxWidths = Object.keys(excelData[0] || {}).map(key => ({ wch: 20 }));
      worksheet['!cols'] = maxWidths;

      XLSX.writeFile(workbook, `Danh_sach_hoa_don_${new Date().getTime()}.xlsx`);
      toast("Đã xuất file Excel thành công", "success");
    } catch (err) {
      console.error("Excel export error:", err);
      toast("Lỗi khi xuất file Excel", "error");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const stats = {
    pending: contracts.filter(c => !c.partyAId || !c.partyBId).length,
    partners: partners.length,
    invoices: invoices.length,
    recentInvoices: invoices
  };

  return (
    <div className="flex h-screen w-full font-sans select-none overflow-hidden bg-bg-dark">
      {/* Review Modal */}
      {pendingReview && (
        <ReviewModal
          data={pendingReview.data}
          onClose={handleCancelReview}
          onSave={finalizeInvoice}
        />
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        user={user}
        isPinned={isSidebarPinned}
        setIsPinned={setIsSidebarPinned}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-[64px] bg-sidebar-dark border-b border-border-dark flex items-center justify-between px-6 shrink-0 shadow-sm">
          <div className="flex items-center gap-2 text-text-dim text-sm italic shrink-0">
            <span>DocuForge AI</span>
            <span className="text-text-dim/50">/</span>
            <span className="text-white font-bold not-italic uppercase text-xs">
              {(() => {
                switch (activeTab) {
                  case 'dashboard': return 'Bảng điều khiển';
                  case 'upload': return 'Tải lên hóa đơn';
                  case 'partners': return 'Đối tác';
                  case 'docs': return 'Tài liệu đã tạo';
                  case 'system': return 'Theo dõi hệ thống';
                  default: return activeTab;
                }
              })()}
            </span>
          </div>

          {/* Relocated Global Search Bar */}
          {activeTab === 'dashboard' && !selectedInvoice && (
            <div className="flex-1 max-w-xl mx-8 relative group">
              <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-[#FF7A00] transition-colors" />
              <input
                type="text"
                placeholder="Tìm kiếm hóa đơn trong danh sách (PDF & XML)..."
                value={fileSearchTerm}
                onChange={(e) => setFileSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-black/40 border border-border-dark rounded-2xl text-xs focus:outline-none focus:border-[#FF7A00]/40 focus:ring-4 focus:ring-[#FF7A00]/5 transition-all font-bold text-white placeholder:text-text-dim shadow-inner"
              />
            </div>
          )}

          <div className="flex items-center gap-6 shrink-0">
            <div className="flex items-center bg-white/5 rounded-2xl p-1.5 border border-border-dark gap-1">
              <button
                onClick={() => handleTabChange('upload')}
                className="btn-primary py-3"
              >
                <Plus className="size-5" />
                <span>Bắt đầu lượt mới</span>
              </button>
            </div>
            <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary shadow-inner">
              {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : "GA"}
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="h-full">
            {activeTab === 'dashboard' && !selectedInvoice && (
              <DashboardView
                stats={stats}
                onSelectInvoice={handleInvoiceSelect}
                onDeleteInvoice={handleDeleteInvoice}
                onExportExcel={exportInvoicesToExcel}
                onBulkExport={() => setShowBulkExport(true)}
                isExportingExcel={isExportingExcel}
                isLoadingData={isLoadingInvoices}
                subTab={dashboardSubTab}
                onSubTabChange={handleDashboardSubTabChange}
                generatedDocs={generatedDocs}
                contracts={contracts}
                invoices={invoices}
                partners={partners}
                onDeleteDoc={handleDeleteDoc}
                onBulkDeleteDocs={handleBulkDeleteDocs}
                onDeleteAllDocs={handleDeleteAllDocs}
                onDownloadDoc={downloadDoc}
                onDeleteContract={handleDeleteContract}
                onBulkDeleteContracts={handleBulkDeleteContracts}
                onDownloadContract={downloadContract}
                onUpdateContractFormData={handleUpdateContractFormData}
                user={user}
                rankMap={rankMap}
                fetchInvoices={fetchInvoices}
                fetchGeneratedDocs={fetchGeneratedDocs}
                onExtractDraft={handleExtractDraftInvoice}
                normalizeExtractedData={normalizeExtractedData}
                fileSearchTerm={fileSearchTerm}
                setFileSearchTerm={setFileSearchTerm}
              />
            )}
            {activeTab === 'dashboard' && selectedInvoice && (
              <div className="grid grid-cols-12 gap-6 h-full min-h-[600px]">
                {/* Left Panel: Extracted Source */}
                <div className="col-span-4 flex flex-col card h-full">
                  <div className="p-4 border-b border-border-dark flex justify-between items-center bg-sidebar-dark">
                    <h3 className="font-bold text-sm text-white truncate mr-2">Nguồn: {selectedInvoice.fileName}</h3>
                    <button
                      onClick={() => handleInvoiceSelect(null)}
                      className="text-xs text-text-dim hover:text-white"
                    >
                      Quay lại
                    </button>
                  </div>
                  <div className="flex-1 p-4 space-y-6 overflow-y-auto text-sm">
                    {(() => {
                      const rawT = selectedInvoice.extractedData?.classification;
                      const tType = typeof rawT === 'object' ? rawT.type : (rawT || 'BB_CM');
                      const isCM = tType.includes('CM');
                      const isVT = tType.includes('VT');
                      const isTC = tType.includes('TC');
                      const isSwapped = isVT || isCM || isTC;

                      let labelSeller = isSwapped ? "Người bán (Bên B)" : "Người bán (Bên A)";
                      let labelBuyer = isSwapped ? "Người mua (Bên A)" : "Người mua (Bên B)";

                      if (isCM) {
                        labelSeller = "Bên cho thuê (Bên B)";
                        labelBuyer = "Bên thuê (Bên A)";
                      } else if (isTC) {
                        labelSeller = "Người nhận thầu (Bên B)";
                        labelBuyer = "Người giao thầu (Bên A)";
                      }

                      const sellerSection = (
                        <div key="seller">
                          <label className="text-sm text-primary font-black uppercase block mb-2">
                            {labelSeller}
                          </label>
                          <div className="text-xl font-semibold text-white leading-tight tracking-tight">{selectedInvoice.extractedData?.seller?.name}</div>
                          <div className="text-base font-bold text-white mt-2 bg-primary/20 px-3 py-1 rounded-lg w-fit border border-primary/30">MST: {selectedInvoice.extractedData?.seller?.taxCode}</div>
                        </div>
                      );

                      const buyerSection = (
                        <div key="buyer">
                          <label className="text-sm text-emerald-500 font-black uppercase block mb-2">
                            {labelBuyer}
                          </label>
                          <div className="text-xl font-semibold text-white leading-tight tracking-tight">{selectedInvoice.extractedData?.buyer?.name}</div>
                          <div className="text-base font-bold text-white mt-2 bg-emerald-500/10 px-3 py-1 rounded-lg w-fit border border-emerald-500/20">MST: {selectedInvoice.extractedData?.buyer?.taxCode}</div>
                        </div>
                      );

                      return (
                        <>
                          {isSwapped ? [buyerSection, sellerSection] : [sellerSection, buyerSection]}
                        </>
                      );
                    })()}

                    <div className="space-y-6 pt-8 border-t-2 border-dashed border-border-dark mt-4">
                      <label className="text-sm text-text-dim font-black uppercase block mb-2">Thông tin Hợp đồng liên quan</label>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="text-xs text-text-dim uppercase font-black px-1 tracking-widest">Số hợp đồng</div>
                          <input
                            type="text"
                            defaultValue={selectedInvoice.contractNumber || ''}
                            placeholder="Nhập số HĐ..."
                            onBlur={async (e) => {
                              const val = e.target.value;
                              if (val === selectedInvoice.contractNumber) return;
                              try {
                                const { error: updateError } = await supabase
                                  .from('invoices')
                                  .update({ contract_number: val, updated_at: new Date().toISOString() })
                                  .eq('id', selectedInvoice.id);
                                if (updateError) throw updateError;
                                setSelectedInvoice(prev => prev ? { ...prev, contractNumber: val } : null);
                                if (user) fetchInvoices(user.uid);
                              } catch (err: any) {
                                console.error("Lỗi khi cập nhật số HĐ:", err);
                              }
                            }}
                            className="w-full px-4 py-3 bg-card-dark border-2 border-border-dark text-white rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-primary/10 focus:border-primary transition-all shadow-sm placeholder:text-text-dim"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-xs text-text-dim uppercase font-black px-1 tracking-widest">Ngày ký HĐ</div>
                          <input
                            type="text"
                            defaultValue={selectedInvoice.contractDate || ''}
                            placeholder="Ngày ký..."
                            onBlur={async (e) => {
                              const val = e.target.value;
                              if (val === selectedInvoice.contractDate) return;
                              try {
                                const { error: updateError } = await supabase
                                  .from('invoices')
                                  .update({ contract_date: val, updated_at: new Date().toISOString() })
                                  .eq('id', selectedInvoice.id);
                                if (updateError) throw updateError;
                                setSelectedInvoice(prev => prev ? { ...prev, contractDate: val } : null);
                                if (user) fetchInvoices(user.uid);
                              } catch (err: any) {
                                console.error("Lỗi khi cập nhật ngày ký HĐ:", err);
                              }
                            }}
                            className="w-full px-4 py-3 bg-card-dark border-2 border-border-dark text-white rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-primary/10 focus:border-primary transition-all shadow-sm placeholder:text-text-dim"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-sidebar-dark rounded-xl text-[11px] text-primary overflow-x-auto shadow-inner">
                      <div className="text-text-dim font-bold mb-2 opacity-70">DỮ LIỆU JSON GỐC://</div>
                      {JSON.stringify(selectedInvoice.extractedData, null, 2)}
                    </div>
                  </div>
                </div>

                {/* Right Panel: Template Logic */}
                <div className="col-span-8 flex flex-col card h-full">
                  <div className="p-4 border-b border-border-dark flex justify-between items-center bg-sidebar-dark">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary rounded-full border border-primary/30">
                        <HardHat className="size-3.5" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {(() => {
                            const raw = selectedInvoice.extractedData?.classification;
                            const type = typeof raw === 'object' ? raw.type : (raw || 'BB_CM');
                            switch (type) {
                              case 'BB_CM': return 'Phân loại: Ca Máy';
                              case 'BB_VT': return 'Phân loại: Vật Tư';
                              case 'BB_TC': return 'Phân loại: Thi Công';
                              default: return `Phân loại: ${type}`;
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                    <button
                      disabled={isProcessing}
                      onClick={async () => {
                        const rawT = selectedInvoice.extractedData?.classification;
                        const tType = typeof rawT === 'object' ? rawT.type : (rawT || 'BB_CM');

                        if (!['BB_VT', 'BB_CM', 'BB_TC'].includes(tType)) {
                          alert(`Mẫu "${tType}" không được hỗ trợ trong hệ thống.`);
                          return;
                        }

                        // Find partners
                        const pA = partners.find(p => p.taxCode === selectedInvoice.extractedData?.seller?.taxCode) || {};
                        const pB = partners.find(p => p.taxCode === selectedInvoice.extractedData?.buyer?.taxCode) || {};

                        setIsProcessing(true);
                        try {
                          const templateBuffer = await getTemplateBuffer(tType);
                          const blob = await generateDocxBlob({
                            templateBuffer,
                            templateType: tType,
                            data: selectedInvoice.extractedData,
                            partnerA: pA,
                            partnerB: pB,
                            contractNumber: selectedInvoice.contractNumber,
                            contractDate: selectedInvoice.contractDate
                          });

                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${tType}_${selectedInvoice.fileName.split('.')[0]}.docx`;
                          a.click();

                          const { error: genDocError } = await supabase.from('generated_docs').insert({
                            invoice_id: selectedInvoice.id,
                            template_type: tType,
                            file_name: `${tType}_${selectedInvoice.fileName.split('.')[0]}.docx`,
                            owner_id: user.uid,
                            created_at: new Date().toISOString()
                          });
                          if (genDocError) throw genDocError;
                          fetchGeneratedDocs(user.uid);
                        } catch (err: any) {
                          alert(err.message || "Generation failed.");
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      className="btn-primary"
                    >
                      {isProcessing ? 'Đang tạo...' : 'Tạo docx'}
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <table className="w-full border-collapse border border-border-dark text-[11px]">
                      <thead>
                        <tr className="bg-sidebar-dark font-bold text-text-dim">
                          <th className="border border-border-dark p-2 w-8">Stt</th>
                          <th className="border border-border-dark p-2 text-left">Nội dung hàng hóa/dịch vụ</th>
                          <th className="border border-border-dark p-2">ĐVT</th>
                          <th className="border border-border-dark p-2">SL</th>
                          <th className="border border-border-dark p-2">Đơn giá</th>
                          <th className="border border-border-dark p-2 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.extractedData?.items?.map((item: any, i: number) => {
                          const qty = parseFloat(item.quantity) || 0;
                          const price = parseFloat(item.unitPrice) || 0;
                          const amount = item.amount || item.total || (qty * price);
                          const fallback = "";

                          return (
                            <tr key={item.id || `item-edit-${i}-${item.description || ''}`}>
                              <td className="border border-border-dark p-2 text-center text-text-dim table-cell">{i + 1}</td>
                              <td className="border border-border-dark p-2 font-medium table-cell text-white">{item.description || item.name || "Nhập nội dung..."}</td>
                              <td className="border border-border-dark p-2 text-center table-cell text-white">{item.unit && !item.unit.toString().match(/^[. ]+$/) ? item.unit : ''}</td>
                              <td className="border border-border-dark p-2 text-center table-cell text-white">{qty > 0 ? formatVNNumber(qty) : ''}</td>
                              <td className="border border-border-dark p-2 text-right table-cell text-white">{price > 0 ? formatVNNumber(price) : ''}</td>
                              <td className="border border-border-dark p-2 text-right font-bold text-white table-cell">{amount > 0 ? formatVNNumber(amount) : '0'}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-white/5 font-bold">
                          <td colSpan={5} className="border border-border-dark p-2 text-right uppercase text-[10px] tracking-wider text-white">Tổng cộng</td>
                          <td className="border border-border-dark p-2 text-right text-white">{formatVNNumber(selectedInvoice.extractedData?.totals?.subtotal)}</td>
                        </tr>
                        <tr className="font-bold text-white">
                          <td colSpan={5} className="border border-border-dark p-2 text-right italic text-[10px]">
                            Thuế GTGT ({(() => {
                              const rate = selectedInvoice.extractedData?.invoice?.vatRate;
                              if (rate !== undefined && rate !== null) return rate;
                              const sub = selectedInvoice.extractedData?.totals?.subtotal;
                              const total = selectedInvoice.extractedData?.totals?.grandTotal || selectedInvoice.extractedData?.totals?.grand_total;
                              if (sub > 0 && total > 0) return Math.round((Math.abs(total - sub) / sub) * 100);
                              return 8;
                            })()}%)
                          </td>
                          <td className="border border-border-dark p-2 text-right">{formatVNNumber(selectedInvoice.extractedData?.totals?.vatAmount)}</td>
                        </tr>
                        <tr className="bg-primary/20 text-white font-bold">
                          <td colSpan={5} className="border border-border-dark p-2 text-right text-xs uppercase tracking-tight">Thành tiền (Sau thuế)</td>
                          <td className="border border-border-dark p-2 text-right text-xs">{formatVNNumber(selectedInvoice.extractedData?.totals?.grandTotal || selectedInvoice.extractedData?.totals?.grand_total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'upload' && (
              <UploadView
                onUpload={handleFileUpload}
                queue={uploadQueue}
                rejectedFiles={rejectedFiles}
                onRemove={removeFromQueue}
                onRemoveRejected={removeRejectedFile}
                onProcess={processQueue}
                isProcessing={isProcessing}
                processingStatus={processingStatus}
              />
            )}
            {activeTab === 'partners' && (
              <PartnersView
                partners={partners}
                onEdit={(p) => handlePartnerEditSelect(p)}
                onBatchEdit={handleBatchPartnerEditStart}
                onDelete={handleDeletePartner}
              />
            )}

            {activeTab === 'docs' && (
              <DocsView
                items={generatedDocs}
                onDelete={handleDeleteDoc}
                onBulkDelete={handleBulkDeleteDocs}
                onDeleteAll={handleDeleteAllDocs}
                invoices={invoices}
                partners={partners}
              />
            )}
            {activeTab === 'contract' && (
              <ContractView
                partners={partners}
                user={user}
                contractForm={contractForm}
                updateContractForm={updateContractForm}
                onContractSaved={handleContractSave}
                setIsInvoiceSelectorOpen={setIsInvoiceSelectorOpen}
                setActiveInvoiceTag={setActiveInvoiceTag}
                handleFieldChange={handleContractFieldChange}
              />
            )}
            {activeTab === 'system' && (
              <SystemMonitorView />
            )}
          </div>
        </div>

        <footer className="h-10 bg-sidebar-dark border-t border-border-dark px-6 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-text-dim">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`size-2 rounded-full ${isLoadingInvoices || isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
              <span>AI MODEL: MISTRAL-LARGE-LATEST (PREMIUM)</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="size-3" />
              <span>AI REGION: ASIA-SOUTHEAST1 (SINGAPORE)</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="size-3" />
              <span>API STATUS: HEALTHY | REQUESTS: {requestCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Cpu className="size-3" /> GAS SERVICE: CONNECTED</span>
            <span className="text-border-dark">|</span>
            <span>© 2026 SMARTINVOICE PRO</span>
          </div>
        </footer>
      </main>

      {/* Token Limit Countdown Modal */}
      {isTokenLimited && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card-dark border border-border-dark rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-6"
          >
            <div className="size-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <Clock className="size-10 text-amber-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">GIỚI HẠN YÊU CẦU AI</h3>
              <p className="text-text-dim text-sm mt-2">Đã đạt đến giới hạn xử lý của AI. Hệ thống sẽ tự động thử lại sau:</p>
            </div>
            <div className="text-5xl font-black text-primary">
              {countdown}s
            </div>
            <p className="text-[10px] text-text-dim uppercase font-bold tracking-widest">Vui lòng không đóng trình duyệt để tiếp tục hàng đợi</p>
          </motion.div>
        </div>
      )}


      {/* Single Partner Edit Modal */}
      <AnimatePresence>
        {editingPartner && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-card-dark rounded-[48px] shadow-[0_50px_100px_rgba(0,0,0,0.6)] w-full max-w-4xl overflow-hidden border border-white/10 flex flex-col max-h-[95vh]"
            >
              {/* Modern Header */}
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-orange-400 to-primary/20" />
                <div className="flex items-center gap-5 relative z-10">
                  <div className="size-16 bg-primary/20 text-primary rounded-[24px] flex items-center justify-center border border-primary/30 shadow-2xl">
                    <Building2 className="size-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-widest">{editingPartner.id === 'new' ? 'Khởi tạo đối tác mới' : 'Cập nhật hồ sơ đối tác'}</h3>
                    <p className="text-text-dim text-xs font-bold uppercase tracking-[0.2em] mt-1.5 opacity-60">Chuẩn hóa dữ liệu hệ thống doanh nghiệp</p>
                  </div>
                </div>
                <button type="button" onClick={() => handlePartnerEditSelect(null)} className="size-12 flex items-center justify-center text-text-dim hover:text-white hover:bg-white/10 rounded-2xl transition-all">
                  <X className="size-6" />
                </button>
              </div>

              <form
                className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  setIsProcessing(true);
                  try {
                    const updatePayload: Partial<Partner> = {
                      representative: formData.get('representative') as string,
                      position: formData.get('position') as string,
                      gender: formData.get('gender') as string,
                      address: formData.get('address') as string,
                      addressPostMerger: formData.get('addressPostMerger') as string,
                      accountNumber: formData.get('accountNumber') as string,
                      bankName: formData.get('bankName') as string,
                    };

                    if (editingPartner.id === 'new') {
                      updatePayload.name = formData.get('name') as string;
                      updatePayload.taxCode = formData.get('taxCode') as string;
                    }

                    await handleUpdatePartner(editingPartner.id, updatePayload);
                    handlePartnerEditSelect(null);
                    toast(editingPartner.id === 'new' ? "Đã lưu đối tác mới thành công" : "Cập nhật hồ sơ thành công", "success");
                  } catch (err) {
                    toast("Lỗi xử lý dữ liệu", "error");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
              >
                {/* SECTION 1: IDENTITY */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-primary">
                    <Fingerprint className="size-5" />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em]">Định danh doanh nghiệp</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-black text-text-dim uppercase block mb-3 tracking-widest ml-1">Tên pháp nhân công ty</label>
                      {editingPartner.id === 'new' ? (
                        <input name="name" required placeholder="Ví dụ: CÔNG TY TNHH XÂY DỰNG ABC..." className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white" />
                      ) : (
                        <div className="p-4 px-6 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                          <div className="text-base font-black text-white">{editingPartner.name}</div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-text-dim uppercase block mb-3 tracking-widest ml-1">Mã số thuế</label>
                      {editingPartner.id === 'new' ? (
                        <input name="taxCode" required placeholder="Số MST..." className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white" />
                      ) : (
                        <div className="p-4 px-6 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                          <div className="text-base font-black text-primary tracking-[0.1em]">{editingPartner.taxCode}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION 2: ADDRESSES */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-primary">
                    <MapPin className="size-5" />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em]">Thông tin địa chỉ hành chính</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[11px] font-black text-text-dim uppercase tracking-widest">Địa chỉ gốc (Trước 1/7/2025)</label>
                        <button
                          type="button"
                          onClick={() => {
                            const addrInput = (document.getElementsByName('address')[0] as HTMLTextAreaElement).value;
                            if (!addrInput) return;
                            const result = smartConvertAddress(addrInput);
                            if (result.isConverted) {
                              (document.getElementsByName('address')[0] as HTMLTextAreaElement).value = result.oldFullAddress || addrInput;
                              (document.getElementsByName('addressPostMerger')[0] as HTMLTextAreaElement).value = result.fullAddress;
                              toast("Đã chuyển đổi thành công!", "success");
                            } else {
                              toast("Địa chỉ đã chuẩn hoặc không cần chuyển đổi", "info");
                            }
                          }}
                          className="text-[10px] font-black text-primary hover:text-white hover:bg-primary px-4 py-1.5 rounded-xl transition-all border border-primary/30 uppercase tracking-widest flex items-center gap-2"
                        >
                          <Zap className="size-3" /> Tự động chuẩn hóa
                        </button>
                      </div>
                      <textarea
                        name="address"
                        defaultValue={editingPartner.address}
                        placeholder="Nhập địa chỉ đầy đủ..."
                        className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-3xl text-base font-medium focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white min-h-[140px] leading-relaxed"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-text-dim uppercase tracking-widest block px-1">Địa chỉ sau khi sáp nhập (Từ 1/7/2025)</label>
                      <textarea
                        name="addressPostMerger"
                        defaultValue={editingPartner.addressPostMerger}
                        placeholder="Hệ thống sẽ tự động tạo địa chỉ mới nếu bạn bấm Chuẩn hóa..."
                        className="w-full px-6 py-5 bg-primary/5 border border-primary/20 rounded-3xl text-base font-black text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[140px] leading-relaxed placeholder:text-primary/30"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: FINANCE & REP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-primary">
                      <CreditCard className="size-5" />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em]">Tài khoản ngân hàng</span>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-text-dim uppercase tracking-widest block ml-1">Số tài khoản</label>
                        <input name="accountNumber" defaultValue={editingPartner.accountNumber} placeholder="Nhập số tài khoản..." className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-text-dim uppercase tracking-widest block ml-1">Tên ngân hàng & Chi nhánh</label>
                        <input name="bankName" defaultValue={editingPartner.bankName} placeholder="Ví dụ: VCB - CN Tân Sơn Nhất..." className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-primary">
                      <UserCheck className="size-5" />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em]">Đại diện pháp luật</span>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2 space-y-3">
                        <label className="text-[11px] font-black text-text-dim uppercase tracking-widest block ml-1">Họ và tên đại diện</label>
                        <input name="representative" defaultValue={editingPartner.representative} placeholder="Nhập họ tên đầy đủ..." className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-text-dim uppercase tracking-widest block ml-1">Chức vụ</label>
                        <input name="position" defaultValue={editingPartner.position || 'Giám đốc'} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-text-dim uppercase tracking-widest block ml-1">Xưng hô</label>
                        <select name="gender" defaultValue={editingPartner.gender || 'Ông'} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white appearance-none cursor-pointer">
                          <option value="Ông" className="bg-card-dark text-white">Ông</option>
                          <option value="Bà" className="bg-card-dark text-white">Bà</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-10 flex gap-6 border-t border-white/5">
                  <button type="submit" disabled={isProcessing} className="flex-1 py-5 bg-primary text-white rounded-[24px] text-sm font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(249,115,22,0.3)] hover:translate-y-[-4px] active:scale-95 transition-all flex items-center justify-center gap-3">
                    {isProcessing ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                    {editingPartner.id === 'new' ? 'Hoàn tất khởi tạo' : 'Lưu thay đổi hồ sơ'}
                  </button>
                  <button type="button" onClick={() => handlePartnerEditSelect(null)} className="px-10 py-5 bg-white/5 text-text-dim hover:text-white border border-white/10 rounded-[24px] text-sm font-black uppercase tracking-[0.3em] transition-all hover:bg-white/10">Hủy bỏ</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Advanced Multi-Partner Edit Modal */}
      <AnimatePresence>
        {multiPartnerEdit && multiPartnerEdit.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-card-dark rounded-[56px] shadow-[0_60px_150px_rgba(0,0,0,0.7)] w-full max-w-6xl overflow-hidden border border-white/10 flex flex-col max-h-[95vh]"
            >
              {/* Premium Batch Header */}
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/5 relative">
                <div className="absolute bottom-0 left-0 h-[2px] bg-primary transition-all duration-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]" style={{ width: `${((multiPartnerEdit.currentIndex + 1) / partners.length) * 100}%` }} />

                <div className="flex items-center gap-6">
                  <div className="size-16 bg-gradient-to-tr from-primary to-orange-400 text-white rounded-[24px] flex items-center justify-center shadow-2xl">
                    <Layers className="size-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-widest">Trung tâm chỉnh sửa hàng loạt</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        Đối tác {multiPartnerEdit.currentIndex + 1} / {partners.length}
                      </span>
                      <div className="h-1 w-32 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${((multiPartnerEdit.currentIndex + 1) / partners.length) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right mr-4">
                    <div className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1 opacity-60">Tiến độ cập nhật</div>
                    <div className="text-sm font-black text-white">{Math.round(((multiPartnerEdit.currentIndex + 1) / partners.length) * 100)}% Hoàn tất</div>
                  </div>
                  <button
                    onClick={() => {
                      if (Object.keys(multiPartnerEdit.drafts).length > 0) {
                        setMultiPartnerEdit(prev => prev ? { ...prev, showExitConfirm: true } : null);
                      } else {
                        window.location.hash = `#/${TAB_CONFIG.partners.hash}/`;
                        setMultiPartnerEdit(null);
                      }
                    }}
                    className="size-12 flex items-center justify-center text-text-dim hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                  >
                    <X className="size-6" />
                  </button>
                </div>
              </div>

              {/* Enhanced Batch Content */}
              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {(() => {
                  const currentPartner = partners[multiPartnerEdit.currentIndex];
                  if (!currentPartner) return null;
                  const draft = multiPartnerEdit.drafts[currentPartner.id] || {};
                  const data = { ...currentPartner, ...draft };

                  const handleFieldChange = (field: keyof Partner, value: string) => {
                    setMultiPartnerEdit(prev => {
                      if (!prev) return null;
                      const currentDraft = prev.drafts[currentPartner.id] || {};
                      return {
                        ...prev,
                        drafts: {
                          ...prev.drafts,
                          [currentPartner.id]: {
                            ...currentDraft,
                            [field]: value
                          }
                        }
                      };
                    });
                  };

                  return (
                    <div className="space-y-12">
                      {/* Section: Identity */}
                      <div className="bg-white/5 p-8 rounded-[32px] border border-white/5 shadow-inner">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-3">
                            <label className="text-[11px] font-black text-text-dim uppercase tracking-widest px-1 flex items-center gap-2">
                              <Building2 className="size-3.5 opacity-50" /> Tên pháp nhân (Hệ thống)
                            </label>
                            <div className="p-5 bg-sidebar-dark/50 border border-white/5 rounded-2xl text-white font-black text-lg tracking-tight shadow-lg">
                              {currentPartner.name}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="text-[11px] font-black text-text-dim uppercase tracking-widest px-1 flex items-center gap-2">
                              <Hash className="size-3.5 opacity-50" /> Mã số thuế
                            </label>
                            <div className="p-5 bg-sidebar-dark/50 border border-white/5 rounded-2xl text-primary font-black text-lg tracking-[0.2em] shadow-lg">
                              {currentPartner.taxCode}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section: Address Mapping */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[11px] font-black text-text-dim uppercase tracking-widest flex items-center gap-2">
                              <History className="size-4 opacity-50" /> Địa chỉ gốc
                            </label>
                            <button
                              onClick={async () => {
                                if (!data.address) return;
                                const result = smartConvertAddress(data.address);
                                if (result.isConverted) {
                                  handleFieldChange('address', result.oldFullAddress || data.address);
                                  handleFieldChange('addressPostMerger', result.fullAddress);
                                  toast("Đã ánh xạ địa chỉ 2025!", "success");
                                } else {
                                  toast("Dữ liệu đã tối ưu", "info");
                                }
                              }}
                              className="text-[10px] font-black text-primary hover:text-white hover:bg-primary px-4 py-2 rounded-xl transition-all border border-primary/30 uppercase tracking-widest flex items-center gap-2"
                            >
                              <Zap className="size-3.5" /> Chuyển đổi 2 cấp
                            </button>
                          </div>
                          <textarea
                            value={data.address || ''}
                            onChange={(e) => handleFieldChange('address', e.target.value)}
                            className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-[28px] text-base font-medium focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white min-h-[120px] leading-relaxed"
                            placeholder="Nhập địa chỉ..."
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[11px] font-black text-text-dim uppercase tracking-widest block px-1 flex items-center gap-2">
                            <MapPin className="size-4 opacity-50" /> Địa chỉ mới sau sáp nhập
                          </label>
                          <textarea
                            value={data.addressPostMerger || ''}
                            onChange={(e) => handleFieldChange('addressPostMerger', e.target.value)}
                            className="w-full px-6 py-5 bg-primary/5 border border-primary/20 rounded-[28px] text-base font-black text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[120px] leading-relaxed placeholder:text-primary/20"
                            placeholder="Hệ thống sẽ tự động điền..."
                          />
                        </div>
                      </div>

                      {/* Section: Finance & Rep */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="space-y-4">
                          <label className="text-[11px] font-black text-text-dim uppercase tracking-widest px-1 flex items-center gap-2">
                            <CreditCard className="size-4 opacity-50" /> Tài khoản ngân hàng
                          </label>
                          <input
                            value={data.accountNumber || ''}
                            onChange={(e) => handleFieldChange('accountNumber', e.target.value)}
                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white"
                            placeholder="Số tài khoản..."
                          />
                        </div>
                        <div className="lg:col-span-2 space-y-4">
                          <label className="text-[11px] font-black text-text-dim uppercase tracking-widest px-1 flex items-center gap-2">
                            <Building className="size-4 opacity-50" /> Ngân hàng & Chi nhánh
                          </label>
                          <input
                            value={data.bankName || ''}
                            onChange={(e) => handleFieldChange('bankName', e.target.value)}
                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white"
                            placeholder="Tên ngân hàng chi tiết..."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="space-y-4">
                          <label className="text-[11px] font-black text-text-dim uppercase tracking-widest px-1 flex items-center gap-2">
                            <UserCheck className="size-4 opacity-50" /> Họ tên đại diện
                          </label>
                          <input
                            value={data.representative || ''}
                            onChange={(e) => handleFieldChange('representative', e.target.value)}
                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white"
                            placeholder="Tên đầy đủ..."
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[11px] font-black text-text-dim uppercase tracking-widest px-1">Chức vụ</label>
                          <input
                            value={data.position || 'Giám đốc'}
                            onChange={(e) => handleFieldChange('position', e.target.value)}
                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white"
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[11px] font-black text-text-dim uppercase tracking-widest px-1">Xưng hô</label>
                          <select
                            value={data.gender || 'Ông'}
                            onChange={(e) => handleFieldChange('gender', e.target.value)}
                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white appearance-none cursor-pointer"
                          >
                            <option value="Ông" className="bg-card-dark text-white">Ông</option>
                            <option value="Bà" className="bg-card-dark text-white">Bà</option>
                          </select>
                        </div>
                      </div>

                      {Object.keys(multiPartnerEdit.drafts[currentPartner.id] || {}).length > 0 && (
                        <div className="flex items-center gap-3 text-primary bg-primary/10 p-5 rounded-[24px] border border-primary/20 animate-pulse">
                          <Clock className="size-5" />
                          <span className="text-[11px] font-black uppercase tracking-widest">Phát hiện thay đổi chưa lưu cho đối tác hiện tại</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Professional Footer Bar */}
              <div className="p-10 bg-white/5 border-t border-white/5 flex flex-col gap-6">
                <div className="flex items-center justify-between gap-10">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setMultiPartnerEdit(prev => prev ? { ...prev, currentIndex: Math.max(0, prev.currentIndex - 1) } : null)}
                      disabled={multiPartnerEdit.currentIndex === 0}
                      className="size-16 flex items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-text-dim hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-xl"
                    >
                      <ChevronLeft className="size-8" />
                    </button>
                    <button
                      onClick={() => setMultiPartnerEdit(prev => prev ? { ...prev, currentIndex: Math.min(partners.length - 1, prev.currentIndex + 1) } : null)}
                      disabled={multiPartnerEdit.currentIndex === partners.length - 1}
                      className="size-16 flex items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-text-dim hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-xl"
                    >
                      <ChevronRight className="size-8" />
                    </button>
                  </div>

                  <div className="flex-1 flex justify-end gap-6">
                    <button
                      onClick={() => {
                        if (Object.keys(multiPartnerEdit.drafts).length > 0) {
                          setMultiPartnerEdit(prev => prev ? { ...prev, showExitConfirm: true } : null);
                        } else {
                          window.location.hash = `#/${TAB_CONFIG.partners.hash}/`;
                          setMultiPartnerEdit(null);
                        }
                      }}
                      className="px-10 py-5 bg-white/5 text-text-dim hover:text-white border border-white/10 rounded-[28px] text-sm font-black uppercase tracking-[0.2em] transition-all hover:bg-white/10"
                    >
                      Thoát phiên làm việc
                    </button>
                    <button
                      onClick={async () => {
                        const drafts = multiPartnerEdit.drafts;
                        const ids = Object.keys(drafts);
                        if (ids.length === 0) return;

                        setIsProcessing(true);
                        try {
                          await Promise.all(ids.map(id => handleUpdatePartner(id, drafts[id])));
                          toast(`Đã đồng bộ hóa dữ liệu cho ${ids.length} đối tác`, "success");
                          window.location.hash = `#/${TAB_CONFIG.partners.hash}/`;
                          setMultiPartnerEdit(null);
                        } catch (err) {
                          toast("Lỗi đồng bộ dữ liệu", "error");
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={Object.keys(multiPartnerEdit.drafts).length === 0 || isProcessing}
                      className={cn(
                        "px-12 py-5 rounded-[28px] text-sm font-black tracking-[0.2em] uppercase shadow-[0_20px_50px_rgba(249,115,22,0.3)] transition-all active:scale-95 flex items-center gap-4",
                        Object.keys(multiPartnerEdit.drafts).length > 0
                          ? "bg-primary text-white hover:translate-y-[-4px]"
                          : "bg-white/5 text-text-dim cursor-not-allowed opacity-40"
                      )}
                    >
                      {isProcessing ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                      Lưu tất cả ({Object.keys(multiPartnerEdit.drafts).length} Thay đổi)
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Exit Confirmation Dialog */}
      <AnimatePresence>
        {multiPartnerEdit && multiPartnerEdit.showExitConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card-dark rounded-[32px] shadow-2xl p-8 max-w-sm w-full border border-border-dark"
            >
              <div className="size-16 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/5">
                <AlertCircle className="size-8" />
              </div>
              <h4 className="text-xl font-black text-white uppercase tracking-widest mb-3">Thoát mà không lưu?</h4>
              <p className="text-sm text-text-dim mb-8 leading-relaxed font-bold">
                Bạn có các thay đổi chưa được cập nhật vào hệ thống. Nếu thoát bây giờ, các chỉnh sửa này sẽ bị mất. Bạn có chắc chắn không?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setMultiPartnerEdit(prev => prev ? { ...prev, showExitConfirm: false } : null)}
                  className="btn-secondary flex-1 py-3 text-[10px]"
                >
                  Quay lại
                </button>
                <button
                  onClick={() => {
                    window.location.hash = `#/${TAB_CONFIG.partners.hash}/`;
                    setMultiPartnerEdit(null);
                  }}
                  className="flex-1 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg"
                >
                  Có, thoát đi
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showBulkExport && (
          <BulkExportModal
            invoices={invoices}
            partners={partners}
            onClose={() => setShowBulkExport(false)}
            rankMap={rankMap}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isInvoiceSelectorOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setIsInvoiceSelectorOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card-dark w-full max-w-[1240px] h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-border-dark"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-border-dark flex items-center justify-between bg-white/5 relative z-50 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-xl shadow-none">
                    <ShoppingBag className="size-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-widest uppercase flex items-center gap-2">
                      Lấy bảng từ hóa đơn
                      {getContractCategory() && (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded-md text-[10px] font-black uppercase shadow-sm">
                          {getContractCategory()}
                        </span>
                      )}
                    </h2>
                    <p className="text-[11px] text-text-dim font-bold uppercase tracking-widest mt-1">
                      Tab hiện tại: <span className="text-primary font-black">{getFriendlyLabel(activeInvoiceTag || '')}</span>
                    </p>
                  </div>
                </div>

                <div className="flex-1 max-w-sm mx-10 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-text-dim" />
                  <input
                    type="text"
                    placeholder="Tìm số CT, tên tệp..."
                    value={selectorSearch}
                    onChange={(e) => setSelectorSearch(e.target.value)}
                    className="w-full pl-11 pr-12 py-2.5 bg-sidebar-dark border border-border-dark rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none text-white placeholder:text-text-dim"
                  />
                  {selectorSearch && (
                    <button
                      onClick={() => setSelectorSearch('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim hover:text-white p-1"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex bg-sidebar-dark p-1.5 rounded-2xl border border-border-dark">
                    <button
                      onClick={() => setInvoiceFilterMode('all')}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        invoiceFilterMode === 'all' ? "bg-white/10 text-primary shadow-sm" : "text-text-dim hover:text-white"
                      )}
                    >
                      Tất cả
                    </button>
                    <button
                      onClick={() => setInvoiceFilterMode('seller')}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        invoiceFilterMode === 'seller' ? "bg-white/10 text-primary shadow-sm" : "text-text-dim hover:text-white"
                      )}
                    >
                      Bên bán
                    </button>
                    <button
                      onClick={() => setInvoiceFilterMode('buyer')}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        invoiceFilterMode === 'buyer' ? "bg-white/10 text-primary shadow-sm" : "text-text-dim hover:text-white"
                      )}
                    >
                      Bên mua
                    </button>
                  </div>
                  <button
                    onClick={() => setIsInvoiceSelectorOpen(false)}
                    className="p-3 text-text-dim hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                  >
                    <X className="size-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 flex overflow-hidden bg-sidebar-dark gap-6 p-6">
                {(() => {
                  const term = selectorSearch.toLowerCase().trim();

                  const filtered = invoices
                    .filter(inv => {
                      const contractCat = getContractCategory();
                      const invCat = getInvoiceCategory(inv);
                      if (contractCat && invCat && invCat.toLowerCase() !== contractCat.toLowerCase()) return false;

                      if (invoiceFilterMode === 'seller') {
                        let filterTaxCode = '';
                        if (selectedInvoices.length > 0) {
                          const refInv = invoices.find(i => i.id === selectedInvoices[0]);
                          const data = refInv?.extractedData || {};
                          filterTaxCode = data.seller?.taxCode || refInv?.sellerTaxCode || '';
                        }
                        if (!filterTaxCode) {
                          const sellerA = partners.find(p => p.id === contractForm.selectedPartyAId);
                          if (sellerA) filterTaxCode = sellerA.taxCode;
                        }
                        if (filterTaxCode) {
                          const invSellerTax = inv.extractedData?.seller?.taxCode || inv.sellerTaxCode;
                          if (invSellerTax !== filterTaxCode) return false;
                        }
                      } else if (invoiceFilterMode === 'buyer') {
                        let filterTaxCode = '';
                        if (selectedInvoices.length > 0) {
                          const refInv = invoices.find(i => i.id === selectedInvoices[0]);
                          const data = refInv?.extractedData || {};
                          filterTaxCode = data.buyer?.taxCode || refInv?.buyerTaxCode || '';
                        }
                        if (!filterTaxCode) {
                          const buyerB = partners.find(p => p.id === contractForm.selectedPartyBId);
                          if (buyerB) filterTaxCode = buyerB.taxCode;
                        }
                        if (filterTaxCode) {
                          const invBuyerTax = inv.extractedData?.buyer?.taxCode || inv.buyerTaxCode;
                          if (invBuyerTax !== filterTaxCode) return false;
                        }
                      }

                      // Search filter
                      if (term) {
                        const enriched = getEnrichedInvoice(inv, rankMap);
                        const invNum = (enriched.computedInvoiceNumber || '').toLowerCase();
                        const seller = (inv.extractedData?.seller?.name || '').toLowerCase();
                        const buyer = (inv.extractedData?.buyer?.name || '').toLowerCase();
                        const fileName = (inv.fileName || '').toLowerCase();

                        return invNum.includes(term) || fileName.includes(term) || seller.includes(term) || buyer.includes(term);
                      }

                      return true;
                    })
                    .map(inv => getEnrichedInvoice(inv, rankMap))
                    .sort((a, b) => (a.computedRank || 0) - (b.computedRank || 0));

                  const pdfInvoices = filtered.filter(i => i.fileType === 'pdf');
                  const xmlInvoices = filtered.filter(i => i.fileType === 'xml');

                  const renderCol = (list: any[], title: string, icon: any, color: string, bgColor: string, placement: 'left' | 'right' = 'right') => (
                    <div className="flex-1 flex flex-col min-w-0 bg-card-dark rounded-[32px] border border-border-dark shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-border-dark flex items-center justify-between bg-white/5">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-2 rounded-xl", bgColor)}>
                            {React.createElement(icon, { className: cn("size-4", color) })}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-text-dim">{title}</span>
                        </div>
                        <span className="text-xs font-black text-white">{list.length}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {list.map((inv, index) => {
                          const isSelected = selectedInvoices.includes(inv.id);
                          const data = inv.extractedData || {};

                          // Transform to InvoiceItem for HoverCard/TapCard
                          const hoverInv = {
                            id: inv.id,
                            invoiceNumber: inv.computedInvoiceNumber || '---',
                            invoiceSymbol: inv.computedInvoiceSymbol || data.invoice?.serial || undefined,
                            companyName: data.seller?.name || '---',
                            taxCode: data.seller?.taxCode || '---',
                            buyerName: data.buyer?.name || '---',
                            buyerTaxCode: data.buyer?.taxCode || '---',
                            classification: typeof data.classification === 'object' ? data.classification.type : (data.classification || 'BB_VT'),
                            address: data.buyer?.address || '---',
                            date: data.invoice?.date || data.date || '',
                            contractNumber: inv.contractNumber || '',
                            contractDate: inv.contractDate || '',
                            status: 'paid',
                            type: inv.fileType === 'pdf' ? 'PDF' : 'XML',
                            total: Number(data.totals?.grandTotal) || 0,
                            vat: Number(data.totals?.vatAmount) || 0,
                            items: (data.items || []).map((item: any) => ({
                              id: item.id || `${item.description || ''}-${Number(item.quantity) || 0}-${Number(item.unitPrice || item.price) || 0}`,
                              description: item.description || item.name || '---',
                              unit: item.unit || '-',
                              quantity: Number(item.quantity) || 0,
                              price: Number(item.unitPrice || item.price) || 0,
                              total: Number(item.amount || item.total) || 0
                            }))
                          };

                          return (
                            <InvoiceResponsiveCard
                              key={inv.id}
                              invoice={hoverInv as any}
                              placement={placement}
                            >
                              <motion.div
                                whileHover={{ y: -2 }}
                                onClick={() => {
                                  setSelectedInvoices(prev =>
                                    prev.includes(inv.id) ? prev.filter(id => id !== inv.id) : [...prev, inv.id]
                                  );
                                  setPreviewInvoiceId(inv.id);
                                }}
                                className={cn(
                                  "p-4 rounded-3xl border transition-all cursor-pointer relative",
                                  isSelected
                                    ? "bg-primary/5 border-primary shadow-xl ring-1 ring-primary/20"
                                    : "bg-white/5 border-border-dark hover:border-primary/50 hover:shadow-lg",
                                  previewInvoiceId === inv.id && !isSelected && "border-primary ring-2 ring-primary/20"
                                )}
                              >
                                <div className="flex items-start gap-4">
                                  <div className={cn(
                                    "size-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                                    isSelected ? "bg-primary text-white" : "bg-white/5 text-text-dim border border-border-dark"
                                  )}>
                                    {isSelected ? <CheckCircle2 className="size-5" /> : (inv.fileType === 'pdf' ? <FileText className="size-5" /> : <FileCode className="size-5" />)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-black text-white truncate mb-1">
                                      {index + 1}. Hóa đơn số: {inv.computedInvoiceSymbol ? `${inv.computedInvoiceSymbol}-` : ''}{inv.computedInvoiceNumber || '---'}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <span className={cn(
                                        "px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0",
                                        inv.fileType === 'pdf' ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                      )}>
                                        {inv.fileType}
                                      </span>
                                      <div className="text-[10px] font-bold text-text-dim bg-white/5 border border-border-dark px-2 py-0.5 rounded uppercase">HĐ: {inv.computedInvoiceNumber || '---'}</div>
                                      <div className="text-[10px] font-bold text-text-dim uppercase">Ngày: {formatDisplayDate(data.invoice?.date || data.date || '---')}</div>
                                    </div>
                                    <div className="mt-2 text-[10px] font-bold text-text-dim line-clamp-1 uppercase opacity-60">
                                      BÁN: {data.seller?.name || '---'}
                                    </div>
                                  </div>
                                  {inv.extractedData?.classification && (
                                    <div className={cn(
                                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm shrink-0 border",
                                      inv.extractedData.classification === 'BB_TC' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                        inv.extractedData.classification === 'BB_CM' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                          'bg-green-500/20 text-green-400 border-green-500/30'
                                    )}>
                                      {inv.extractedData.classification.replace('BB_', '')}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            </InvoiceResponsiveCard>
                          );
                        })}
                        {list.length === 0 && (
                          <div className="py-20 text-center opacity-30 text-white">
                            <FileQuestion className="size-12 mx-auto mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Không có dữ liệu</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );

                  return renderCol(filtered, "Danh sách hóa đơn hệ thống (PDF & XML)", Library, "text-primary", "bg-primary/20", "right");
                })()}

                {/* Right: Detailed Preview Panel - Wider (500px) */}
                <div className="w-[500px] bg-card-dark border border-border-dark shadow-2xl rounded-[32px] flex flex-col relative z-20 overflow-hidden">
                  {(() => {
                    const activeRawInv = invoices.find(i => i.id === (previewInvoiceId || (selectedInvoices.length > 0 ? selectedInvoices[selectedInvoices.length - 1] : null)));
                    const activeInv = activeRawInv ? getEnrichedInvoice(activeRawInv, rankMap) : null;

                    let modalDisplayName = activeInv?.computedDisplayName;
                    if (activeInv) {
                      const sameTypeList = invoices.filter(i => i.fileType === activeInv.fileType);
                      const localIdx = sameTypeList.findIndex(i => i.id === activeInv.id);
                      if (localIdx !== -1) {
                        const displaySymbol = activeInv.computedInvoiceSymbol ? `${activeInv.computedInvoiceSymbol}-` : '';
                        modalDisplayName = `${localIdx + 1}. Hóa đơn số: ${displaySymbol}${activeInv.computedInvoiceNumber || '---'}`;
                      }
                    }
                    if (!activeInv) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-dim">
                          <Search className="size-16 mb-4 opacity-20" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Nhấp chọn để xem nhanh</p>
                        </div>
                      );
                    }

                    const data = activeInv.extractedData || {};
                    const items = data.items || data.lineItems || activeInv.lineItems || [];

                    return (
                      <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Preview Header */}
                        <div className="p-6 border-b border-primary/20 bg-primary/10 text-white shadow-xl relative">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Search className="size-20 rotate-12" />
                          </div>
                          <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30 backdrop-blur-md">
                                <Search className="size-5" />
                              </div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-primary">Chi tiết hóa đơn</div>
                            </div>
                            <div className="bg-primary/20 px-3 py-1.5 rounded-lg border border-primary/30 text-[10px] font-black uppercase text-primary">
                              {formatDisplayDate(data.invoice?.date || data.date || '---')}
                            </div>
                          </div>
                          <div className="font-black text-base leading-tight break-words tracking-tight uppercase relative z-10 text-white">{modalDisplayName}</div>
                        </div>

                        {/* Preview Content */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6 bg-transparent">
                          {/* Partners info */}
                          <div className="space-y-4">
                            <div className="bg-white/5 rounded-3xl p-5 border border-border-dark shadow-sm">
                              <div className="text-[9px] font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Building2 className="size-3.5" /> BÊN BÁN
                              </div>
                              <div className="text-xs font-black text-white leading-relaxed uppercase">
                                {data.seller?.name || '---'}
                              </div>
                              <div className="mt-2 text-[10px] font-bold text-text-dim">MST: {data.seller?.taxCode || '---'}</div>
                            </div>
                            <div className="bg-white/5 rounded-3xl p-5 border border-border-dark shadow-sm">
                              <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <UserSquare2 className="size-3.5" /> BÊN MUA
                              </div>
                              <div className="text-xs font-black text-white leading-relaxed uppercase">
                                {data.buyer?.name || '---'}
                              </div>
                              <div className="mt-2 text-[10px] font-bold text-text-dim">MST: {data.buyer?.taxCode || '---'}</div>
                            </div>
                          </div>

                          {/* Items List */}
                          <div className="space-y-3">
                            <div className="text-[9px] font-black text-text-dim uppercase tracking-widest px-2">Hàng hóa & Dịch vụ</div>
                            <div className="space-y-2">
                              {items.map((item: any, idx: number) => {
                                const safeParseVal = (v: any) => {
                                  if (typeof v === 'number') return v;
                                  const s = String(v || '0').replace(/[^0-9]/g, '');
                                  return parseInt(s, 10) || 0;
                                };
                                const qty = safeParseVal(item.quantity || item.SL || '0');
                                const price = safeParseVal(item.unitPrice || item.Don_Gia || '0');
                                const totalVal = safeParseVal(item.total || item.Thanh_Tien || item.amount);
                                const calcTotal = totalVal || (qty * price);
                                return (
                                  <div key={item.id || `item-preview-${idx}-${item.description || ''}`} className="p-4 rounded-2xl bg-white/5 border border-border-dark shadow-sm">
                                    <div className="text-[11px] font-black text-white mb-2 uppercase line-clamp-2">
                                      {item.description || item.name}
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                      <div className="text-[10px] font-bold text-text-dim">
                                        {qty} × {formatThousands(String(price))} {item.unit || ''}
                                      </div>
                                      <div className="text-xs font-black text-emerald-400">
                                        {formatThousands(String(calcTotal))} đ
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Preview Footer */}
                        {(() => {
                          const safeParse = (v: any) => {
                            if (typeof v === 'number') return v;
                            const s = String(v || '0').replace(/[^0-9]/g, '');
                            return parseInt(s, 10) || 0;
                          };
                          const gTotal = safeParse(data.totals?.grandTotal || data.totals?.totalAmount || '0');
                          return (
                            <div className="p-6 bg-sidebar-dark border-t border-border-dark shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
                              <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">Tổng thanh toán</span>
                                  <span className="text-[10px] font-bold text-white/40 uppercase">Đã bao gồm thuế</span>
                                </div>
                                <div className="text-2xl font-black text-emerald-400 tracking-tighter">
                                  {formatThousands(String(gTotal))} <span className="text-xs">đ</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-border-dark bg-card-dark flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-6">
                  <div className="flex gap-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] mb-1">Số lượng chọn</span>
                      <div className="text-2xl font-black text-white leading-none">{selectedInvoices.length}</div>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-border-dark"></div>
                  <button
                    onClick={() => setSelectedInvoices([])}
                    className="text-[10px] font-black uppercase text-text-dim hover:text-red-500 transition-colors"
                  >
                    Hủy chọn tất cả
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsInvoiceSelectorOpen(false)}
                    className="px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-text-dim hover:bg-white/5 transition-all border-2 border-transparent hover:border-border-dark hover:text-white"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={() => handleContractInvoiceIntegration(selectedInvoices)}
                    disabled={selectedInvoices.length === 0}
                    className="btn-primary px-12 py-4 text-[11px] flex items-center gap-3 group relative overflow-hidden disabled:opacity-50 disabled:shadow-none"
                  >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative">Xác nhận dữ liệu</span>
                    <ArrowRight className="size-5 relative" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center">
          <div className="bg-card-dark p-8 rounded-[32px] shadow-2xl flex flex-col items-center max-w-xs text-center border border-border-dark">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 shadow-lg shadow-primary/5">
              <Loader2 className="size-8 text-primary animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest">Đang xử lý hóa đơn</h3>
            <p className="text-text-dim text-sm italic font-bold leading-relaxed">Hệ thống đang trích xuất dữ liệu từ các tệp của bạn. Quá trình này có thể mất vài giây…</p>
          </div>
        </div>
      )}

      <AIChatBox stats={{ invoices, contracts, partners }} />
    </div>
  );
}