import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Users, 
  FileText, 
  Files, 
  Search, 
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
  Trash2,
  Edit2,
  HardHat,
  Box,
  Construction,
  Package,
  ChevronLeft,
  ChevronRight,
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
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp,
  getDocs,
  where,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import imageCompression from 'browser-image-compression';
import * as XLSX from 'xlsx';
import { db, handleFirestoreError, OperationType, auth, storage } from './lib/firebase';
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

// --- Types ---
type Tab = 'dashboard' | 'upload' | 'partners' | 'templates' | 'docs' | 'contract';

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
    { id: 'templates', icon: FileText, label: 'Mẫu tài liệu' },
    { id: 'docs', icon: Files, label: 'Tài liệu đã tạo' },
  ];

  const { addToast } = useToast();

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    // Force standard login flow
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      console.log("Starting Google login...");
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      addToast(`Lỗi đăng nhập: ${error.message}`, "error");
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

  return {
    ...inv,
    computedRank: rank,
    computedInvoiceNumber: displayInvoiceNumber,
    computedInvoiceSymbol: invoiceSymbol,
    computedDisplayName: displayName
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
                    switch(type) {
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
                    switch(type) {
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

// --- View: Contract Management ---
const ContractManagementView = ({ 
  contracts, 
  partners, 
  onDelete, 
  onBulkDelete, 
  searchTerm,
  onSearchChange,
  onDownload
}: { 
  contracts: SmartContract[], 
  partners: Partner[], 
  onDelete: (id: string) => void,
  onBulkDelete: (ids: string[]) => void,
  searchTerm: string,
  onSearchChange: (val: string) => void,
  onDownload: (contract: SmartContract) => void
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

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

  const getContractValue = (data: Record<string, string>) => {
    if (!data) return '';
    const keys = ['GIA_TRI', 'GIA_TRI_HD', 'PHI', 'TONG_PHI', 'SO_TIEN', 'GIATRI', 'SOTIEN'];
    const uppercaseData: Record<string, string> = {};
    for (const [key, val] of Object.entries(data)) {
      uppercaseData[key.toUpperCase()] = val;
    }
    for (const k of keys) {
      const val = data[k] || uppercaseData[k];
      if (val && val.trim()) return val;
    }
    return '';
  };

  const getContractSignDate = (data: Record<string, string>) => {
    if (!data) return '';
    const dKeys = ['NGAY', 'NGAY_KY', 'NGAY_HD'];
    const mKeys = ['THANG', 'THANG_KY', 'THANG_HD'];
    const yKeys = ['NAM', 'NAM_KY', 'NAM_HD'];

    const uppercaseData: Record<string, string> = {};
    for (const [key, val] of Object.entries(data)) {
      uppercaseData[key.toUpperCase()] = val;
    }

    const findVal = (list: string[]) => {
      for (const k of list) {
        const val = data[k] || uppercaseData[k];
        if (val && val.trim()) return val;
      }
      return '';
    };

    const d = findVal(dKeys);
    const m = findVal(mKeys);
    const y = findVal(yKeys);

    if (d && m && y) return `${d}/${m}/${y}`;
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Search and Actions */}
      <div className="bg-card-dark p-6 rounded-[24px] border border-border-dark shadow-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="size-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
          <input 
            type="text"
            placeholder="Tìm kiếm theo tên hợp đồng, loại mẫu..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-sidebar-dark border border-border-dark rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-white placeholder:text-text-dim"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
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
                "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all shadow-lg",
                isDeletingBulk ? "bg-red-500 text-white border-red-500 animate-pulse shadow-red-500/20" : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
              )}
            >
              <Trash2 className="size-4" />
              {isDeletingBulk ? "Xác nhận xóa ngay" : `Xóa ${selectedIds.length} hợp đồng`}
            </button>
          )}
          <button 
            onClick={toggleSelectAll}
            className="flex-1 md:flex-none px-6 py-3 bg-white/5 border border-border-dark text-text-dim rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all whitespace-nowrap shadow-sm"
          >
            {selectedIds.length === filteredContracts.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
        </div>
      </div>

      <div className="bg-card-dark rounded-[32px] border border-border-dark overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-white/5 border-b border-border-dark">
                <th className="p-6 w-14">
                  <div className="flex justify-center">
                    <input 
                      type="checkbox" 
                      checked={filteredContracts.length > 0 && selectedIds.length === filteredContracts.length}
                      onChange={toggleSelectAll}
                      className="size-5 rounded bg-sidebar-dark border-border-dark text-primary focus:ring-primary cursor-pointer accent-primary"
                    />
                  </div>
                </th>
                <th className="p-6 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Hợp đồng</th>
                <th className="p-6 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Đối tác liên quan</th>
                <th className="p-6 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Thông tin chi tiết</th>
                <th className="p-6 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Ngày khởi tạo</th>
                <th className="py-6 pl-6 pr-[100px] text-right text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-32 text-center">
                    <div className="size-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-border-dark shadow-2xl">
                      <Briefcase className="size-10 text-text-dim" />
                    </div>
                    <h3 className="text-white font-black mb-2 uppercase text-base tracking-widest">Không có dữ liệu</h3>
                    <p className="text-text-dim text-xs font-bold italic">Tạo hợp đồng mới trong tab "Tạo hợp đồng" để bắt đầu lưu trữ.</p>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => {
                  const isSelected = selectedIds.includes(contract.id);
                  const signDate = getContractSignDate(contract.formData);
                  const contractValue = getContractValue(contract.formData);

                  return (
                    <tr 
                      key={contract.id} 
                      className={cn(
                        "group hover:bg-white/5 transition-all cursor-pointer",
                        isSelected ? "bg-primary/5" : ""
                      )}
                      onClick={() => toggleSelect(contract.id)}
                    >
                      <td className="p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelect(contract.id)}
                            className="size-5 rounded bg-sidebar-dark border-border-dark text-primary focus:ring-primary cursor-pointer accent-primary"
                          />
                        </div>
                      </td>
                      <td className="p-6 max-w-[300px]">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border",
                            contract.templateId === 'HDNT' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                            contract.templateId === 'HDTC' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          )}>
                            <FileText className="size-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-black text-white leading-tight mb-2 break-words group-hover:text-primary transition-colors">{contract.fileName}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black bg-white/5 border border-border-dark text-text-dim px-2 py-1 rounded-lg uppercase tracking-[0.2em]">
                                {contract.templateId}
                              </span>
                              <span className="text-[10px] text-text-dim font-bold">ID: {contract.id.slice(-6).toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black border border-primary/20 shadow-sm shadow-primary/5">A</div>
                            <div className="text-xs font-bold text-white whitespace-normal line-clamp-1" title={getPartyName(contract.partyAId)}>
                              {getPartyName(contract.partyAId)}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="size-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[10px] font-black border border-emerald-500/20 shadow-sm shadow-emerald-500/5">B</div>
                            <div className="text-xs font-bold text-white whitespace-normal line-clamp-1" title={getPartyName(contract.partyBId)}>
                              {getPartyName(contract.partyBId)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="space-y-3">
                          {contractValue && (
                            <div className="flex items-center gap-3">
                              <DollarSign className="size-4 text-emerald-500" />
                              <div className="text-[11px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
                                {contractValue}
                              </div>
                            </div>
                          )}
                          {signDate && (
                            <div className="flex items-center gap-3">
                              <PenTool className="size-4 text-primary" />
                              <div className="text-[11px] font-black text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg">
                                Ký: {signDate}
                              </div>
                            </div>
                          )}
                          {!contractValue && !signDate && (
                            <span className="text-[11px] text-text-dim font-bold italic uppercase tracking-widest opacity-50">Không có dữ liệu</span>
                          )}
                        </div>
                      </td>
                      <td className="p-6 text-xs text-text-dim font-bold">
                        <div className="flex items-center gap-2">
                          <Calendar className="size-4 opacity-40" />
                          {contract.createdAt?.toDate ? contract.createdAt.toDate().toLocaleDateString('vi-VN') : '---'}
                        </div>
                      </td>
                      <td className="py-6 pl-6 pr-[100px] text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => onDownload(contract)}
                            className="p-3 text-text-dim hover:text-white hover:bg-white/10 rounded-xl border border-transparent hover:border-border-dark transition-all shadow-sm"
                            title="Tải về máy"
                          >
                            <Download className="size-5" />
                          </button>
                          <button 
                            onClick={() => onDelete(contract.id)}
                            className="p-3 text-text-dim hover:text-red-500 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all shadow-sm"
                            title="Xóa vĩnh viễn"
                          >
                            <Trash2 className="size-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
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
  rankMap
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
  rankMap: Map<string, number>
}) => {
  const [fileSearchTerm, setFileSearchTerm] = useState('');
  const [docSearchTerm, setDocSearchTerm] = useState('');

  const enrichedInvoices = useMemo(() => {
    return (stats.recentInvoices || []).map((inv: any) => getEnrichedInvoice(inv, rankMap));
  }, [stats.recentInvoices, rankMap]);

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

  const handleUpdateInvoice = useCallback(async (id: string, data: any) => {
    try {
        await updateDoc(doc(db, 'invoices', id), data);
    } catch (error) {
        console.error('Update error:', error);
    }
  }, []);

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

        await addDoc(collection(db, 'generated_docs'), {
            invoiceId: inv.id,
            templateType: tType,
            fileName: `${tType}_${inv.fileName.split('.')[0]}.docx`,
            ownerId: user.uid,
            createdAt: serverTimestamp()
        }).catch(error => handleFirestoreError(error, OperationType.CREATE, 'generated_docs'));
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

    return sortedItems.map((inv: any, index: number) => {
      const displayInvoiceNumber = inv.computedInvoiceNumber || '';
      const displaySymbol = inv.computedInvoiceSymbol || inv.extractedData?.invoice?.serial || '';
      const localRank = index + 1;
      const displayFullNumber = displaySymbol ? `${displaySymbol}-${displayInvoiceNumber}` : displayInvoiceNumber;
      const displayName = `${localRank}. Hóa đơn số: ${displayFullNumber || '---'}`;
      
      const rawDate = inv.extractedData?.invoice?.date || inv.extractedData?.date || '';
      const displayDate = rawDate ? formatDisplayDate(rawDate) : (inv.createdAt?.toDate ? new Date(inv.createdAt.toDate()).toLocaleDateString() : '');

      const seller = inv.extractedData?.seller;
      const buyer = inv.extractedData?.buyer;
      const itemsList = inv.extractedData?.items || [];

      return (
        <InvoiceItemComp 
          key={inv.id}
          displayName={displayName}
          placement={placement}
          invoice={{
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
            contractNumber: inv.contractNumber || '',
            contractDate: inv.contractDate || '',
            status: (inv.status === 'completed' || inv.status === 'processing') ? 'paid' : 'pending',
            type: inv.fileType === 'pdf' ? 'PDF' : 'XML',
            total: Number(inv.extractedData?.totals?.grandTotal) || 0,
            vat: Number(inv.extractedData?.totals?.vatAmount) || 0,
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
          }}
          onGenerateDoc={(invoice, overrides) => handleGenerateDoc(inv, overrides)}
          onUpdate={(data) => handleUpdateInvoice(inv.id, data)}
          onDelete={onDeleteInvoice}
        />
      );
    });
  };

  return (
    <div className="space-y-6 overflow-y-auto h-full p-1 scroll-smooth">
      {/* Overview Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Hợp đồng cần xử lý', value: stats.pending, color: 'text-orange-500', icon: Clock },
          { label: 'Đối tác liên kết', value: stats.partners, color: 'text-blue-500', icon: Users },
          { label: 'Hóa đơn hệ thống', value: stats.invoices, color: 'text-emerald-500', icon: FileText },
          { label: 'Hồ sơ đã hoàn tất', value: generatedDocs.length, color: 'text-indigo-500', icon: ShieldCheck },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card group"
          >
            <div className="relative z-10">
              <div className="stat-label">{stat.label}</div>
              <div className="flex items-end gap-3">
                <div className="stat-value">
                  {isLoadingData ? <Skeleton className="h-12 w-24" /> : stat.value}
                </div>
                <span className="text-[10px] font-black text-text-dim mb-1.5 uppercase tracking-wider">Mục dữ liệu</span>
              </div>
            </div>
            <stat.icon className={cn("absolute right-4 top-1/2 -translate-y-1/2 size-16 opacity-[0.05] group-hover:opacity-[0.15] transition-all duration-500", stat.color)} />
          </motion.div>
        ))}
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
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                {/* Column PDF */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <div className="size-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50 animate-pulse" />
                      <h3 className="font-black text-xs text-text-dim uppercase tracking-[0.2em]">DANH SÁCH HÓA ĐƠN PDF / ẢNH</h3>
                    </div>
                    <span className="text-[10px] font-black text-white bg-white/5 border border-border-dark px-4 py-1.5 rounded-xl uppercase tracking-widest">{pdfFiles.length} TỆP</span>
                  </div>
                  <div className="space-y-3">
                    {/* Search Bar for PDF specifically */}
                    <div className="relative group">
                      <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-red-500 transition-colors" />
                      <input 
                        type="text"
                        placeholder="Tìm trong danh sách PDF..."
                        value={fileSearchTerm}
                        onChange={(e) => setFileSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-sidebar-dark border border-border-dark rounded-2xl text-xs focus:outline-none focus:border-red-500/40 focus:ring-4 focus:ring-red-500/5 transition-all font-bold text-white placeholder:text-text-dim shadow-2xl"
                      />
                    </div>
                    {isLoadingData ? (
                      <>
                        <Skeleton className="h-20 w-full rounded-2xl" />
                        <Skeleton className="h-20 w-full rounded-2xl" />
                        <Skeleton className="h-20 w-full rounded-2xl" />
                      </>
                    ) : pdfFiles.length === 0 ? (
                      <div className="text-center py-20 bg-sidebar-dark rounded-3xl border border-dashed border-border-dark text-text-dim text-xs italic font-medium uppercase tracking-widest">
                        {fileSearchTerm ? "Không tìm thấy kết quả" : "Trống"}
                      </div>
                    ) : (
                      renderInvoiceList(pdfFiles, "right")
                    )}
                  </div>
                </section>

                {/* Column XML */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <div className="size-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50" />
                      <h3 className="font-black text-xs text-text-dim uppercase tracking-[0.2em]">DANH SÁCH HÓA ĐƠN XML</h3>
                    </div>
                    <span className="text-[10px] font-black text-white bg-white/5 border border-border-dark px-4 py-1.5 rounded-xl uppercase tracking-widest">{xmlFiles.length} TỆP</span>
                  </div>
                  <div className="space-y-3">
                    {/* Search Bar for XML specifically */}
                    <div className="relative group">
                      <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-amber-500 transition-colors" />
                      <input 
                        type="text"
                        placeholder="Tìm trong danh sách XML..."
                         value={docSearchTerm}
                         onChange={(e) => setDocSearchTerm(e.target.value)}
                         className="w-full pl-12 pr-4 py-3.5 bg-sidebar-dark border border-border-dark rounded-2xl text-xs focus:outline-none focus:border-amber-500/40 focus:ring-4 focus:ring-amber-500/5 transition-all font-bold text-white placeholder:text-text-dim shadow-2xl"
                       />
                    </div>
                    {isLoadingData ? (
                      <>
                        <Skeleton className="h-20 w-full rounded-2xl" />
                        <Skeleton className="h-20 w-full rounded-2xl" />
                        <Skeleton className="h-20 w-full rounded-2xl" />
                      </>
                    ) : xmlFiles.length === 0 ? (
                      <div className="text-center py-20 bg-white/5 rounded-[32px] border border-dashed border-border-dark text-text-dim text-[10px] italic font-black uppercase tracking-widest">
                        {docSearchTerm ? "Không tìm thấy kết quả" : "Trống"}
                      </div>
                    ) : (
                      renderInvoiceList(xmlFiles, "left")
                    )}
                  </div>
                </section>
              </div>
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
            />
          )}
        </motion.div>
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
  rejectedFiles: {file: File, reason: string}[],
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

const getFriendlyLabel = (tag: string) => {
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
  
  // Default: replace underscores and lowercase
  return tag.replace(/_/g, ' ').trim().charAt(0).toUpperCase() + tag.replace(/_/g, ' ').trim().slice(1).toLowerCase();
};

interface TagInputProps {
  tag: string;
  value: string;
  onChange: (val: string) => void;
  onAutoFill?: (partyType: 'A' | 'B') => void;
  onOpenSelector?: () => void;
  activeParty?: 'A' | 'B' | null;
  hideWrapperStyle?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({ tag, value, onChange, onAutoFill, onOpenSelector, activeParty, hideWrapperStyle }) => {
  const upper = tag.toUpperCase();
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
                Khu vực hiển thị bảng dữ liệu chi tiết<br/>
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
            placeholder={`Nhập ${friendlyLabel.toLowerCase()}...`}
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
  
  // MERGER_DATE for address conversion logic
  const MERGER_DATE = '2025-01-01';

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

    // Safety for HDTC: ensure DIADIEM is present in categories if template is HDTC
    const currentTags = [...tags];
    if (selectedTemplate === 'HDTC' && !currentTags.some(t => {
      const u = t.toUpperCase();
      return u === 'DIA_DIEM' || u === 'DIADIEM' || u === 'DIA DIEM';
    })) {
      currentTags.push('DIADIEM');
    }

    const finalPartyA = filterGrouped(categories.partyA);
    const finalPartyB = filterGrouped(categories.partyB);
    const finalGeneral = filterGrouped(categories.general);
    
    // Supplement general if DIADIEM was missing in original tags but added via safety
    if (selectedTemplate === 'HDTC' && !finalGeneral.some(t => {
      const u = t.toUpperCase();
      return u === 'DIA_DIEM' || u === 'DIADIEM' || u === 'DIA DIEM';
    }) && currentTags.includes('DIADIEM')) {
      finalGeneral.push('DIADIEM');
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
      const order = [CONTRACT_NUMBER_VARIANTS, 'DIADIEM', 'DIA_DIEM', 'GOITHAU', 'GOI_THAU', 'TENCONGTRINH', 'TEN_CONGTRINH', 'GIATRIHOPDONG', 'BANGCHUGIATRI'];
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
    { id: 'HDNT', name: 'Hợp đồng Nguyên Tắc', file: 'Template_HDNT.docx' },
    { id: 'HDTC', name: 'Hợp đồng Thi Công', file: 'Template_HDTC.docx' },
    { id: 'HDCM', name: 'Hợp đồng Ca Máy', file: 'Template_HDCM.docx' }
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
      
      const finalPath = `${basePath}templatesHopDong/${template.file}`.replace(/\/+/g, '/');
      const response = await fetch(finalPath);
      if (!response.ok) throw new Error('Không thể tải template');
      const buffer = await response.arrayBuffer();
      setTemplateBuffer(buffer);
      const extractedTags = extractTags(buffer);
      setTags(extractedTags);
      
      let finalTags = [...extractedTags];
      
      // HDTC needs DIADIEM field even if not in template tags
      if (templateId === 'HDTC' && !finalTags.some(t => {
        const u = t.toUpperCase();
        return u === 'DIA_DIEM' || u === 'DIADIEM' || u === 'DIA DIEM';
      })) {
        finalTags.push('DIADIEM');
      }
      
      setTags(finalTags);
      
      // When switching templates, we only initialize missing tags for the NEW template's specific data
      setFormData((oldDataForThisTemplate: Record<string, string>) => {
        const next = { ...oldDataForThisTemplate };
        finalTags.forEach(tag => {
          if (next[tag] === undefined) next[tag] = '';
        });
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
    
    return {
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
      [`DAI_DIEN_${prefix}`]: partner.representative,
      [`DAIDIEN_${prefix}`]: partner.representative,
      [`CHUC_VU_${prefix}`]: partner.position,
      [`CHUCVU_${prefix}`]: partner.position,
      [`GIOI_TINH_${prefix}`]: partner.gender,
      [`STK_${prefix}`]: partner.accountNumber,
      [`NH_${prefix}`]: partner.bankName,
      // Common variations
      [`${isA ? 'BENA' : 'BENB'}`]: partner.name,
      [`${isA ? 'BENA' : 'BENB'}_VT`]: abbrName,
      [`DIA_CHI_${isA ? 'BEN_A' : 'BEN_B'}`]: effectiveAddress,
      [`DIACHI_${isA ? 'BEN_A' : 'BEN_B'}`]: effectiveAddress,
      [`MST_${isA ? 'BEN_A' : 'BEN_B'}`]: partner.taxCode,
      [`DAI_DIEN_${isA ? 'BEN_A' : 'BEN_B'}`]: partner.representative,
      [`CHUC_VU_${isA ? 'BEN_A' : 'BEN_B'}`]: partner.position,
    };
  };

  const handlePartyChange = (partnerId: string, type: 'A' | 'B') => {
    if (type === 'A') setSelectedPartyAId(partnerId);
    else setSelectedPartyBId(partnerId);

    const partner = partners.find(p => p.id === partnerId);
    if (!partner) return;

    const newFormData = { ...formData };
    const mapping = getMappingForPartner(partner, type);

    // Chúng ta lặp qua danh sách tag từ template + các tag ảo để đảm bảo cập nhật đầy đủ
    const allTags = new Set([...tags, 'DIA_CHI_A', 'DIA_CHI_B', 'DIACHI_A', 'DIACHI_B', 'DIA_CHI_BEN_A', 'DIA_CHI_BEN_B']);
    
    allTags.forEach(tag => {
      const upperTag = tag.toUpperCase();
      // Try direct match from mapping
      if (mapping[upperTag]) {
        newFormData[tag] = mapping[upperTag]!;
      } else {
        // Try fuzzy matching for common patterns - use stricter checks
        const isSideA = upperTag.includes('BENA') || upperTag.includes('BEN_A') || upperTag.includes('BEN A') || upperTag.endsWith('_A') || upperTag.startsWith('A_');
        const isSideB = upperTag.includes('BENB') || upperTag.includes('BEN_B') || upperTag.includes('BEN B') || upperTag.endsWith('_B') || upperTag.startsWith('B_');
        
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
      
      const parties: Array<{id: string, type: 'A' | 'B'}> = [
        { id: selectedPartyAId, type: 'A' },
        { id: selectedPartyBId, type: 'B' }
      ];

      parties.forEach(({id, type}) => {
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
            upperTag.startsWith('A_');

          const isSideB = 
            upperTag.endsWith('_B') || 
            upperTag.includes('BEN_B') || 
            upperTag.includes('BEN B') || 
            upperTag.includes('BENB') || 
            upperTag.startsWith('B_');

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
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, { 
        paragraphLoop: true, 
        linebreaks: true, 
        delimiters: { start: "[", end: "]" } 
      });
      
      const dataToRender: Record<string, string> = {};
      Object.keys(formData).forEach(tag => {
        const upper = tag.toUpperCase();
        // Skip dots for common table-related tags if empty
        const isTableTag = upper.includes('NOI_DUNG') || 
                           upper.includes('DVT') || 
                           upper.includes('SOLUONG') || 
                           upper.includes('SL') || 
                           upper.includes('DON_GIA') ||
                           upper.includes('DONGIA') ||
                           upper.includes('THANHTIEN') ||
                           upper.includes('THANH_TIEN');
                           
        dataToRender[tag] = formData[tag] || (isTableTag ? "" : "....................");
      });

      doc.render(dataToRender);
      const out = doc.getZip().generate({ type: 'blob', compression: 'DEFLATE' });
      const templateName = CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate)?.name || 'HopDong';
      const fileName = `${templateName}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.docx`;
      
      saveAs(out, fileName);
      
      // Save metadata to Firestore
      await onContractSaved({
        templateId: selectedTemplate,
        partyAId: selectedPartyAId,
        partyBId: selectedPartyBId,
        formData: formData,
        fileName: fileName
      });

      toast("Đã tạo hợp đồng và lưu vào hệ thống!", "success");
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
            <div className="flex-1 flex flex-col bg-sidebar-dark relative rounded-2xl overflow-hidden border border-border-dark shadow-sm">
              {/* Data Entry Tabs/Sections */}
              <div className="bg-card-dark border-b border-border-dark px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center font-black text-sm shadow-md">3</div>
                    <div>
                      <h3 className="font-black text-sm text-white tracking-tight">Cấu hình dữ liệu chi tiết</h3>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-4">
                {/* Dates Section */}
                {dateGroups.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-text-dim uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="size-3" /> THỜI GIAN
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {dateGroups.map(group => (
                        <div key={group.id} className="p-2 bg-primary/5 rounded-xl border border-primary/20">
                          <label className="text-[10px] font-black text-primary block mb-1 uppercase">{group.label}</label>
                          <div className="flex items-center gap-1">
                            <div className="flex-1 flex items-center gap-1 bg-card-dark border border-border-dark rounded-lg px-2 py-1">
                              <input
                                type="text"
                                ref={(el) => { dayRefs.current[group.id] = el; }}
                                placeholder="Ngày"
                                className="w-10 text-center text-xs font-bold bg-transparent outline-none text-white placeholder:text-text-dim"
                                value={formData[group.day || ''] || ''}
                                maxLength={2}
                                onChange={(e) => {
                                  let val = e.target.value.replace(/\D/g, '');
                                  if (val.length > 0 && parseInt(val) > 31) val = '31';
                                  if (val.length <= 2) {
                                    setFormData((p: any) => ({ ...p, [group.day || '']: val }));
                                    if (val.length === 2 && group.month) {
                                      monthRefs.current[group.id]?.focus();
                                    }
                                  }
                                }}
                              />
                              <span className="text-text-dim">/</span>
                              <input
                                type="text"
                                ref={(el) => { monthRefs.current[group.id] = el; }}
                                placeholder="Tháng"
                                className="w-10 text-center text-xs font-bold bg-transparent outline-none text-white placeholder:text-text-dim"
                                value={formData[group.month || ''] || ''}
                                maxLength={2}
                                onChange={(e) => {
                                  let val = e.target.value.replace(/\D/g, '');
                                  if (val.length > 0 && parseInt(val) > 12) val = '12';
                                  if (val.length <= 2) {
                                    setFormData((p: any) => ({ ...p, [group.month || '']: val }));
                                    if (val.length === 2 && group.year) {
                                      yearRefs.current[group.id]?.focus();
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Backspace' && !formData[group.month || ''] && group.day) {
                                    dayRefs.current[group.id]?.focus();
                                  }
                                }}
                              />
                              <span className="text-text-dim">/</span>
                              <input
                                type="text"
                                ref={(el) => { yearRefs.current[group.id] = el; }}
                                placeholder="Năm"
                                className="w-14 text-center text-xs font-bold bg-transparent outline-none text-white placeholder:text-text-dim"
                                value={formData[group.year || ''] || ''}
                                maxLength={4}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  if (val.length <= 4) {
                                    setFormData((p: any) => ({ ...p, [group.year || '']: val }));
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Backspace' && !formData[group.year || ''] && group.month) {
                                    monthRefs.current[group.id]?.focus();
                                  }
                                }}
                                onBlur={(e) => {
                                  const val = e.target.value;
                                  if (val.length === 2 && /^\d+$/.test(val)) {
                                    setFormData((p: any) => ({ ...p, [group.year || '']: '20' + val }));
                                  }
                                }}
                              />
                            </div>
                            <div className="relative">
                              <button className="p-1.5 bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-all flex items-center justify-center">
                                <Calendar className="size-3.5" />
                                <input 
                                  type="date"
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                  onChange={(e) => handleDateGroupChange(group.id, e.target.value)}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* General Info Tags Section */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-dim uppercase tracking-widest flex items-center gap-1.5">
                    <Database className="size-3" /> THÔNG TIN & GIÁ TRỊ
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pb-6">
                    {(() => {
                      const giatriTag = categorizedTags.general.find(t => t.toUpperCase() === 'GIATRIHOPDONG');
                      const bangchuTag = categorizedTags.general.find(t => {
                        const u = t.toUpperCase();
                        return u === 'BANGCHUGIATRI' || (u.includes('BANG') && u.includes('CHU') && u.includes('GIA'));
                      });
                      
                      return categorizedTags.general.filter(tag => tag !== bangchuTag).map(tag => {
                      const u = tag.toUpperCase();
                      const isFullWidth = u.includes('BANG') || u.includes('DIA_DIEM') || u.includes('DIADIEM') || u.includes('NOI_DUNG') || u.includes('TENCONGTRINH') || u.includes('TEN_CONGTRINH') || u.includes('GOITHAU') || u.includes('GOI_THAU');
                      const isHalfWidth = u.includes('SO_HD') || u.includes('SOHD') || u.includes('MST') || u.includes('DAI_DIEN') || u.includes('CHUC_VU');
                      const isCurrency = ['GIATRI', 'GIA_TRI', 'SO_TIEN', 'PHI', 'THANH_TIEN', 'TONG_TIEN'].some(v => u.includes(v)) && !u.includes('CHU');

                      if (tag === giatriTag && bangchuTag) {
                        return (
                          <div key="giatri-combined" className="md:col-span-12 relative flex flex-col md:flex-row bg-card-dark border border-border-dark rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary transition-all shadow-sm">
                             <div className="flex-1 relative border-b md:border-b-0 md:border-r border-border-dark">
                               <TagRenderItem tag={giatriTag} {...commonItemProps} hideWrapperStyle />
                               {((isCurrency && selectedTemplate === 'HDTC')) && (
                                 <button 
                                   onClick={(e) => {
                                     e.preventDefault();
                                     setActiveInvoiceTag?.(giatriTag);
                                     setIsInvoiceSelectorOpen?.(true);
                                   }}
                                   className="absolute top-1 right-1 flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 rounded-lg text-[8px] font-black uppercase tracking-tighter shadow-sm transition-all z-10"
                                 >
                                   <Layers className="size-2.5" /> Bóc tách
                                 </button>
                               )}
                             </div>
                             <div className="flex-1 relative bg-sidebar-dark">
                               <TagRenderItem tag={bangchuTag} {...commonItemProps} hideWrapperStyle />
                             </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={tag} 
                          className={cn(
                            isFullWidth ? "md:col-span-12" : 
                            isHalfWidth ? "md:col-span-6" : 
                            "md:col-span-4",
                            "relative"
                          )}
                        >
                          <TagRenderItem tag={tag} {...commonItemProps} />
                          {(((isCurrency && selectedTemplate === 'HDTC') || (!isCurrency && (u.includes('BANG') || u.includes('TENCONGTRINH') || u.includes('GOITHAU') || u.includes('DIA_DIEM') || u.includes('DIADIEM'))))) && (
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                setActiveInvoiceTag?.(tag);
                                setIsInvoiceSelectorOpen?.(true);
                              }}
                              className="absolute top-1 right-1 flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 rounded-lg text-[8px] font-black uppercase tracking-tighter shadow-sm transition-all z-10"
                            >
                              <Layers className="size-2.5" /> Bóc tách
                            </button>
                          )}
                        </div>
                      );
                    });
                    })()}
                  </div>
                </div>

                {/* Optional side parties if selected */}
                {(selectedPartyAId || selectedPartyBId) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedPartyAId && categorizedTags.partyA.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-2 border-l-2 border-primary">Thông tin Bên A</label>
                        <div className="p-2 bg-card-dark rounded-xl border border-border-dark shadow-sm">
                           {renderCategorizedPartyTags(categorizedTags.partyA)}
                        </div>
                      </div>
                    )}
                    {selectedPartyBId && categorizedTags.partyB.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest pl-2 border-l-2 border-emerald-500">Thông tin Bên B</label>
                        <div className="p-2 bg-card-dark rounded-xl border border-border-dark shadow-sm">
                           {renderCategorizedPartyTags(categorizedTags.partyB)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-card-dark border-t border-border-dark p-2 flex items-center justify-between text-[9px] text-text-dim">
                 <div className="flex items-center gap-1.5 uppercase font-black tracking-widest">
                   <ShieldCheck className="size-3 text-emerald-500" /> Hệ thống bảo mật
                 </div>
                 <div className="italic">Dữ liệu trống mặc định: <span className="text-primary">"............"</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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

          {/* 2 Columns View */}
          <div className="flex-1 flex overflow-hidden p-6 gap-6">
            {renderList(pdfList, "Danh sách PDF", FileText, "text-red-500")}
            {renderList(xmlList, "Danh sách XML", FileCode, "text-emerald-500")}
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
    const local = await loadTemplates();
    const found = local.find(t => t.id === templateId);
    if (found) {
      const binaryString = window.atob(found.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }
    
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
  templates: { hash: 'mau-tai-lieu', label: 'Mẫu tài liệu' },
  docs: { hash: 'tai-lieu-da-tao', label: 'Tài liệu đã tạo' },
  contract: { hash: 'tao-hop-dong', label: 'Tạo hợp đồng' }
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
  const [activeTab, setActiveTab ] = useState<Tab>('dashboard');
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
  const [showBulkExport, setShowBulkExport] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const timeLeftRef = useRef(0);
  const timerRef = useRef<any>(null);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [pendingReview, setPendingReview] = useState<{file: File, docRef: any, data: any} | null>(null);
  const { toast, clearToasts, removeToast } = useToast();

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
          return u === 'DIADIEM' || u === 'DIA_DIEM';
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
      // Create Professional Markdown Table for goods/services
      let markdownTable = "| STT | Nội dung hàng hóa, dịch vụ | ĐVT | Số lượng | Đơn giá | Thành tiền |\n";
      markdownTable += "|:---:|:---|:---:|---:|---:|---:|\n";
      
      const safeParse = (v: any) => {
        if (typeof v === 'number') return v;
        const s = String(v || '0').replace(/[^0-9]/g, '');
        return parseInt(s, 10) || 0;
      };

      const template = contractForm.selectedTemplate;
      const isSpecialContract = template === 'HDNT' || template === 'HDCM';
      
      let itemsToDisplay: any[] = [];
      const rawItems: any[] = [];

      selectedDatas.forEach(inv => {
        const data = inv.extractedData || {};
        const items = data.items || data.lineItems || inv.lineItems || [];
        rawItems.push(...items);
      });

      if (isSpecialContract) {
        // Merge items logic: Group by (Name/Description, Unit, Price)
        const mergedMap = new Map<string, any>();
        
        rawItems.forEach(item => {
          const desc = (item.description || item.name || '---').trim();
          const unit = (item.unit || item.DVT || '---').trim();
          const price = safeParse(item.unitPrice || item.Don_Gia || '0');
          
          // Create a unique key for grouping
          const key = `${desc.toLowerCase()}|${unit.toLowerCase()}|${price}`;
          
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
              total: totalLine
            });
          }
        });
        
        itemsToDisplay = Array.from(mergedMap.values());
      } else {
        itemsToDisplay = rawItems.map(item => {
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

      let count = 1;
      let total = 0;

      itemsToDisplay.forEach((item: any) => {
        markdownTable += `| ${count++} | ${item.description} | ${item.unit} | ${item.quantity} | ${formatThousands(String(item.unitPrice))} | ${formatThousands(String(item.total))} |\n`;
        total += item.total;
      });

      if (isSpecialContract) {
        const vat = Math.round(total * 0.1);
        const grandTotal = total + vat;
        
        markdownTable += `| | TỔNG CỘNG TIỀN HÀNG | | | | ${formatThousands(String(total))} |\n`;
        markdownTable += `| | THUẾ GIÁ TRỊ GIA TĂNG (10%) | | | | ${formatThousands(String(vat))} |\n`;
        markdownTable += `| | TỔNG CỘNG TIỀN THANH TOÁN | | | | ${formatThousands(String(grandTotal))} |`;
        
        const valueTag = contractForm.tags.find(t => {
          const u = t.toUpperCase();
          return (u.includes('GIATRI') || u.includes('SO_TIEN')) && !u.includes('BANG') && !u.includes('CHU');
        });
        if (valueTag) {
          handleContractFieldChange(valueTag, String(grandTotal));
        }
      } else {
        markdownTable += `| | TỔNG CỘNG | | | | ${formatThousands(String(total))} |`;
      }

      handleContractFieldChange(activeInvoiceTag, markdownTable);
    } else {
      // Sum value for numeric field
      const safeParse = (v: any) => {
        if (typeof v === 'number') return v;
        return parseFloat(String(v || '0').replace(/[^0-9.-]+/g, '')) || 0;
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
    if (inv.category) return inv.category;
    const data = inv.extractedData || {};
    const r = data.classification;
    if (!r) return null;
    const t = typeof r === 'object' ? r.type : r;
    switch(t) {
      case 'BB_VT': return 'Vật tư';
      case 'BB_CM': return 'Ca máy';
      case 'BB_TC': return 'Thi công';
      default: return null;
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
      const mapping: Record<string, string> = {
        'HDNT': 'Template_HDNT.docx',
        'HDTC': 'Template_HDTC.docx',
        'HDCM': 'Template_HDCM.docx'
      };
      
      const file = mapping[contract.templateId];
      if (!file) throw new Error("Template mapping not found");

      let basePath = (import.meta as any).env?.BASE_URL || './';
      if (basePath === './') {
        const pathSegments = window.location.pathname.split('/');
        basePath = pathSegments.slice(0, -1).join('/') + '/';
      }
      if (!basePath.endsWith('/')) basePath += '/';
      
      const finalPath = `${basePath}templatesHopDong/${file}`.replace(/\/+/g, '/');
      const response = await fetch(finalPath);
      if (!response.ok) throw new Error('Không thể tải template để tạo file tải xuống');
      const buffer = await response.arrayBuffer();

      const zip = new PizZip(buffer);
      const docT = new Docxtemplater(zip, { 
        paragraphLoop: true, 
        linebreaks: true, 
        delimiters: { start: "[", end: "]" } 
      });

      const dataToRender: Record<string, string> = {};
      Object.keys(contract.formData).forEach(tag => {
        dataToRender[tag] = contract.formData[tag] || "....................";
      });

      docT.render(dataToRender);
      const out = docT.getZip().generate({ type: 'blob', compression: 'DEFLATE' });
      saveAs(out, contract.fileName);
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

        const actualSlug = foundTab === 'dashboard' ? (parts.length > 2 ? parts[parts.length-1] : slug) : slug;
        
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
    // Load persisted templates on start
    const loadPersisted = async () => {
      try {
        const stored = await loadTemplates();
        if (stored.length > 0) {
          toast(`Đã tải ${stored.length} mẫu tài liệu từ bộ nhớ trình duyệt`, 'info');
          // We can't easily tell the server about these unless we upload them
          // But for now, we'll try to sync or at least show which ones are local
        }
      } catch (err) {
        console.error("Failed to load local templates:", err);
      }
    };
    loadPersisted();
  }, [toast]);

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


  const [availableTemplates, setAvailableTemplates] = useState<string[]>([]);
  const [localTemplates, setLocalTemplates] = useState<StoredTemplate[]>([]);

  const fetchTemplates = async () => {
    try {
      const staticTemplates = ['BB_VT', 'BB_CM', 'BB_TC'];
      const local = await loadTemplates();
      setLocalTemplates(local);
      const localIds = local.map(t => t.id);
      
      const all = Array.from(new Set([...staticTemplates, ...localIds]));
      setAvailableTemplates(all);
    } catch (e) {
      console.error("Failed to fetch templates:", e);
      setAvailableTemplates(['BB_VT', 'BB_CM', 'BB_TC']);
    }
  };

  useEffect(() => {
    fetchTemplates();
    loadTemplates().then(setLocalTemplates).catch(console.error);
  }, [activeTab]);

  const restoreTemplate = async (id: string) => {
    const local = localTemplates.find(t => t.id === id);
    if (!local) return;

    setIsProcessing(true);
    try {
      // Convert base64 to blob
      const byteCharacters = atob(local.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: local.type });
      const file = new File([blob], local.name, { type: local.type });

      const formData = new FormData();
      formData.append('templateType', id);
      formData.append('template', file);

      const res = await fetch('/api/upload-template', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        toast(`Đã khôi phục mẫu ${local.category} từ bộ nhớ`, 'success');
        fetchTemplates();
      } else {
        throw new Error("Restore failed");
      }
    } catch (err) {
      toast("Lỗi khi khôi phục mẫu tài liệu", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePartner = async (id: string, updates: Partial<Partner>) => {
    if (!user) return;
    try {
      if (id === 'new') {
         await addDoc(collection(db, 'partners'), cleanObject({
           ...updates,
           createdAt: serverTimestamp(),
           updatedAt: serverTimestamp(),
           ownerId: user.uid
         }));
      } else {
        await updateDoc(doc(db, 'partners', id), cleanObject({
          ...updates,
          updatedAt: serverTimestamp()
        }));
      }
    } catch (error) {
      handleFirestoreError(error, id === 'new' ? OperationType.CREATE : OperationType.UPDATE, `partners/${id}`);
    }
  };

  const handleDeletePartner = async (id: string) => {
    console.log("handleDeletePartner called with id:", id);
    try {
      await deleteDoc(doc(db, 'partners', id));
      toast("Đã xóa đối tác thành công", "success");
    } catch (error) {
      console.error("Delete partner error:", error);
      handleFirestoreError(error, OperationType.DELETE, `partners/${id}`);
      toast("Lỗi khi xóa đối tác", "error");
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    console.log("handleDeleteInvoice called with id:", id);
    try {
      await deleteDoc(doc(db, 'invoices', id));
      console.log("Invoice deleted successfully");
    } catch (error) {
      console.error("Delete invoice error:", error);
      handleFirestoreError(error, OperationType.DELETE, `invoices/${id}`);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    console.log("Attempting to delete doc:", id);
    try {
      await deleteDoc(doc(db, 'generated_docs', id));
      toast('Đã xóa 1 tài liệu');
    } catch (error: any) {
      console.error("Delete doc error:", error);
      toast(`Lỗi khi xóa tài liệu: ${error.message || 'Không xác định'}`, 'error');
      try {
        handleFirestoreError(error, OperationType.DELETE, `generated_docs/${id}`);
      } catch (err) {
        // Already handled error
      }
    }
  };

  const handleBulkDeleteDocs = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    console.log("Attempting to bulk delete docs:", ids);
    try {
      setIsProcessing(true);
      // Fallback to individual deletes if batch is tricky, 
      // but let's keep batch first and see if individual error handling helps
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, 'generated_docs', id));
      });
      await batch.commit();
      toast(`Đã xóa ${ids.length} tài liệu thành công`);
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast(`Lỗi khi xóa hàng loạt: ${error.message || 'Không xác định'}`, 'error');
      
      // If batch fails, try individual as fallback for debugging
      console.log("Trying individual deletes as fallback...");
      let successCount = 0;
      for (const id of ids) {
        try {
          await deleteDoc(doc(db, 'generated_docs', id));
          successCount++;
        } catch (e) {
          console.error(`Failed to delete individual doc ${id}:`, e);
        }
      }
      if (successCount > 0) {
        toast(`Đã xóa thủ công được ${successCount}/${ids.length} tài liệu`);
      }
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
      await addDoc(collection(db, 'contracts'), {
        ...data,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      }).catch(error => handleFirestoreError(error, OperationType.CREATE, 'contracts'));
    } catch (err: any) {
      toast("Lỗi khi lưu hợp đồng: " + err.message, "error");
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa hợp đồng này?")) return;
    try {
      await deleteDoc(doc(db, 'contracts', id));
      toast("Đã xóa hợp đồng", "success");
    } catch (err: any) {
      toast("Lỗi khi xóa: " + err.message, "error");
    }
  };

  const handleBulkDeleteContracts = async (ids: string[]) => {
    if (!confirm(`Bạn có chắc muốn xóa ${ids.length} hợp đồng?`)) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, 'contracts', id));
      });
      await batch.commit();
      toast(`Đã xóa ${ids.length} hợp đồng`, "success");
    } catch (err: any) {
      toast("Lỗi khi xóa hàng loạt: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    // Only sync if user is authenticated
    let unsubPartners = () => {};
    let unsubInvoices = () => {};
    let unsubDocs = () => {};
    let unsubContracts = () => {};

    if (user) {
      setIsLoadingInvoices(true);
      // Sync data from Firestore
      const qPartners = query(
        collection(db, 'partners'), 
        where('ownerId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );
      unsubPartners = onSnapshot(qPartners, (snap) => {
        setPartners(snap.docs.map(d => {
          const data = d.data();
          return { 
            id: d.id, 
            ...data,
            name: fixNgocTham(data.name)
          } as Partner;
        }));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'partners');
      });

      const qInvoices = query(
        collection(db, 'invoices'), 
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      unsubInvoices = onSnapshot(qInvoices, (snap) => {
        setInvoices(snap.docs.map(d => {
          const data = d.data() as Invoice;
          
          // Deep clone extractedData to avoid mutation and ensure UI updates correctly
          const extractedData = data.extractedData ? { ...data.extractedData } : undefined;
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
            id: d.id, 
            ...data,
            extractedData,
            sellerName: fixNgocTham(data.sellerName),
            buyerName: fixNgocTham(data.buyerName)
          } as Invoice;
        }));
        setIsLoadingInvoices(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'invoices');
        setIsLoadingInvoices(false);
      });

      const qDocs = query(
        collection(db, 'generated_docs'), 
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      unsubDocs = onSnapshot(qDocs, (snap) => {
        setGeneratedDocs(snap.docs.map(d => ({ id: d.id, ...d.data() } as GeneratedDoc)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'generated_docs');
      });

      const qContracts = query(
        collection(db, 'contracts'), 
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      unsubContracts = onSnapshot(qContracts, (snap) => {
        setContracts(snap.docs.map(d => ({ id: d.id, ...d.data() } as SmartContract)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'contracts');
      });
    } else {
      setPartners([]);
      setInvoices([]);
      setGeneratedDocs([]);
      setContracts([]);
    }

    return () => {
      unsubAuth();
      unsubPartners();
      unsubInvoices();
      unsubDocs();
      unsubContracts();
    };
  }, [user]);

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
  const [rejectedFiles, setRejectedFiles] = useState<{file: File, reason: string}[]>([]);
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
        updateLoading(`Đang xử lý [${i+1}/${filesToProcess.length}]: ${file.name}`);
        console.log(`Processing file ${i+1}/${filesToProcess.length}: ${file.name}`);
        
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

          // Step 1: Create Firestore record
          updateLoading(`Đang đăng ký hóa đơn: ${file.name}`);
          docRef = await addDoc(collection(db, 'invoices'), cleanObject({
            fileName: file.name,
            fileType: fileExt,
            fileURL: fileURL,
            storagePath: filePath,
            status: 'processing',
            ownerId: user.uid,
            createdAt: serverTimestamp()
          }));

          if (!docRef) throw new Error("Không thể khởi tạo bản ghi trong Firestore");

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
                if (docRef) await deleteDoc(docRef);
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
              await updateDoc(docRef, updates);

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
            await updateDoc(docRef, cleanObject({ 
              status: 'error',
              error: innerError.message
            })).catch(e => console.error("Failed to update error status", e));
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
      // Xóa bản ghi tạm khỏi Firestore nếu người dùng hủy
      await deleteDoc(docRef);
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
    const q = query(
      collection(db, 'partners'), 
      where('ownerId', '==', user.uid),
      where('taxCode', '==', p.taxCode)
    );
    const snap = await getDocs(q);
    const existing = snap.docs[0];
    
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
      taxCode: p.taxCode,
      address: finalAddress,
      addressPostMerger: finalAddressPostMerger,
      accountNumber: p.accountNumber || "",
      bankName: p.bankName || "",
      position: p.position || "Giám đốc",
      updatedAt: serverTimestamp(),
      ownerId: user.uid
    };

    if (!existing) {
      await addDoc(collection(db, 'partners'), cleanObject(partnerData));
    } else {
      const current = existing.data();
      const updates: any = {};
      
      // Update fields ONLY if they are currently empty or null
      if (isPostMerger && !current.addressPostMerger && finalAddressPostMerger) {
        updates.addressPostMerger = finalAddressPostMerger;
      }
      if (!isPostMerger && !current.address && finalAddress) {
        updates.address = finalAddress;
      }
      if (!current.accountNumber && p.accountNumber) {
        updates.accountNumber = p.accountNumber;
      }
      if (!current.bankName && p.bankName) {
        updates.bankName = p.bankName;
      }
      if (!current.position) {
        updates.position = "Giám đốc";
      }
      
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        await updateDoc(existing.ref, cleanObject(updates));
      }
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

      await updateDoc(docRef, updates);

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
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invoices/${docRef.id}`);
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
              switch(t) {
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
    pending: invoices.filter(i => i.status === 'processing').length,
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
          <div className="flex items-center gap-2 text-text-dim text-sm italic">
            <span>DocuForge AI</span>
            <span className="text-text-dim/50">/</span>
            <span className="text-white font-bold not-italic uppercase text-xs">
              {(() => {
                switch(activeTab) {
                  case 'dashboard': return 'Bảng điều khiển';
                  case 'upload': return 'Tải lên hóa đơn';
                  case 'partners': return 'Đối tác';
                  case 'templates': return 'Mẫu tài liệu';
                  case 'docs': return 'Tài liệu đã tạo';
                  default: return activeTab;
                }
              })()}
            </span>
          </div>
          <div className="flex items-center gap-6">
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
                  user={user}
                  rankMap={rankMap}
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
                                  await updateDoc(doc(db, 'invoices', selectedInvoice.id), {
                                    contractNumber: val
                                  });
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.UPDATE, `invoices/${selectedInvoice.id}`);
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
                                  await updateDoc(doc(db, 'invoices', selectedInvoice.id), {
                                    contractDate: val
                                  });
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.UPDATE, `invoices/${selectedInvoice.id}`);
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
                              switch(type) {
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

                          if (!availableTemplates.includes(tType)) {
                            alert(`Vui lòng tải lên template "${tType}" trong tab Templates trước.`);
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

                            await addDoc(collection(db, 'generated_docs'), {
                              invoiceId: selectedInvoice.id,
                              templateType: tType,
                              fileName: `${tType}_${selectedInvoice.fileName.split('.')[0]}.docx`,
                              ownerId: user.uid,
                              createdAt: serverTimestamp()
                            }).catch(error => handleFirestoreError(error, OperationType.CREATE, 'generated_docs'));
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
              {activeTab === 'templates' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { id: 'BB_CM', label: 'Biên bản Ca Máy', icon: HardHat, desc: 'Dành cho các hóa đơn thuê máy móc, thiết bị.' },
                    { id: 'BB_VT', label: 'Biên bản Vật Tư', icon: Box, desc: 'Dành cho các hóa đơn mua bán vật tư, hàng hóa.' },
                    { id: 'BB_TC', label: 'Biên bản Thi Công', icon: Construction, desc: 'Dành cho các hóa đơn dịch vụ xây dựng, lắp đặt.' },
                  ].map((t) => {
                    const isAvailableOnServer = availableTemplates.includes(t.id);
                    const isAvailableLocally = localTemplates.some(lt => lt.id === t.id);

                    return (
                      <div key={t.id} className="card p-8 flex flex-col items-center text-center group relative overflow-hidden transition-all hover:translate-y-[-4px]">
                        <div className="absolute top-0 right-0 size-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                        {isAvailableLocally && !isAvailableOnServer && (
                          <div className="absolute top-4 right-4 flex items-center gap-1 bg-orange-500/10 text-orange-500 text-[8px] font-black px-2 py-1 uppercase rounded-lg border border-orange-500/20 animate-pulse">
                            <Zap className="size-2" />
                            Cần khôi phục
                          </div>
                        )}
                        <div className={cn(
                          "size-16 rounded-[24px] flex items-center justify-center mb-6 transition-all duration-500 shadow-2xl",
                          isAvailableOnServer 
                          ? "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white" 
                          : "bg-white/5 text-text-dim group-hover:bg-primary group-hover:text-white"
                        )}>
                          <t.icon className="size-8" />
                        </div>
                        <h4 className="text-lg font-black text-white mb-2 tracking-tighter uppercase">{t.label}</h4>
                        <p className="text-text-dim text-xs font-semibold leading-relaxed mb-8 flex-1">{t.desc}</p>
                        
                        <div className="w-full space-y-2">
                          <label className="block w-full">
                            <input 
                              type="file" 
                              className="hidden" 
                              accept=".docx"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                // Persistence: save to IndexedDB
                                const reader = new FileReader();
                                reader.onload = async () => {
                                  try {
                                    const base64 = (reader.result as string).split(',')[1];
                                    await saveTemplate({
                                      id: t.id,
                                      name: file.name,
                                      type: file.type,
                                      data: base64,
                                      category: t.label,
                                      createdAt: Date.now()
                                    });
                                    loadTemplates().then(setLocalTemplates);
                                  } catch (err) {
                                    console.error("Failed to save template locally:", err);
                                  }
                                };
                                reader.readAsDataURL(file);

                                const formData = new FormData();
                                formData.append('templateType', t.id);
                                formData.append('template', file);
                                try {
                                  const res = await fetch('/api/upload-template', {
                                    method: 'POST',
                                    body: formData
                                  });
                                  if (res.ok) {
                                    fetchTemplates();
                                    toast(`Tải lên mẫu ${t.label} thành công. Tệp đã được lưu cục bộ.`, "success");
                                  } else {
                                    throw new Error("Upload failed");
                                  }
                                } catch (err) {
                                  toast("Lỗi khi tải mẫu tài liệu lên máy chủ", "error");
                                }
                              }}
                            />
                            <div className={cn(
                              "cursor-pointer py-2 px-4 rounded-lg text-xs font-bold transition-all border-2 border-dashed",
                              isAvailableOnServer 
                                ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20" 
                                : "bg-sidebar-dark text-text-dim border-border-dark hover:border-primary/50 hover:text-primary"
                            )}>
                              {isAvailableOnServer ? 'Cập nhật Template (.docx)' : 'Tải lên Template (.docx)'}
                            </div>
                          </label>

                          {isAvailableLocally && !isAvailableOnServer && (
                            <button 
                              onClick={() => restoreTemplate(t.id)}
                              className="w-full py-1.5 px-4 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold hover:bg-amber-200 transition-all flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 className="size-3" />
                              Khôi phục từ bộ nhớ
                            </button>
                          )}

                          {isAvailableOnServer ? (
                            <div className="text-[10px] text-green-500 flex items-center justify-center gap-1 font-bold">
                              <div className="size-1.5 rounded-full bg-green-500 animate-pulse" /> Đã sẵn sàng trên máy chủ
                            </div>
                          ) : (
                            <div className="text-[10px] text-text-dim flex items-center justify-center gap-1 font-bold">
                              <div className="size-1.5 rounded-full bg-text-dim" /> Chưa có trên máy chủ
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                                      {isSelected ? <CheckCircle2 className="size-5" /> : <FileText className="size-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[13px] font-black text-white truncate mb-1">
                                        {index + 1}. Hóa đơn số: {inv.computedInvoiceSymbol ? `${inv.computedInvoiceSymbol}-` : ''}{inv.computedInvoiceNumber || '---'}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-3">
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

                  return (
                    <>
                      {renderCol(pdfInvoices, "Hóa đơn PDF", FileText, "text-red-500", "bg-red-500/20", "right")}
                      {renderCol(xmlInvoices, "Hóa đơn XML", FileCode, "text-emerald-500", "bg-emerald-500/20", "left")}
                    </>
                  );
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