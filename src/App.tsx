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
  FileQuestion
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import * as HoverCard from '@radix-ui/react-hover-card';
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
  onAuthStateChanged,
  User
} from 'firebase/auth';
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

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
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
      className="bg-slate-900 text-slate-300 flex flex-col h-full shrink-0 relative z-50 shadow-2xl transition-width duration-150"
    >
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsPinned(!isPinned);
        }}
        className="absolute -right-3 top-20 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg z-10 hover:bg-blue-700 transition-colors"
      >
        {isPinned ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      <div className={cn("p-6 border-b border-slate-800 flex items-center", !isExpanded ? "justify-center" : "justify-between")}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-lg shrink-0">AX</div>
          {isExpanded && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-semibold text-white tracking-tight text-lg whitespace-nowrap"
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
              <item.icon className={cn("w-5 h-5 shrink-0 transition-transform", activeTab === item.id && "scale-110")} />
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
              <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover/item:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/item:translate-x-0 z-[100] whitespace-nowrap border border-slate-700">
                {item.label}
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700" />
              </div>
            )}
          </div>
        ))}
      </nav>
      
      <div className={cn("p-4 border-t border-slate-800", !isExpanded && "flex flex-col items-center")}>
        {user ? (
          <div className={cn("flex items-center gap-3 mb-4 transition-all duration-300", !isExpanded ? "flex-col" : "flex-row")}>
            <div className="relative group/avatar">
              <img 
                src={user.photoURL || ''} 
                alt="" 
                className="w-10 h-10 rounded-full border-2 border-slate-700 hover:border-blue-500 transition-all cursor-pointer shadow-lg" 
                referrerPolicy="no-referrer"
              />
              {!isExpanded && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover/avatar:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/avatar:translate-x-0 z-[100] whitespace-nowrap border border-slate-700">
                  {user.displayName}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700" />
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
                <button onClick={handleLogout} className="text-[10px] text-slate-500 hover:text-red-400 font-bold uppercase transition-colors">Đăng xuất</button>
              </motion.div>
            )}
            {!isExpanded && (
               <button onClick={handleLogout} className="p-2 hover:text-red-400 text-slate-500 transition-colors" title="Đăng xuất">
                 <X className="w-4 h-4" />
               </button>
            )}
          </div>
        ) : (
          <div className="relative group/login">
            <button 
              onClick={handleLogin}
              className={cn(
                "w-full bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all mb-4 flex items-center justify-center shadow-lg active:scale-95",
                !isExpanded ? "p-3" : "py-3 px-4"
              )}
            >
              <Users className="w-5 h-5 shrink-0" />
              {isExpanded && <span className="ml-2">Đăng nhập</span>}
            </button>
            {!isExpanded && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover/login:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/login:translate-x-0 z-[100] whitespace-nowrap border border-slate-700">
                Đăng nhập Google
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700" />
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
            <div className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest px-1">Hệ thống</div>
            <div className="flex items-center gap-2 text-xs bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
              <div className={cn("w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]", user ? "bg-green-500" : "bg-yellow-500")}></div>
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

  if (!invoiceNumber) {
    const match = inv.fileName?.match(/(\d+)(?=\.(pdf|xml)$)/i);
    if (match && match[1]) {
      invoiceNumber = match[1];
    }
  }
  const displayInvoiceNumber = invoiceNumber ? (invoiceNumber.toString().replace(/^0+/, '') || invoiceNumber.toString()) : '';
  
  let displayName = inv.fileName || '';
  if (rank && displayInvoiceNumber) {
    displayName = `${rank}. Hóa đơn số: ${displayInvoiceNumber}`;
  } else if (displayInvoiceNumber) {
    displayName = `Hóa đơn số: ${displayInvoiceNumber}`;
  }

  return {
    ...inv,
    computedRank: rank,
    computedInvoiceNumber: displayInvoiceNumber,
    computedDisplayName: displayName
  };
};

// --- Helper Components ---
const Skeleton = (props: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={cn("animate-pulse bg-slate-200 rounded", props.className)} />
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="modal-title">Kiểm tra kết quả bóc tách</h2>
            <p className="secondary-text mt-1">Vui lòng rà soát lại thông tin trước khi lưu vào hệ thống</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {/* Thông tin hóa đơn */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-indigo-600">
                <FileText className="w-6 h-6" />
                <h3 className="text-base font-semibold uppercase tracking-widest">Thông tin Hóa đơn</h3>
              </div>
              <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100 shadow-sm">
                <Box className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">
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
                <label className="block text-xs font-normal text-slate-400 uppercase tracking-widest mb-2 px-1">Số Hóa Đơn</label>
                <input 
                  type="text" 
                  value={edited.invoice?.number || ''} 
                  onChange={(e) => handleChange('invoice.number', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-normal text-slate-400 uppercase tracking-widest mb-2 px-1">Ký hiệu</label>
                <input 
                  type="text" 
                  value={edited.invoice?.serial || ''} 
                  onChange={(e) => handleChange('invoice.serial', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-normal text-slate-400 uppercase tracking-widest mb-2 px-1">Ngày lập</label>
                <input 
                  type="text" 
                  value={edited.invoice?.date || ''} 
                  onChange={(e) => handleChange('invoice.date', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-normal text-slate-400 uppercase tracking-widest mb-2 px-1">% Thuế GTGT</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={edited.invoice?.vatRate || 8} 
                    onChange={(e) => handleChange('invoice.vatRate', parseFloat(e.target.value))}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all pr-10" 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">%</span>
                </div>
              </div>
            </div>
          </section>

          {/* Người bán & Người mua */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <section className="space-y-6">
              <div className="flex items-center gap-3 text-indigo-600">
                <Layout className="w-6 h-6" />
                <h3 className="font-black text-base uppercase tracking-widest">Đơn vị bán hàng</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tên đơn vị</label>
                  <input 
                    type="text" 
                    value={edited.seller?.name || ''} 
                    onChange={(e) => handleChange('seller.name', e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Mã số thuế</label>
                  <input 
                    type="text" 
                    value={edited.seller?.taxCode || ''} 
                    onChange={(e) => handleChange('seller.taxCode', e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Địa chỉ</label>
                  <input 
                    type="text" 
                    value={edited.seller?.address || ''} 
                    onChange={(e) => handleChange('seller.address', e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Số tài khoản</label>
                    <input 
                      type="text" 
                      value={edited.seller?.accountNumber || ''} 
                      onChange={(e) => handleChange('seller.accountNumber', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Ngân hàng</label>
                    <input 
                      type="text" 
                      value={edited.seller?.bankName || ''} 
                      onChange={(e) => handleChange('seller.bankName', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" 
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3 text-indigo-600">
                <Users className="w-6 h-6" />
                <h3 className="text-base font-semibold uppercase tracking-widest">Khách hàng</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tên đơn vị</label>
                  <input 
                    type="text" 
                    value={edited.buyer?.name || ''} 
                    onChange={(e) => handleChange('buyer.name', e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Mã số thuế</label>
                  <input 
                    type="text" 
                    value={edited.buyer?.taxCode || ''} 
                    onChange={(e) => handleChange('buyer.taxCode', e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Địa chỉ</label>
                  <input 
                    type="text" 
                    value={edited.buyer?.address || ''} 
                    onChange={(e) => handleChange('buyer.address', e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Số tài khoản</label>
                    <input 
                      type="text" 
                      value={edited.buyer?.accountNumber || ''} 
                      onChange={(e) => handleChange('buyer.accountNumber', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Ngân hàng</label>
                    <input 
                      type="text" 
                      value={edited.buyer?.bankName || ''} 
                      onChange={(e) => handleChange('buyer.bankName', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" 
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Danh sách hàng hóa */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <Package className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Chi tiết hàng hóa / dịch vụ</h3>
              </div>
              <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                <Box className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[10px] font-bold text-indigo-600 uppercase">
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
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-base">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider">
                    <th className="p-3 text-center w-12 text-xs">Stt</th>
                    <th className="p-3 text-left">Nội dung</th>
                    <th className="p-3 w-20 text-center text-xs">ĐVT</th>
                    <th className="p-3 w-20 text-center text-xs">SL</th>
                    <th className="p-3 w-28 text-right text-xs">Đơn giá</th>
                    <th className="p-3 w-32 text-right text-xs">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(edited.items || []).map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="p-3 whitespace-normal break-words text-slate-800 leading-relaxed min-w-[200px] font-bold">
                        {item.description || item.name || ''}
                      </td>
                      <td className="p-3 text-center text-slate-600 font-medium">{item.unit || '-'}</td>
                      <td className="p-3 text-center text-slate-600 font-medium italic">
                        {item.quantity && item.quantity !== 0 ? formatVNNumber(item.quantity) : ''}
                      </td>
                      <td className="p-3 text-right text-slate-600 font-medium">
                        {item.unitPrice && item.unitPrice !== 0 ? formatVNNumber(item.unitPrice) : ''}
                      </td>
                      <td className="p-3 text-right font-black text-slate-900 bg-slate-50/20">
                        {formatVNNumber(item.amount || item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

           </section>
          <section className="space-y-6 pt-6 border-t-2 border-slate-100 shadow-inner rounded-2xl p-6 bg-slate-50/50">
            <div className="flex items-center gap-3 text-indigo-600 mb-4">
              <PlusSquare className="w-6 h-6" />
              <h3 className="font-black text-base uppercase tracking-widest">Tổng cộng quyết toán</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-md">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tổng cộng tiền hàng</label>
                <div className="text-xl font-bold text-slate-800">{formatVNNumber(edited.totals?.subtotal)} đ</div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Tiền thuế GTGT ({edited.invoice?.vatRate !== undefined ? edited.invoice.vatRate : (edited.totals?.subtotal > 0 ? Math.round((Math.abs((edited.totals?.grandTotal || (edited.totals?.subtotal + (edited.totals?.vatAmount || 0))) - edited.totals?.subtotal) / edited.totals?.subtotal) * 100) : 8)}%)
                </label>
                <div className="text-xl font-bold text-slate-800">{formatVNNumber(edited.totals?.vatAmount)} đ</div>
              </div>
              <div>
                <label className="block text-xs font-black text-amber-600 uppercase tracking-widest mb-2 px-1 border-l-4 border-amber-500">Tổng tiền thanh toán</label>
                <div className="text-3xl font-black text-indigo-600 tracking-tighter">{formatVNNumber(edited.totals?.grandTotal)} đ</div>
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            Hủy bỏ
          </button>
          <button 
            onClick={() => onSave(edited)} 
            className="btn-primary min-w-[120px]"
          >
            <Check className="w-4 h-4" />
            Lưu vào hệ thống
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const InvoiceItem = React.forwardRef<HTMLDivElement, InvoiceItemProps>(({ inv, onSelectInvoice, onDeleteInvoice, displayName, displayDate }, ref) => (
  <div 
    ref={ref}
    onClick={() => onSelectInvoice(inv)}
    onContextMenu={(e) => {
      e.preventDefault();
      onDeleteInvoice(inv.id);
    }}
    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group"
  >
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-10 h-10 rounded flex items-center justify-center transition-transform group-hover:scale-110",
        inv.fileType === 'xml' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
      )}>
        <FileText className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="font-bold text-base group-hover:text-blue-600 transition-colors truncate max-w-[120px] md:max-w-none">{displayName || inv.fileName}</div>
        <div className="text-xs text-slate-500">{displayDate ? displayDate : (inv.createdAt?.toDate ? new Date(inv.createdAt?.toDate()).toLocaleString() : '')}</div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className={cn(
        "px-2.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider",
        inv.status === 'completed' ? "bg-green-100 text-green-700" : 
        inv.status === 'processing' ? "bg-blue-100 text-blue-700" : 
        "bg-slate-100 text-slate-700"
      )}>
        {inv.status === 'completed' ? 'Đã xong' : 
         inv.status === 'processing' ? 'Đang xử lý' : 
         inv.status === 'pending' ? 'Chờ' : 'Lỗi'}
      </span>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onDeleteInvoice(inv.id);
        }}
        className="w-8 h-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all flex items-center justify-center shrink-0 active:scale-95"
        title="Xóa hóa đơn"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
));

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
    const keys = ['GIA_TRI', 'GIA_TRI_HD', 'PHI', 'TONG_PHI', 'SO_TIEN', 'GIATRI', 'SOTIEN'];
    for (const k of keys) {
      const val = data[k] || Object.entries(data).find(([key]) => key.toUpperCase() === k)?.[1];
      if (val && val.trim()) return val;
    }
    return '';
  };

  const getContractSignDate = (data: Record<string, string>) => {
    const dKeys = ['NGAY', 'NGAY_KY', 'NGAY_HD'];
    const mKeys = ['THANG', 'THANG_KY', 'THANG_HD'];
    const yKeys = ['NAM', 'NAM_KY', 'NAM_HD'];

    const findVal = (list: string[]) => {
      for (const k of list) {
        const val = data[k] || Object.entries(data).find(([key]) => key.toUpperCase() === k)?.[1];
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
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
          <input 
            type="text"
            placeholder="Tìm kiếm theo tên hợp đồng, loại mẫu..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder:text-slate-400"
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
                "flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all shadow-sm",
                isDeletingBulk ? "bg-red-600 border-red-600 text-white animate-pulse" : "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeletingBulk ? "Xác nhận xóa ngay" : `Xóa ${selectedIds.length} hợp đồng`}
            </button>
          )}
          <button 
            onClick={toggleSelectAll}
            className="flex-1 md:flex-none px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all whitespace-nowrap shadow-sm"
          >
            {selectedIds.length === filteredContracts.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/60">
                <th className="p-5 w-14">
                  <div className="flex justify-center">
                    <input 
                      type="checkbox" 
                      checked={filteredContracts.length > 0 && selectedIds.length === filteredContracts.length}
                      onChange={toggleSelectAll}
                      className="w-4.5 h-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </th>
                <th className="p-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hợp đồng</th>
                <th className="p-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đối tác liên quan</th>
                <th className="p-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Thông tin chi tiết</th>
                <th className="p-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ngày khởi tạo</th>
                <th className="p-5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-24 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-100">
                      <Briefcase className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-slate-700 font-bold mb-1 uppercase text-sm tracking-widest">Không có dữ liệu</h3>
                    <p className="text-slate-400 text-xs font-medium italic">Tạo hợp đồng mới trong tab "Tạo hợp đồng" để bắt đầu lưu trữ.</p>
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
                        "group hover:bg-indigo-50/20 transition-all cursor-pointer",
                        isSelected ? "bg-indigo-50/40" : ""
                      )}
                      onClick={() => toggleSelect(contract.id)}
                    >
                      <td className="p-5" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelect(contract.id)}
                            className="w-4.5 h-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>
                      </td>
                      <td className="p-5 max-w-[300px]">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                            contract.templateId === 'HDNT' ? "bg-amber-100 text-amber-600" :
                            contract.templateId === 'HDTC' ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                          )}>
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-slate-800 leading-tight mb-1 break-words">{contract.fileName}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                {contract.templateId}
                              </span>
                              <span className="text-[10px] text-slate-400">ID: {contract.id.slice(-6).toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-[9px] font-bold italic">A</div>
                            <div className="text-[12px] font-bold text-slate-700 whitespace-normal line-clamp-1" title={getPartyName(contract.partyAId)}>
                              {getPartyName(contract.partyAId)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center text-[9px] font-bold italic">B</div>
                            <div className="text-[12px] font-bold text-slate-700 whitespace-normal line-clamp-1" title={getPartyName(contract.partyBId)}>
                              {getPartyName(contract.partyBId)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="space-y-2">
                          {contractValue && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                              <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {contractValue}
                              </div>
                            </div>
                          )}
                          {signDate && (
                            <div className="flex items-center gap-2">
                              <PenTool className="w-3.5 h-3.5 text-indigo-500" />
                              <div className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                Ký: {signDate}
                              </div>
                            </div>
                          )}
                          {!contractValue && !signDate && (
                            <span className="text-[11px] text-slate-400 italic">Không có metadata</span>
                          )}
                        </div>
                      </td>
                      <td className="p-5 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 opacity-40" />
                          {contract.createdAt?.toDate ? contract.createdAt.toDate().toLocaleDateString('vi-VN') : '---'}
                        </div>
                      </td>
                      <td className="p-5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => onDownload(contract)}
                            className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl border border-transparent hover:border-indigo-100 shadow-sm transition-all"
                            title="Tải về máy"
                          >
                            <Download className="w-4.5 h-4.5" />
                          </button>
                          <button 
                            onClick={() => onDelete(contract.id)}
                            className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-xl border border-transparent hover:border-red-100 shadow-sm transition-all"
                            title="Xóa vĩnh viễn"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
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

  const handleGenerateDoc = useCallback(async (inv: any) => {
    if (!user) {
        alert("Bạn cần đăng nhập để tạo biên bản.");
        return;
    }
    const rawClass = inv.extractedData?.classification;
    const tType = typeof rawClass === 'object' ? rawClass.type : (rawClass || 'BB_VT');
    
    // Find partners
    const pA = partners.find(p => p.taxCode === inv.extractedData?.seller?.taxCode) || {};
    const pB = partners.find(p => p.taxCode === inv.extractedData?.buyer?.taxCode) || {};

    try {
        const templateBuffer = await getTemplateBuffer(tType);
        const blob = await generateDocxBlob({
            templateBuffer,
            templateType: tType,
            data: inv.extractedData,
            partnerA: pA,
            partnerB: pB,
            contractNumber: inv.contractNumber,
            contractDate: inv.contractDate
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

  const renderInvoiceList = (items: any[]) => {
    const sortedItems = [...items].sort((a, b) => {
        const dateA = a.contractDate || a.extractedData?.invoice?.date || a.extractedData?.date || '';
        const dateB = b.contractDate || b.extractedData?.invoice?.date || b.extractedData?.date || '';
        const tA = parseInvoiceDate(dateA);
        const tB = parseInvoiceDate(dateB);
        return tA - tB; // chronological oldest -> newest
    });

    return sortedItems.map((inv: any) => {
      const displayInvoiceNumber = inv.computedInvoiceNumber || '';
      const displayName = inv.computedDisplayName || inv.fileName;
      
      const rawDate = inv.contractDate || inv.extractedData?.invoice?.date || inv.extractedData?.date || '';
      const displayDate = rawDate ? formatDisplayDate(rawDate) : (inv.createdAt?.toDate ? new Date(inv.createdAt.toDate()).toLocaleDateString() : '');

      const seller = inv.extractedData?.seller;
      const buyer = inv.extractedData?.buyer;
      const itemsList = inv.extractedData?.items || [];

      return (
        <InvoiceItemComp 
          key={inv.id}
          displayName={displayName}
          invoice={{
            id: inv.id,
            invoiceNumber: displayInvoiceNumber || '---',
            companyName: inv.extractedData?.seller?.name || '---',
            taxCode: inv.extractedData?.seller?.taxCode || '---',
            buyerName: inv.extractedData?.buyer?.name || '---',
            buyerTaxCode: inv.extractedData?.buyer?.taxCode || '---',
            classification: typeof inv.extractedData?.classification === 'object' ? inv.extractedData.classification.type : (inv.extractedData?.classification || 'BB_VT'),
            address: inv.extractedData?.buyer?.address || '---',
            date: inv.contractDate || inv.extractedData?.invoice?.date || inv.extractedData?.date || '',
            status: (inv.status === 'completed' || inv.status === 'processing') ? 'paid' : 'pending',
            type: inv.fileType === 'pdf' ? 'PDF' : 'XML',
            total: Number(inv.extractedData?.totals?.grandTotal) || 0,
            vat: Number(inv.extractedData?.totals?.vatAmount) || 0,
            items: (inv.extractedData?.items || []).map((item: any) => {
                const q = Number(item.quantity) || 0;
                const p = Number(item.unitPrice || item.price) || 0;
                const t = Number(item.amount || item.total || item.totalAmount || item.lineTotal) || (q * p);
                return {
                    id: item.id || Math.random().toString(),
                    description: item.description || item.name || '---',
                    unit: item.unit || '-',
                    quantity: q,
                    price: p,
                    total: t
                };
            })
          }}
          onGenerateDoc={() => handleGenerateDoc(inv)}
          onDelete={onDeleteInvoice}
        />
      );
    });
  };

  return (
    <div className="space-y-6 overflow-y-auto h-full p-1 scroll-smooth">
      {/* Overview Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Hợp đồng cần xử lý', value: stats.pending, color: 'border-l-yellow-500', icon: Clock },
          { label: 'Đối tác liên kết', value: stats.partners, color: 'border-l-blue-500', icon: Users },
          { label: 'Hóa đơn hệ thống', value: stats.invoices, color: 'border-l-green-500', icon: FileText },
          { label: 'Hồ sơ đã hoàn tất', value: generatedDocs.length, color: 'border-l-indigo-500', icon: ShieldCheck },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 group hover:shadow-md transition-all relative overflow-hidden", 
              stat.color
            )}
          >
            <div className="relative z-10">
              <div className="text-sm text-slate-400 font-medium uppercase tracking-widest mb-3">{stat.label}</div>
              <div className="flex items-end gap-3">
                <div className="text-5xl font-black text-slate-900 leading-none tracking-tighter">
                  {isLoadingData ? <Skeleton className="h-12 w-24" /> : stat.value}
                </div>
                <span className="text-xs font-black text-slate-400 mb-1.5 uppercase">Mục dữ liệu</span>
              </div>
            </div>
            <stat.icon className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 text-slate-50 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity" />
          </motion.div>
        ))}
      </div>

      {/* Modern Dashboard Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-200 pb-2">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full md:w-auto">
          <button 
            onClick={() => onSubTabChange('invoices')}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-3 px-10 py-4 rounded-xl font-medium text-sm transition-all duration-300",
              subTab === 'invoices' ? "bg-white text-slate-900 shadow-lg ring-1 ring-slate-200" : "text-slate-500 hover:bg-white/50"
            )}
          >
            <Library className={cn("w-5 h-5", subTab === 'invoices' ? "text-blue-500" : "text-slate-400")} />
            Quản lý hóa đơn
          </button>
          <button 
            onClick={() => onSubTabChange('contracts')}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-3 px-10 py-4 rounded-xl font-medium text-sm transition-all duration-300",
              subTab === 'contracts' ? "bg-white text-slate-900 shadow-lg ring-1 ring-slate-200" : "text-slate-500 hover:bg-white/50"
            )}
          >
            <Briefcase className={cn("w-5 h-5", subTab === 'contracts' ? "text-indigo-500" : "text-slate-400")} />
            Quản lý hợp đồng
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {subTab === 'invoices' && (
            <>
              <button 
                onClick={onBulkExport}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-medium text-sm hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              >
                <Package className="w-4 h-4" />
                HÀNG LOẠT
              </button>
              <button 
                onClick={onExportExcel}
                disabled={isExportingExcel || stats.invoices === 0}
                className={cn(
                  "flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-medium text-sm transition-all shadow-xl active:scale-95 tracking-widest",
                  isExportingExcel ? "bg-slate-100 text-slate-400" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"
                )}
              >
                {isExportingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
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
                <section className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-200" />
                      <h3 className="font-black text-sm text-slate-500 uppercase tracking-[0.15em]">DANH SÁCH PDF</h3>
                    </div>
                    <span className="text-xs font-black text-slate-300 bg-slate-100 px-3 py-1 rounded-full">{pdfFiles.length} TỆP</span>
                  </div>
                  <div className="space-y-3">
                    {/* Search Bar for PDF specifically */}
                    <div className="relative group">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-red-500 transition-colors" />
                      <input 
                        type="text"
                        placeholder="Tìm trong danh sách PDF..."
                        value={fileSearchTerm}
                        onChange={(e) => setFileSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-300 transition-all font-medium shadow-sm"
                      />
                    </div>
                    {isLoadingData ? (
                      [1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
                    ) : pdfFiles.length === 0 ? (
                      <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs italic font-medium uppercase tracking-widest">
                        {fileSearchTerm ? "Không tìm thấy kết quả" : "Trống"}
                      </div>
                    ) : (
                      renderInvoiceList(pdfFiles)
                    )}
                  </div>
                </section>

                {/* Column XML */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-200" />
                      <h3 className="font-black text-sm text-slate-500 uppercase tracking-[0.15em]">DANH SÁCH XML</h3>
                    </div>
                    <span className="text-xs font-black text-slate-300 bg-slate-100 px-3 py-1 rounded-full">{xmlFiles.length} TỆP</span>
                  </div>
                  <div className="space-y-3">
                    {/* Search Bar for XML specifically */}
                    <div className="relative group">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors" />
                      <input 
                        type="text"
                        placeholder="Tìm trong danh sách XML..."
                         value={docSearchTerm}
                         onChange={(e) => setDocSearchTerm(e.target.value)}
                         className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-300 transition-all font-medium shadow-sm"
                       />
                    </div>
                    {isLoadingData ? (
                      [1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
                    ) : xmlFiles.length === 0 ? (
                      <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs italic font-medium uppercase tracking-widest">
                        {docSearchTerm ? "Không tìm thấy kết quả" : "Trống"}
                      </div>
                    ) : (
                      renderInvoiceList(xmlFiles)
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
  onRemove, 
  onProcess, 
  isProcessing 
}: { 
  onUpload: (files: File[]) => void, 
  queue: File[], 
  onRemove: (name: string) => void,
  onProcess: () => void,
  isProcessing: boolean
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    accept: {
      'application/pdf': ['.pdf'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml'],
      'image/*': ['.png', '.jpg', '.jpeg']
    }
  } as any);

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <div 
          {...getRootProps()} 
          className={cn(
            "border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 transition-all cursor-pointer bg-white group",
            isDragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50"
          )}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Kéo và thả hóa đơn vào đây</h3>
          <p className="text-slate-500 text-sm mb-6">Hỗ trợ định dạng PDF, XML và Hình ảnh</p>
          <div className="flex gap-4">
            <button className="px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all shadow-sm">
              CHỌN TỆP TIN
            </button>
          </div>
        </div>
      </div>

      {queue.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
        >
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Hàng chờ xử lý ({queue.length} tệp)</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onProcess(); }}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              BẮT ĐẦU BÓC TÁCH
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-100">
            {/* PDF Column */}
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-red-500 uppercase tracking-[0.2em]">
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]"></div>
                  HÓA ĐƠN PDF / ẢNH
                </div>
                <span className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full font-black">
                  {queue.filter(f => !f.name.toLowerCase().endsWith('.xml')).length}
                </span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {queue.filter(f => !f.name.toLowerCase().endsWith('.xml')).length === 0 && (
                  <div className="py-16 text-center">
                    <p className="text-xs text-slate-300 italic font-black uppercase tracking-widest">Trống</p>
                  </div>
                )}
                {queue.filter(f => !f.name.toLowerCase().endsWith('.xml')).map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 group hover:border-red-200 hover:bg-red-50/20 transition-all shadow-sm">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shadow-inner">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate leading-tight">{file.name}</p>
              <p className="secondary-text mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemove(file.name)} 
                      className="p-2 hover:bg-red-500 hover:text-white rounded-xl text-slate-300 transition-all shadow-sm active:scale-90"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* XML Column */}
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                  HÓA ĐƠN XML
                </div>
                <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">
                  {queue.filter(f => f.name.toLowerCase().endsWith('.xml')).length}
                </span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {queue.filter(f => f.name.toLowerCase().endsWith('.xml')).length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-[10px] text-slate-300 italic font-medium uppercase tracking-widest">Trống</p>
                  </div>
                )}
                {queue.filter(f => f.name.toLowerCase().endsWith('.xml')).map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 group hover:border-amber-100 hover:bg-amber-50/10 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                        <Code className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
              <p className="secondary-text truncate">{file.name}</p>
              <p className="caption-text uppercase">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemove(file.name)} 
                      className="p-1.5 hover:bg-amber-500 hover:text-white rounded-lg text-slate-300 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
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
          "bg-white rounded-2xl border",
          isWords ? "bg-indigo-50/20 border-indigo-100/50" : "border-slate-100",
          activeParty ? "border-indigo-500 shadow-lg ring-4 ring-indigo-500/5" : "hover:border-indigo-300 hover:shadow-md"
        ],
        isTableTag && "cursor-pointer active:scale-[0.99]"
      )}
    >
      <div className="flex justify-between items-center mb-1">
         <div className="flex items-center gap-2">
            {isTableTag ? (
              <div 
                className="text-[11px] font-black uppercase tracking-widest text-indigo-700 flex items-center gap-1.5 px-3 py-1 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-all border border-indigo-200/50 leading-tight"
              >
                <Layers className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" /> {friendlyLabel}
              </div>
            ) : (
              <label className={cn(
                "text-xs font-black uppercase tracking-tight transition-colors px-1 leading-tight",
                activeParty ? "text-indigo-700 border-l-[3px] border-indigo-500 pl-2" : "text-slate-500 group-hover:text-indigo-700 border-l-[3px] border-transparent pl-2"
              )} title={tag}>
                {friendlyLabel}
              </label>
            )}
            {isWords && (
               <span className="flex items-center gap-1.5 text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-md shadow-indigo-100 animate-pulse uppercase tracking-wider">
                 <PenTool className="w-3 h-3" /> TỰ ĐỘNG
               </span>
            )}
         </div>
         <div className="flex items-center gap-2">
            {isVTTag && (
              <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5 shadow-inner border border-slate-200">
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAutoFill?.('A'); }}
                  className={cn(
                    "px-2 py-1 text-[9px] font-black rounded-lg transition-all",
                    activeParty === 'A' ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100" : "hover:bg-white/50 hover:text-indigo-600 text-slate-500"
                  )}
                >
                  BÊN A
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAutoFill?.('B'); }}
                  className={cn(
                    "px-2 py-1 text-[9px] font-black rounded-lg transition-all",
                    activeParty === 'B' ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100" : "hover:bg-white/50 hover:text-indigo-600 text-slate-500"
                  )}
                >
                  BÊN B
                </button>
              </div>
            )}
            {isDateTag && !isTableTag && (
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-sm",
                activeParty ? "bg-indigo-100 text-indigo-600 border border-indigo-200" : "bg-slate-100 text-slate-400 group-hover:text-amber-600 border border-slate-200"
              )}>
                <Calendar className="w-3.5 h-3.5" />
              </div>
            )}
            {isCurrency && !isWords && (
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            )}
         </div>
      </div>
      {isTableTag ? (
        <div className={cn(
          "min-h-[120px] flex flex-col justify-center px-8 bg-slate-50/20 border-2 border-dashed rounded-[24px] transition-all duration-500 overflow-hidden group-hover:bg-indigo-50/10 group-hover:border-indigo-400 group-hover:shadow-xl group-hover:shadow-indigo-100/50",
          value ? "border-indigo-200 bg-indigo-50/20 shadow-inner" : "border-slate-200"
        )}>
          {value ? (
            <div className="py-4 overflow-x-auto custom-scrollbar -mx-8 px-8">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-y-2 border-slate-800 shadow-md">
                    {value.split('\n')[0]?.split('|').filter(s => s.trim() !== '').map((h, i) => (
                      <th key={i} className="px-6 py-3 text-left font-black text-white uppercase tracking-widest text-[10px]">
                        {h.trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {value.split('\n').slice(2, 8).filter(l => l.trim() !== '').map((line, ri) => (
                    <tr key={ri} className="hover:bg-indigo-50/50 transition-colors group/row">
                      {line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map((cell, ci) => (
                        <td key={ci} className="px-6 py-3 text-slate-900 font-bold group-hover/row:text-indigo-900 transition-colors border-r border-slate-50 last:border-r-0">
                          {cell.trim()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {value.split('\n').slice(2).filter(l => l.trim() !== '').length > 6 && (
                <div className="mt-4 px-4 pb-1 text-xs text-indigo-600 italic flex items-center gap-3 font-black uppercase tracking-widest bg-white/80 py-3 border-t-2 border-double border-indigo-100 rounded-b-xl">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-md shadow-emerald-200" />
                  Hệ thống đã bóc tách {value.split('\n').slice(2).filter(l => l.trim() !== '').length} dòng
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6 text-slate-400" onClick={onOpenSelector}>
              <div className="p-4 bg-white rounded-2xl shadow-xl shadow-indigo-100 border border-slate-100 group-hover:scale-110 group-hover:text-indigo-600 group-hover:rotate-6 transition-all duration-500">
                <Layers className="w-8 h-8" />
              </div>
              <div className="text-sm italic font-bold text-center leading-relaxed px-4">
                Khu vực hiển thị bảng dữ liệu chi tiết<br/>
                <span className="text-indigo-600 not-italic font-black text-[10px] uppercase tracking-widest bg-indigo-100 px-4 py-1.5 rounded-full mt-3 inline-block shadow-sm border border-indigo-200 active:scale-95 transition-transform">Lấy bảng từ hóa đơn</span>
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
              "w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm text-slate-900 outline-none transition-all resize-none min-h-[48px] font-bold placeholder:text-slate-300 shadow-inner leading-relaxed",
              isCurrency && !isWords ? "text-emerald-800 bg-emerald-50/10 border-emerald-200/50" : "",
              isWords ? "italic text-indigo-800 leading-normal bg-indigo-50/50 border-indigo-200/50" : "",
              "focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:shadow-lg"
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
      const getKeys = (prefix: string) => {
        const variants = [
          `${prefix}_HD`, `${prefix}_KY`, `${prefix}_HOPDONG`, `${prefix}_HOP_DONG`,
          `${prefix}KYHOPDONG`, `${prefix}_KY_HOP_DONG`, prefix
        ];
        for (const v of variants) {
          if (data[v]) return data[v];
          const foundKey = Object.keys(data).find(k => k.toUpperCase() === v.toUpperCase());
          if (foundKey && data[foundKey]) return data[foundKey];
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
    <div className="flex flex-col h-full space-y-1">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-between bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
        <div className="space-y-0 text-left">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <PlusSquare className="w-5 h-5 text-indigo-600" />
            Tạo Hợp Đồng Chuyên Nghiệp
          </h2>
          <p className="text-[11px] text-slate-500">Soạn thảo hợp đồng nhanh chóng với mẫu có sẵn</p>
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
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100"
          >
            Làm mới
          </button>
          {selectedTemplate && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isGenerating ? 'Đang tạo...' : 'Xuất Hợp Đồng (.docx)'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0">
        {/* Left Column: Template & Parties Selection */}
        <div className="lg:col-span-4 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
          <div className="card p-2 space-y-2">
            <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-wider flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                <FileText className="w-3.5 h-3.5" />
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
                      ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                      : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      selectedTemplate === t.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                    )}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className={cn("text-xs font-black leading-tight", selectedTemplate === t.id ? "text-indigo-900" : "text-slate-700")}>{t.name}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{t.file}</span>
                    </div>
                  </div>
                  {selectedTemplate === t.id && (
                    <div className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-2 space-y-2">
            <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-wider flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Users className="w-3.5 h-3.5" />
              </div>
              2. Các bên liên quan
            </h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Bên A (Chủ đầu tư/Thuê)</label>
                <div className="relative group">
                  <select
                    value={selectedPartyAId}
                    onChange={(e) => handlePartyChange(e.target.value, 'A')}
                    disabled={!selectedTemplate}
                    className="w-full pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">-- Chọn Bên A --</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center font-black text-indigo-600 text-[9px] bg-indigo-100 rounded">A</div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Bên B (Đơn vị thực hiện/Cho thuê)</label>
                <div className="relative group">
                  <select
                    value={selectedPartyBId}
                    onChange={(e) => handlePartyChange(e.target.value, 'B')}
                    disabled={!selectedTemplate}
                    className="w-full pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">-- Chọn Bên B --</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center font-black text-indigo-600 text-[9px] bg-indigo-100 rounded">B</div>
                </div>
              </div>

              {categorizedTags.moved.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
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
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
               <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                  <PlusSquare className="w-10 h-10 text-slate-200" />
               </div>
               <h4 className="text-lg font-bold text-slate-800 mb-2">Sẵn sàng khởi tạo</h4>
               <p className="text-sm text-slate-400 max-w-sm">Vui lòng chọn một mẫu hợp đồng từ danh sách bên trái để bắt đầu nhập liệu và phát hiện các trường dữ liệu tự động.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-slate-50 relative rounded-2xl overflow-hidden border border-slate-200">
              {/* Data Entry Tabs/Sections */}
              <div className="bg-white border-b border-slate-200 px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md">3</div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 tracking-tight">Cấu hình dữ liệu chi tiết</h3>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-4">
                {/* Dates Section */}
                {dateGroups.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> THỜI GIAN
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {dateGroups.map(group => (
                        <div key={group.id} className="p-2 bg-indigo-50/30 rounded-xl border border-indigo-100/40">
                          <label className="text-[10px] font-black text-indigo-900 block mb-1 uppercase">{group.label}</label>
                          <div className="flex items-center gap-1">
                            <div className="flex-1 flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                              <input
                                type="text"
                                ref={(el) => { dayRefs.current[group.id] = el; }}
                                placeholder="Ngày"
                                className="w-10 text-center text-xs font-bold bg-transparent outline-none"
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
                              <span className="text-slate-300">/</span>
                              <input
                                type="text"
                                ref={(el) => { monthRefs.current[group.id] = el; }}
                                placeholder="Tháng"
                                className="w-10 text-center text-xs font-bold bg-transparent outline-none"
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
                              <span className="text-slate-300">/</span>
                              <input
                                type="text"
                                ref={(el) => { yearRefs.current[group.id] = el; }}
                                placeholder="Năm"
                                className="w-14 text-center text-xs font-bold bg-transparent outline-none"
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
                              <button className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-all flex items-center justify-center">
                                <Calendar className="w-3.5 h-3.5" />
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
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Database className="w-3 h-3" /> THÔNG TIN & GIÁ TRỊ
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
                          <div key="giatri-combined" className="md:col-span-12 relative flex flex-col md:flex-row bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-400 transition-all shadow-sm">
                             <div className="flex-1 relative border-b md:border-b-0 md:border-r border-slate-200">
                               <TagRenderItem tag={giatriTag} {...commonItemProps} hideWrapperStyle />
                               {((isCurrency && selectedTemplate === 'HDTC')) && (
                                 <button 
                                   onClick={(e) => {
                                     e.preventDefault();
                                     setActiveInvoiceTag?.(giatriTag);
                                     setIsInvoiceSelectorOpen?.(true);
                                   }}
                                   className="absolute top-1 right-1 flex items-center gap-1 px-2 py-0.5 bg-indigo-600 text-white rounded-lg text-[8px] font-black uppercase tracking-tighter shadow-sm hover:bg-indigo-700 transition-all z-10"
                                 >
                                   <Layers className="w-2.5 h-2.5" /> Bóc tách
                                 </button>
                               )}
                             </div>
                             <div className="flex-1 relative bg-slate-50/50">
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
                              className="absolute top-1 right-1 flex items-center gap-1 px-2 py-0.5 bg-indigo-600 text-white rounded-lg text-[8px] font-black uppercase tracking-tighter shadow-sm hover:bg-indigo-700 transition-all z-10"
                            >
                              <Layers className="w-2.5 h-2.5" /> Bóc tách
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
                        <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest pl-2 border-l-2 border-blue-500">Thông tin Bên A</label>
                        <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                           {renderCategorizedPartyTags(categorizedTags.partyA)}
                        </div>
                      </div>
                    )}
                    {selectedPartyBId && categorizedTags.partyB.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest pl-2 border-l-2 border-emerald-500">Thông tin Bên B</label>
                        <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                           {renderCategorizedPartyTags(categorizedTags.partyB)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-white border-t border-slate-100 p-2 flex items-center justify-between text-[9px] text-slate-400">
                 <div className="flex items-center gap-1.5 uppercase font-black tracking-widest">
                   <ShieldCheck className="w-3 h-3 text-emerald-500" /> Hệ thống bảo mật
                 </div>
                 <div className="italic">Dữ liệu trống mặc định: <span className="text-indigo-600">"............"</span></div>
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
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
              <h2 className="section-title">Đối tác & Khách hàng</h2>
          <div className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
            {partners.length} Công ty
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm đối tác..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all w-64"
            />
          </div>
          <div className="w-px h-6 bg-slate-200 mx-2" />
          <button 
            onClick={() => setShowAddressTool(!showAddressTool)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border",
              showAddressTool 
              ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            <MapPin className="w-4 h-4" />
            Thông minh 2025
          </button>
          <button 
            onClick={() => onEdit({ id: 'new', name: '', taxCode: '', address: '' })}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Thêm đối tác
          </button>
          <button 
            onClick={onBatchEdit}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
          >
            <Edit2 className="w-4 h-4" />
            Chỉnh sửa 
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
            <div className="card p-6 bg-indigo-50/30 border-indigo-100 shadow-inner">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Smart Address Tool 2025</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tra cứu & Chuyển đổi mô hình hai cấp</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">
                      Nhập địa chỉ (Free-text)
                    </label>
                    <textarea 
                      value={convInput}
                      onChange={(e) => handleConvert(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all h-28 resize-none"
                      placeholder="Ví dụ: B7/2 Ấp 6, Xã Lê Minh Xuân, Huyện Bình Chánh, TP. Hồ Chí Minh"
                    />
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700 italic">
                    Hệ thống sẽ tự động bóc tách số nhà, tên đường và chuyển đổi địa giới hành chính sang mô hình 2 cấp chuẩn sáp nhập 1/7/2025.
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase px-1">Kết quả bóc tách & Chuyển đổi</h5>
                  
                  {convResult ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-white border border-slate-100 rounded-xl">
                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">1. Địa chỉ chi tiết</div>
                        <div className="text-sm font-medium text-slate-700">{convResult.detail || "N/A"}</div>
                      </div>
                      
                      <div className="p-3 bg-white border border-slate-100 rounded-xl">
                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">2. Địa chỉ cũ đã định dạng (Chuẩn hóa chữ hoa)</div>
                        <div className="text-sm font-semibold text-slate-600 italic">
                          {convResult.oldFullAddress || `${convResult.detail ? convResult.detail + ', ' : ''}${convResult.oldWard}, ${convResult.oldDistrict}, ${convResult.province}`}
                        </div>
                      </div>

                      <div className="p-4 bg-white border-2 border-indigo-500 rounded-xl shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-5">
                          <CheckCircle2 className="w-16 h-16 text-indigo-600" />
                        </div>
                        <div className="text-[9px] font-bold text-indigo-500 uppercase mb-2">3. Kết quả đã chuyển đổi (Sang 2 cấp)</div>
                        <div className="text-sm font-black text-slate-900 mb-2 leading-relaxed">{convResult.fullAddress}</div>
                        <div className="flex gap-2">
                          <div className={cn(
                            "rounded px-2 py-1 text-[10px] font-bold border uppercase tracking-tighter",
                            convResult.isConverted ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-slate-50 text-slate-400 border-slate-200"
                          )}>
                            {convResult.isConverted ? "Khớp bảng ánh xạ 2025" : "Chưa có dữ liệu chính xác"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2">
                      <MapPin className="w-8 h-8 opacity-20" />
                      <div className="text-xs font-bold uppercase tracking-widest opacity-40">Chờ nhập dữ liệu...</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card overflow-visible shadow-sm border border-slate-200">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Thông tin công ty</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Địa chỉ liên hệ</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tài khoản thanh toán</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Đại diện pháp luật</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredPartners.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Không tìm thấy đối tác nào</td>
              </tr>
            ) : (
              filteredPartners.map((partner) => (
                <tr 
                  key={partner.id} 
                  onContextMenu={(e) => handleContextMenu(e, partner)}
                  className="hover:bg-slate-50/80 transition-colors group relative"
                >
                  <td className="px-6 py-5">
                    <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors text-base tracking-tight leading-tight">{partner.name}</div>
                    <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">MST: {partner.taxCode}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-medium text-slate-600 truncate max-w-[280px] leading-relaxed" title={partner.address}>
                      <span className="font-black text-slate-400 uppercase text-xs mr-2">Gốc:</span> {partner.address}
                    </div>
                    {partner.addressPostMerger && (
                      <div className="text-sm font-bold text-indigo-600 truncate max-w-[280px] mt-1.5 leading-relaxed bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/50" title={partner.addressPostMerger}>
                        <span className="font-black uppercase text-xs mr-2">Mới:</span> {partner.addressPostMerger}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-black text-slate-800">{partner.accountNumber || '-'}</div>
                    <div className="text-xs text-slate-400 uppercase font-black tracking-tighter mt-1">{partner.bankName || '-'}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-slate-800 font-black text-sm">{partner.representative || '-'}</div>
                    <div className="text-xs text-slate-400 font-bold uppercase mt-1 italic">{partner.position || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 outline-none">
                      <button 
                        onClick={() => onEdit(partner)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Chỉnh sửa
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onDelete(partner.id);
                        }}
                        className="w-8 h-8 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-all flex items-center justify-center shrink-0 active:scale-95"
                        title="Xóa đối tác"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Context Menu Thật sự - Được gắn vào body hoặc container riêng để tránh bị cắt bởi table overflow */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[9999] bg-white border border-slate-200 shadow-2xl rounded-xl py-2 w-44 overflow-hidden"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
              <div className="text-[9px] font-bold text-slate-400 uppercase truncate" title={contextMenu.partner?.name}>
                {contextMenu.partner?.name}
              </div>
            </div>
            <button 
              onClick={() => {
                if (contextMenu.partner) onEdit(contextMenu.partner);
                closeContextMenu();
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors font-medium"
            >
              <Edit2 className="w-4 h-4" />
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
              <Trash2 className="w-4 h-4" />
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
      
      for (const id of selectedIds) {
        const genDoc = items.find(d => d.id === id);
        if (!genDoc) continue;

        const inv = invoices.find(i => i.id === genDoc.invoiceId);
        if (!inv) continue;

        const pA = partners.find(p => p.taxCode === inv.extractedData?.seller?.taxCode) || {};
        const pB = partners.find(p => p.taxCode === inv.extractedData?.buyer?.taxCode) || {};

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
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="text-slate-300 w-8 h-8" />
        </div>
        <h3 className="text-slate-600 font-bold mb-1">Chưa có tài liệu nào</h3>
        <p className="text-slate-400 text-xs">Vui lòng tạo biên bản từ tab Dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={selectedIds.length === items.length && items.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
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
              "card p-4 transition-all group relative flex gap-4 border-2",
              selectedIds.includes(docItem.id) ? "border-indigo-400 bg-indigo-50/10 shadow-md ring-1 ring-indigo-100" : "hover:border-blue-300 border-transparent shadow-sm"
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
                className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate pr-4" title={docItem.fileName}>{docItem.fileName}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{docItem.templateType}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 opacity-40" />
                  {docItem.createdAt?.toDate ? new Date(docItem.createdAt.toDate()).toLocaleDateString() : '...'}
                </span>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button 
                    disabled={isDownloading === docItem.id}
                    onClick={() => downloadDoc(docItem)}
                    className="text-white font-bold bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-2"
                  >
                    {isDownloading === docItem.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    Tải về
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDelete(docItem.id);
                    }}
                    className="w-8 h-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex items-center justify-center shrink-0"
                    title="Xóa tài liệu"
                  >
                    <Trash2 className="w-4 h-4" />
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
            className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6 z-50 border border-slate-700 w-fit"
          >
            <div className="flex items-center gap-3 border-r border-slate-700 pr-6 mr-1">
              <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center text-[11px] font-black shadow-lg">
                {selectedIds.length}
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Đã chọn</span>
            </div>

            <button 
              onClick={downloadDocZip}
              disabled={isBulkDownloading}
              className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 hover:bg-white/5 px-4 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50"
            >
              {isBulkDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={18} />}
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
              className="text-[10px] text-slate-500 hover:text-white transition-all uppercase font-bold tracking-widest ml-2"
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

    for (let i = 0; i < selectedIds.length; i++) {
        const invId = selectedIds[i];
        const inv = completedInvoices.find(invoice => invoice.id === invId);
        if (!inv || !inv.extractedData) {
            setExportProgress(Math.round(((i + 1) / selectedIds.length) * 100));
            continue;
        }

        const pA = partners.find(p => p.taxCode === inv.extractedData?.seller?.taxCode) || {};
        const pB = partners.find(p => p.taxCode === inv.extractedData?.buyer?.taxCode) || {};

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
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30 rounded-2xl border border-slate-100 overflow-hidden">
      <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", color.replace('text-', 'bg-').replace('-600', '-50'))}>
            {React.createElement(icon, { className: cn("w-4 h-4", color) })}
          </div>
          <span className="font-black text-[10px] uppercase tracking-widest text-slate-700">{title}</span>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{list.length}</span>
        </div>
        <button 
          onClick={() => handleSelectAll(list)}
          className="text-[10px] font-black uppercase text-blue-600 hover:underline"
        >
          {list.length > 0 && list.every(i => selectedIds.includes(i.id)) ? "Bỏ chọn" : "Chọn hết"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {list.length > 0 ? (
          list.map((inv) => (
            <div 
              key={inv.id}
              onClick={() => handleToggleSelect(inv.id)}
              className={cn(
                "p-3 rounded-xl border transition-all cursor-pointer group hover:shadow-md",
                selectedIds.includes(inv.id) 
                  ? "bg-white border-blue-500 shadow-lg ring-1 ring-blue-500/10" 
                  : "bg-white border-slate-100 hover:border-slate-300"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                  selectedIds.includes(inv.id) ? "bg-blue-600 border-blue-600 shadow-sm" : "border-slate-200 group-hover:border-slate-300"
                )}>
                  {selectedIds.includes(inv.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-xs text-slate-800 truncate mb-1">{inv.computedDisplayName}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">HĐ: {inv.computedInvoiceNumber || '---'}</span>
                    <span className="text-[9px] text-slate-300">•</span>
                    <span className="text-[9px] font-bold text-slate-400">Ngày: {formatDisplayDate(inv.extractedData?.invoice?.date || inv.extractedData?.date || '---')}</span>
                  </div>
                </div>
                {inv.extractedData?.classification && (
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm shrink-0",
                    inv.extractedData.classification === 'BB_TC' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 
                    inv.extractedData.classification === 'BB_CM' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                    'bg-green-100 text-green-700 border border-green-200'
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
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Trống</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-[1100px] overflow-hidden flex flex-col h-[85vh] border border-white/20"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-100">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-xl text-slate-800 tracking-tight">Xuất biên bản hàng loạt</h3>
              <p className="text-sm text-slate-400 font-medium italic">Tạo tệp .zip chứa các biên bản đã được xử lý tự động</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Controls */}
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo Số CT, Tên file, Đơn vị bán..."
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 shadow-sm"
              />
              {bulkSearch && (
                <button 
                  onClick={() => setBulkSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-6 px-4">
               <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tổng cộng</span>
                  <span className="text-xl font-black text-slate-800 leading-none">{completedInvoices.length}</span>
               </div>
               <div className="w-px h-8 bg-slate-200"></div>
               <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Đã chọn</span>
                  <span className="text-xl font-black text-blue-600 leading-none">{selectedIds.length}</span>
               </div>
            </div>
          </div>

          {/* 2 Columns View */}
          <div className="flex-1 flex overflow-hidden p-6 gap-6">
            {renderList(pdfList, "Danh sách PDF", FileText, "text-red-600")}
            {renderList(xmlList, "Danh sách XML", FileCode, "text-emerald-600")}
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100">
          {isExporting ? (
            <div className="space-y-4 max-w-md mx-auto">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                   <div className="text-xs font-black text-blue-600 uppercase tracking-widest">Đang xây dựng tệp ZIP...</div>
                   <div className="text-[10px] font-bold text-slate-400">Vui lòng không đóng cửa sổ lúc này</div>
                </div>
                <div className="text-2xl font-black text-slate-800">{exportProgress}%</div>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                <motion.div 
                  className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]"
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
                  selectedIds.length > 0 ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200" : "bg-slate-300 cursor-not-allowed shadow-none"
                )}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Download className="w-5 h-5 relative" />
                <span className="relative">XUẤT {selectedIds.length} BIÊN BẢN (.ZIP)</span>
              </button>
              <button 
                onClick={onClose}
                className="flex-1 py-4 border-2 border-slate-200 rounded-2xl font-black text-sm text-slate-500 hover:bg-white hover:text-slate-800 transition-all active:scale-95 shadow-sm"
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
  const [timeLeft, setTimeLeft] = useState(0);
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
        const dbDateA = a.contractDate || a.extractedData?.invoice?.date || a.extractedData?.date;
        const dbDateB = b.contractDate || b.extractedData?.invoice?.date || b.extractedData?.date;
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
        if (foundTab === 'partners' && slug) {
          const isBatch = slug.startsWith('batch/');
          const isEdit = slug.startsWith('edit/');
          const actualSlug = isBatch ? slug.slice(6) : (isEdit ? slug.slice(5) : slug);
          const subParts = actualSlug.split('-');
          const taxCode = subParts[0];
          
          if (partners.length > 0) {
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
        } else if (foundTab === 'partners' && !slug) {
          setEditingPartner(null);
          setMultiPartnerEdit(null);
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
    let timer: any;
    if (timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else {
      setRequestCount(0);
    }
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    // Start countdown whenever a request is made if not already counting
    if (requestCount > 0 && timeLeft === 0) {
      setTimeLeft(60);
    }
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

  const handleFileUpload = (files: File[]) => {
    if (!user) {
      toast("Vui lòng đăng nhập trước khi thực hiện.", "error");
      return;
    }
    
    // Check for duplicates before adding to queue
    const validFiles: File[] = [];
    files.forEach(file => {
      const isDuplicate = invoices.some(inv => inv.fileName === file.name) || 
                          uploadQueue.some(q => q.name === file.name);
      if (isDuplicate) {
        toast(`Hóa đơn [${file.name}] đã có sẵn hoặc đang trong hàng đợi.`, 'error');
      } else {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'pdf' || ext === 'xml' || file.type.startsWith('image/')) {
          validFiles.push(file);
        } else {
          toast(`Định dạng [${file.name}] không được hỗ trợ.`, 'error');
        }
      }
    });

    setUploadQueue(prev => [...prev, ...validFiles]);
  };

  const removeFromQueue = (fileName: string) => {
    setUploadQueue(prev => prev.filter(f => f.name !== fileName));
  };

  const processQueue = async () => {
    if (uploadQueue.length === 0) return;
    
    const filesToProcess = [...uploadQueue];
    const isBatchProcessing = filesToProcess.length > 1;
    setUploadQueue([]); // Clear queue before starting
    setIsProcessing(true);
    
    let loadingToastId: string | null = null;
    const updateLoading = (msg: string) => {
      if (loadingToastId) removeToast(loadingToastId);
      loadingToastId = toast(msg, 'loading');
    };
    
    for (let i = 0; i < filesToProcess.length; i++) {
      let file = filesToProcess[i];
      updateLoading(`[${i+1}/${filesToProcess.length}] Đang xử lý ${file.name}...`);
      
      // Image Compression for image files
      if (file.type.startsWith('image/')) {
        try {
          updateLoading(`[${i+1}/${filesToProcess.length}] Đang nén ảnh để tối ưu tốc độ...`);
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
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      let docRef: any;
      try {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        
        // Bước 1: Tạo URL xem trước tạm thời (GAS sẽ xử lý lưu tệp vào Google Drive sau)
        const fileURL = URL.createObjectURL(file);
        const filePath = `drive://pending_gas_save/${file.name}`;

        // Bước 2: Tạo mục Firestore (Bước 1 của 3)
        try {
          docRef = await addDoc(collection(db, 'invoices'), cleanObject({
            fileName: file.name,
            fileType: fileExt,
            fileURL: fileURL,
            storagePath: filePath,
            status: 'processing',
            ownerId: user.uid,
            createdAt: serverTimestamp()
          }));
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'invoices');
        }

        updateLoading(`[${i+1}/${filesToProcess.length}] Đang gửi dữ liệu sang Google Script...`);

        let extractedData: any;
        if (fileExt === 'xml') {
          setRequestCount(prev => prev + 1); // Increment for XML parse
          const text = await file.text();
          try {
            extractedData = await parseInvoiceXml(text);
            extractedData = normalizeExtractedData(extractedData);
          } catch (error: any) {
            console.error("XML Parse Error:", error);
            throw new Error(`Lỗi phân tích XML: ${error.message}`);
          }
          
          if (extractedData.items) {
            try {
              const { classifyInvoice } = await import('./lib/mistral');
              extractedData.classification = await classifyInvoice(extractedData.items);
            } catch (e) {
              console.error("Classification failed:", e);
            }
          }
        } else {
          updateLoading(`[${i+1}/${filesToProcess.length}] Đang chờ Mistral AI phản hồi...`);
          
          try {
            setRequestCount(prev => prev + 1); // Increment for PDF extraction
            const rawExtracted = await extractFromInvoice(file);
            // Chuẩn hóa dữ liệu sau khi nhận từ AI
            extractedData = normalizeExtractedData(rawExtracted);
          } catch (err: any) {
            // Check for Quota/Rate Limit (429 or Quota exceeded)
            const errMsg = err.message || "";
            if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota")) {
              setIsTokenLimited(true);
              setCountdown(60); // Set 60s countdown
              toast("Lỗi giới hạn Token AI. Đang tạm dừng...", "error");
              
              // Internal timer for countdown display
              const timer = setInterval(() => {
                setCountdown(prev => {
                  if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);

              // Actual process pause
              await new Promise(resolve => setTimeout(resolve, 60000));
              
              setIsTokenLimited(false);
              i--; // Retry the same file
              if (docRef) await deleteDoc(docRef); // Cleanup pending record for retry
              continue;
            }
            throw err;
          }
          
          // Re-classify based on local keywords for consistency
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

        // Step 3 (NEW): Show Review Modal instead of auto-completing
        if (extractedData) {
          if (extractedData.seller) {
            extractedData.seller.name = fixNgocTham(extractedData.seller.name);
          }
          if (extractedData.buyer) {
            extractedData.buyer.name = fixNgocTham(extractedData.buyer.name);
          }
          
          if (extractedData.items) {
             extractedData.items = mergeDuplicateItems(extractedData.items);
          }
          
          if (isBatchProcessing) {
            // TỰ ĐỘNG HOÀN TẤT CHO BATCH
            const updates = cleanObject({
              status: 'completed',
              extractedData: extractedData
            });
            await updateDoc(docRef, updates);

            const { seller, buyer, invoice } = extractedData;
            const invDate = invoice?.date ? new Date(invoice.date) : new Date();
            const cutOffDate = new Date('2025-07-01');
            const isPostMerger = invDate > cutOffDate;

            if (seller) await upsertPartner(seller, isPostMerger);
            if (buyer) await upsertPartner(buyer, isPostMerger);
            
            // For batch, we remove the loading toast before showing success
            if (loadingToastId) {
              removeToast(loadingToastId);
              loadingToastId = null;
            }
            toast(`Đã tự động lưu ${file.name}`, "success");
          } else {
            if (loadingToastId) removeToast(loadingToastId);
            clearToasts(); 
            setPendingReview({ file, docRef, data: extractedData });
            setIsProcessing(false);
            return; 
          }
        }

      } catch (error: any) {
        console.error("Processing error:", error);
        if (loadingToastId) {
          removeToast(loadingToastId);
          loadingToastId = null;
        }
        toast(`Lỗi khi xử lý tệp ${file.name}: ${error.message}`, "error");
        if (docRef) {
          try {
            await updateDoc(docRef, cleanObject({ 
              status: 'error',
              error: error instanceof Error ? error.message : String(error)
            }));
          } catch (e) {
            console.error("Failed to update error status:", e);
          }
        }
      }
    }
    if (loadingToastId) removeToast(loadingToastId);
    clearToasts(); 
    setIsProcessing(false);
    toast("Đã xử lý xong danh sách tệp", "success");
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
    <div className="flex h-screen w-full font-sans select-none overflow-hidden bg-slate-50">
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
        <header className="h-[48px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-slate-500 text-sm italic">
            <span>DocuForge AI</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-bold not-italic uppercase text-xs">
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
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100 gap-1">
              <button 
                onClick={() => handleTabChange('upload')}
                className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Bắt đầu lượt mới
              </button>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600 ml-2">
              GA
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
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
                  onSubTabChange={setDashboardSubTab}
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
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h3 className="font-bold text-sm text-slate-700 truncate mr-2">Nguồn: {selectedInvoice.fileName}</h3>
                      <button 
                        onClick={() => handleInvoiceSelect(null)}
                        className="text-xs text-slate-400 hover:text-slate-600"
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
                            <label className="text-sm text-slate-400 font-black uppercase block mb-2">
                              {labelSeller}
                            </label>
                            <div className="text-xl font-semibold text-slate-800 leading-tight tracking-tight">{selectedInvoice.extractedData?.seller?.name}</div>
                            <div className="text-base font-bold text-slate-500 mt-2 bg-slate-50 px-3 py-1 rounded-lg w-fit border border-slate-100">MST: {selectedInvoice.extractedData?.seller?.taxCode}</div>
                          </div>
                        );

                        const buyerSection = (
                          <div key="buyer">
                            <label className="text-sm text-slate-400 font-black uppercase block mb-2">
                              {labelBuyer}
                            </label>
                            <div className="text-xl font-semibold text-slate-800 leading-tight tracking-tight">{selectedInvoice.extractedData?.buyer?.name}</div>
                            <div className="text-base font-bold text-slate-500 mt-2 bg-slate-50 px-3 py-1 rounded-lg w-fit border border-slate-100">MST: {selectedInvoice.extractedData?.buyer?.taxCode}</div>
                          </div>
                        );

                        return (
                          <>
                            {isSwapped ? [buyerSection, sellerSection] : [sellerSection, buyerSection]}
                          </>
                        );
                      })()}
                      
                      <div className="space-y-6 pt-8 border-t-2 border-dashed border-slate-100 mt-4">
                        <label className="text-sm text-slate-400 font-black uppercase block mb-2">Thông tin Hợp đồng liên quan</label>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="text-xs text-slate-500 uppercase font-black px-1 tracking-widest">Số hợp đồng</div>
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
                              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="text-xs text-slate-500 uppercase font-black px-1 tracking-widest">Ngày ký HĐ</div>
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
                              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-900 rounded-xl text-[11px] text-blue-400 overflow-x-auto shadow-inner">
                        <div className="text-blue-300 font-bold mb-2 opacity-70">DỮ LIỆU JSON GỐC://</div>
                        {JSON.stringify(selectedInvoice.extractedData, null, 2)}
                      </div>
                    </div>
                  </div>

                  {/* Right Panel: Template Logic */}
                  <div className="col-span-8 flex flex-col card h-full">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                          <HardHat className="w-3.5 h-3.5" />
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
                      <table className="w-full border-collapse border border-slate-200 text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 font-bold text-slate-600">
                            <th className="border border-slate-200 p-2 w-8">Stt</th>
                            <th className="border border-slate-200 p-2 text-left">Nội dung hàng hóa/dịch vụ</th>
                            <th className="border border-slate-200 p-2">ĐVT</th>
                            <th className="border border-slate-200 p-2">SL</th>
                            <th className="border border-slate-200 p-2">Đơn giá</th>
                            <th className="border border-slate-200 p-2 text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.extractedData?.items?.map((item: any, i: number) => {
                            const qty = parseFloat(item.quantity) || 0;
                            const price = parseFloat(item.unitPrice) || 0;
                            const amount = item.amount || item.total || (qty * price);
                            const fallback = "";

                            return (
                              <tr key={i}>
                                <td className="border border-slate-200 p-2 text-center text-slate-400 table-cell">{i + 1}</td>
                                <td className="border border-slate-200 p-2 font-medium table-cell">{item.description || item.name || "Nhập nội dung..."}</td>
                                <td className="border border-slate-200 p-2 text-center table-cell">{item.unit && !item.unit.toString().match(/^[. ]+$/) ? item.unit : ''}</td>
                                <td className="border border-slate-200 p-2 text-center table-cell">{qty > 0 ? formatVNNumber(qty) : ''}</td>
                                <td className="border border-slate-200 p-2 text-right table-cell">{price > 0 ? formatVNNumber(price) : ''}</td>
                                <td className="border border-slate-200 p-2 text-right font-bold text-slate-800 table-cell">{amount > 0 ? formatVNNumber(amount) : '0'}</td>
                              </tr>
                            );
                          })}
                          <tr className="bg-slate-100/50 font-bold">
                            <td colSpan={5} className="border border-slate-200 p-2 text-right uppercase text-[10px] tracking-wider">Tổng cộng</td>
                            <td className="border border-slate-200 p-2 text-right">{formatVNNumber(selectedInvoice.extractedData?.totals?.subtotal)}</td>
                          </tr>
                          <tr className="font-bold">
                            <td colSpan={5} className="border border-slate-200 p-2 text-right italic text-[10px]">
                              Thuế GTGT ({(() => {
                                const rate = selectedInvoice.extractedData?.invoice?.vatRate;
                                if (rate !== undefined && rate !== null) return rate;
                                const sub = selectedInvoice.extractedData?.totals?.subtotal;
                                const total = selectedInvoice.extractedData?.totals?.grandTotal || selectedInvoice.extractedData?.totals?.grand_total;
                                if (sub > 0 && total > 0) return Math.round((Math.abs(total - sub) / sub) * 100);
                                return 8;
                              })()}%)
                            </td>
                            <td className="border border-slate-200 p-2 text-right">{formatVNNumber(selectedInvoice.extractedData?.totals?.vatAmount)}</td>
                          </tr>
                          <tr className="bg-blue-50 text-blue-900 font-bold">
                            <td colSpan={5} className="border border-slate-200 p-2 text-right text-xs uppercase tracking-tight">Thành tiền (Sau thuế)</td>
                            <td className="border border-slate-200 p-2 text-right text-xs">{formatVNNumber(selectedInvoice.extractedData?.totals?.grandTotal || selectedInvoice.extractedData?.totals?.grand_total)}</td>
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
                  onRemove={removeFromQueue}
                  onProcess={processQueue}
                  isProcessing={isProcessing}
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
                      <div key={t.id} className="card p-6 flex flex-col items-center text-center group relative overflow-hidden">
                        {isAvailableLocally && !isAvailableOnServer && (
                          <div className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-bold px-2 py-1 uppercase rounded-bl-lg animate-pulse">
                            Cần khôi phục
                          </div>
                        )}
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                          isAvailableOnServer ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                        )}>
                          <t.icon className="w-6 h-6" />
                        </div>
                        <h4 className="card-title mb-1">{t.label}</h4>
                        <p className="secondary-text mb-6 flex-1">{t.desc}</p>
                        
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
                                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                                : "bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                            )}>
                              {isAvailableOnServer ? 'Cập nhật Template (.docx)' : 'Tải lên Template (.docx)'}
                            </div>
                          </label>

                          {isAvailableLocally && !isAvailableOnServer && (
                            <button 
                              onClick={() => restoreTemplate(t.id)}
                              className="w-full py-1.5 px-4 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold hover:bg-amber-200 transition-all flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Khôi phục từ bộ nhớ
                            </button>
                          )}

                          {isAvailableOnServer ? (
                            <div className="text-[10px] text-green-500 flex items-center justify-center gap-1 font-bold">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Đã sẵn sàng trên máy chủ
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-bold">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Chưa có trên máy chủ
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
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-slate-400">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isLoadingInvoices || isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
              <span>AI MODEL: MISTRAL-LARGE-LATEST (PREMIUM)</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-3 h-3" />
              <span>AI REGION: ASIA-SOUTHEAST1 (SINGAPORE)</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3" />
              <span>API STATUS: HEALTHY | REQUESTS: {requestCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> GAS SERVICE: CONNECTED</span>
            <span className="text-slate-200">|</span>
            <span>© 2026 SMARTINVOICE PRO</span>
          </div>
        </footer>
      </main>

      {/* Token Limit Countdown Modal */}
      {isTokenLimited && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-6"
          >
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">GIỚI HẠN YÊU CẦU AI</h3>
              <p className="text-slate-500 text-sm mt-2">Đã đạt đến giới hạn xử lý của AI. Hệ thống sẽ tự động thử lại sau:</p>
            </div>
            <div className="text-5xl font-black text-indigo-600">
              {countdown}s
            </div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Vui lòng không đóng trình duyệt để tiếp tục hàng đợi</p>
          </motion.div>
        </div>
      )}


      {/* Single Partner Edit Modal */}
      <AnimatePresence>
        {editingPartner && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900">{editingPartner.id === 'new' ? 'Thêm đối tác' : 'Chỉnh sửa nhanh'}</h3>
                </div>
                <button onClick={() => setEditingPartner(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form 
                className="p-6 space-y-4"
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
                    setEditingPartner(null);
                    toast(editingPartner.id === 'new' ? "Đã thêm đối tác mới" : "Đã cập nhật đối tác", "success");
                  } catch (err) {
                    toast("Lỗi xử lý", "error");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
              >
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Công ty / MST</label>
                  {editingPartner.id === 'new' ? (
                     <div className="space-y-2">
                        <input name="name" required placeholder="Tên công ty" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold" />
                        <input name="taxCode" required placeholder="Mã số thuế" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                     </div>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-slate-900">{editingPartner.name}</div>
                      <div className="text-[10px] text-slate-400 italic">{editingPartner.taxCode}</div>
                    </>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Địa chỉ gốc (Trước 1/7/2025)</label>
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
                        className="text-[9px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg transition-all border border-indigo-100"
                      >
                        <ArrowRight className="w-2.5 h-2.5" /> Chuyển đổi thông minh
                      </button>
                    </div>
                    <textarea 
                      name="address"
                      defaultValue={editingPartner.address}
                      onBlur={(e) => {
                        const addrInput = e.target.value;
                        if (!addrInput) return;
                        const result = smartConvertAddress(addrInput);
                        if (result.isConverted) {
                          (document.getElementsByName('address')[0] as HTMLTextAreaElement).value = result.oldFullAddress || addrInput;
                          (document.getElementsByName('addressPostMerger')[0] as HTMLTextAreaElement).value = result.fullAddress;
                          toast("Đã tự động chuyển đổi địa chỉ", "success");
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          const addrInput = (e.target as HTMLTextAreaElement).value;
                          if (!addrInput) return;
                          const result = smartConvertAddress(addrInput);
                          if (result.isConverted) {
                            (document.getElementsByName('address')[0] as HTMLTextAreaElement).value = result.oldFullAddress || addrInput;
                            (document.getElementsByName('addressPostMerger')[0] as HTMLTextAreaElement).value = result.fullAddress;
                            toast("Đã tự động chuyển đổi địa chỉ", "success");
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none h-16"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Địa chỉ sau khi sáp nhập (Từ 1/7/2025)</label>
                    <textarea 
                      name="addressPostMerger"
                      defaultValue={editingPartner.addressPostMerger}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none h-16"
                      placeholder="Địa chỉ mới theo mô hình 2 cấp..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Số tài khoản</label>
                    <input 
                      name="accountNumber"
                      defaultValue={editingPartner.accountNumber}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ngân hàng</label>
                    <input 
                      name="bankName"
                      defaultValue={editingPartner.bankName}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Người đại diện</label>
                    <input 
                      name="representative"
                      defaultValue={editingPartner.representative}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Chức vụ</label>
                    <input 
                      name="position"
                      defaultValue={editingPartner.position || 'Giám đốc'}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Giới tính</label>
                    <select 
                      name="gender" 
                      defaultValue={editingPartner.gender || 'Ông'}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    >
                      <option value="Ông">Ông</option>
                      <option value="Bà">Bà</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="submit" disabled={isProcessing} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95">
                    {isProcessing ? 'Đang lưu...' : 'Cập nhật'}
                  </button>
                  <button type="button" onClick={() => setEditingPartner(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">Hủy</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Advanced Multi-Partner Edit Modal */}
      <AnimatePresence>
        {multiPartnerEdit && multiPartnerEdit.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Chỉnh sửa thông tin đối tác</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      Công ty {multiPartnerEdit.currentIndex + 1} / {partners.length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      if (Object.keys(multiPartnerEdit.drafts).length > 0) {
                        setMultiPartnerEdit(prev => prev ? { ...prev, showExitConfirm: true } : null);
                      } else {
                        setMultiPartnerEdit(null);
                      }
                    }} 
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-8">
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
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Tên công ty (Cố định)</label>
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 font-semibold text-sm">
                            {currentPartner.name}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Mã số thuế</label>
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-sm">
                            {currentPartner.taxCode}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Địa chỉ gốc (Trước 1/7/2025)</label>
                            <button 
                              onClick={async () => {
                                if (!data.address) return;
                                const result = smartConvertAddress(data.address);
                                if (result.isConverted) {
                                  handleFieldChange('address', result.oldFullAddress || data.address);
                                  handleFieldChange('addressPostMerger', result.fullAddress);
                                  toast("Đã chuyển đổi thành công!", "success");
                                } else {
                                  toast("Không tìm thấy địa giới hành chính cần sáp nhập", "info");
                                }
                              }}
                              className="text-[9px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded transition-all"
                            >
                              <ArrowRight className="w-2.5 h-2.5" /> Chuẩn hóa 2025
                            </button>
                          </div>
                          <textarea 
                            value={data.address || ''}
                            onChange={(e) => handleFieldChange('address', e.target.value)}
                            onBlur={() => {
                              if (!data.address) return;
                              const result = smartConvertAddress(data.address);
                              if (result.isConverted) {
                                handleFieldChange('address', result.oldFullAddress || data.address);
                                handleFieldChange('addressPostMerger', result.fullAddress);
                                toast("Đã tự động chuyển đổi địa chỉ", "success");
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (!data.address) return;
                                const result = smartConvertAddress(data.address);
                                if (result.isConverted) {
                                  handleFieldChange('address', result.oldFullAddress || data.address);
                                  handleFieldChange('addressPostMerger', result.fullAddress);
                                  toast("Đã tự động chuyển đổi địa chỉ", "success");
                                }
                              }
                            }}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none h-20"
                            placeholder="Nhập địa chỉ..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Địa chỉ sau sáp nhập (Từ 1/7/2025)</label>
                          <textarea 
                            value={data.addressPostMerger || ''}
                            onChange={(e) => handleFieldChange('addressPostMerger', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none h-20"
                            placeholder="Địa chỉ mới theo mô hình 2 cấp..."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Số tài khoản</label>
                          <input 
                            value={data.accountNumber || ''}
                            onChange={(e) => handleFieldChange('accountNumber', e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                            placeholder="0123456789..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Ngân hàng</label>
                          <input 
                            value={data.bankName || ''}
                            onChange={(e) => handleFieldChange('bankName', e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                            placeholder="Tên ngân hàng..."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Người đại diện</label>
                          <input 
                            value={data.representative || ''}
                            onChange={(e) => handleFieldChange('representative', e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                            placeholder="Nguyễn Văn A"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Chức vụ</label>
                          <input 
                            value={data.position || 'Giám đốc'}
                            onChange={(e) => handleFieldChange('position', e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                            placeholder="Giám đốc"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Giới tính</label>
                          <select 
                            value={data.gender || 'Ông'}
                            onChange={(e) => handleFieldChange('gender', e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                          >
                            <option value="Ông">Ông</option>
                            <option value="Bà">Bà</option>
                          </select>
                        </div>
                      </div>

                      {Object.keys(multiPartnerEdit.drafts[currentPartner.id] || {}).length > 0 && (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                          <Clock className="w-3 h-3" />
                          Đang có thay đổi chưa lưu cho công ty này
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Navigation & Actions */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setMultiPartnerEdit(prev => prev ? { ...prev, currentIndex: Math.max(0, prev.currentIndex - 1) } : null)}
                      disabled={multiPartnerEdit.currentIndex === 0}
                      className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setMultiPartnerEdit(prev => prev ? { ...prev, currentIndex: Math.min(partners.length - 1, prev.currentIndex + 1) } : null)}
                      disabled={multiPartnerEdit.currentIndex === partners.length - 1}
                      className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        if (Object.keys(multiPartnerEdit.drafts).length > 0) {
                          setMultiPartnerEdit(prev => prev ? { ...prev, showExitConfirm: true } : null);
                        } else {
                          setMultiPartnerEdit(null);
                        }
                      }}
                      className="px-6 py-2.5 text-slate-600 font-bold text-xs hover:bg-slate-200 rounded-xl transition-all"
                    >
                      Thoát
                    </button>
                    <button 
                      onClick={async () => {
                        const drafts = multiPartnerEdit.drafts;
                        const ids = Object.keys(drafts);
                        if (ids.length === 0) {
                          setMultiPartnerEdit(null);
                          return;
                        }

                        setIsProcessing(true);
                        try {
                          await Promise.all(ids.map(id => handleUpdatePartner(id, drafts[id])));
                          toast(`Đã cập nhật thông tin cho ${ids.length} đối tác`, "success");
                          setMultiPartnerEdit(null);
                        } catch (err) {
                          toast("Có lỗi xảy ra khi lưu dữ liệu", "error");
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={Object.keys(multiPartnerEdit.drafts).length === 0}
                      className={cn(
                        "px-8 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2",
                        Object.keys(multiPartnerEdit.drafts).length > 0 
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200" 
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      )}
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Lưu tất cả ({Object.keys(multiPartnerEdit.drafts).length} công ty)
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-200"
            >
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Thoát mà không lưu?</h4>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Bạn có các thay đổi chưa được cập nhật vào hệ thống. Nếu thoát bây giờ, các chỉnh sửa này sẽ bị mất. Bạn có chắc chắn không?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setMultiPartnerEdit(prev => prev ? { ...prev, showExitConfirm: false } : null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Quay lại
                </button>
                <button 
                  onClick={() => setMultiPartnerEdit(null)}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 shadow-lg shadow-red-100 transition-all active:scale-95"
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setIsInvoiceSelectorOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-[1240px] h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-white/20"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                       Lấy bảng từ hóa đơn
                       {getContractCategory() && (
                        <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-black uppercase shadow-sm">
                          {getContractCategory()}
                        </span>
                      )}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      Tab hiện tại: <span className="text-indigo-600 font-black">{getFriendlyLabel(activeInvoiceTag || '')}</span>
                    </p>
                  </div>
                </div>

                <div className="flex-1 max-w-sm mx-10 relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                   <input 
                      type="text" 
                      placeholder="Tìm số CT, tên tệp..."
                      value={selectorSearch}
                      onChange={(e) => setSelectorSearch(e.target.value)}
                      className="w-full pl-11 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                    />
                    {selectorSearch && (
                      <button 
                        onClick={() => setSelectorSearch('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <button 
                      onClick={() => setInvoiceFilterMode('all')}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        invoiceFilterMode === 'all' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      Tất cả
                    </button>
                    <button 
                      onClick={() => setInvoiceFilterMode('seller')}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        invoiceFilterMode === 'seller' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      Bên bán
                    </button>
                    <button 
                      onClick={() => setInvoiceFilterMode('buyer')}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        invoiceFilterMode === 'buyer' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      Bên mua
                    </button>
                  </div>
                  <button 
                    onClick={() => setIsInvoiceSelectorOpen(false)}
                    className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 flex overflow-hidden bg-slate-50/30 gap-6 p-6">
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

                  const renderCol = (list: any[], title: string, icon: any, color: string) => (
                    <div className="flex-1 flex flex-col min-w-0 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                       <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                          <div className="flex items-center gap-2">
                             <div className={cn("p-2 rounded-xl", color.replace('text-', 'bg-').replace('-600', '-50'))}>
                                {React.createElement(icon, { className: cn("w-4 h-4", color) })}
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">{title}</span>
                          </div>
                          <span className="text-xs font-black text-slate-400">{list.length}</span>
                       </div>
                       <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                         {list.map(inv => {
                            const isSelected = selectedInvoices.includes(inv.id);
                            const data = inv.extractedData || {};
                            return (
                              <motion.div 
                                key={inv.id}
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
                                    ? "bg-white border-indigo-500 shadow-xl ring-1 ring-indigo-500/20" 
                                    : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-lg",
                                  previewInvoiceId === inv.id && !isSelected && "border-indigo-300 ring-2 ring-indigo-600/10"
                                )}
                              >
                                <div className="flex items-start gap-4">
                                  <div className={cn(
                                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                                    isSelected ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-300"
                                  )}>
                                    {isSelected ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-black text-slate-800 truncate mb-1">{inv.computedDisplayName}</div>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">HĐ: {inv.computedInvoiceNumber || '---'}</div>
                                      <div className="text-[10px] font-bold text-slate-400 uppercase">Ngày: {formatDisplayDate(data.invoice?.date || data.date || '---')}</div>
                                    </div>
                                    <div className="mt-2 text-[10px] font-bold text-slate-600 line-clamp-1 uppercase opacity-60">
                                      BÁN: {data.seller?.name || '---'}
                                    </div>
                                  </div>
                                  {inv.extractedData?.classification && (
                                    <div className={cn(
                                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm shrink-0",
                                      inv.extractedData.classification === 'BB_TC' ? 'bg-orange-100 text-orange-700' : 
                                      inv.extractedData.classification === 'BB_CM' ? 'bg-blue-100 text-blue-700' : 
                                      'bg-green-100 text-green-700'
                                    )}>
                                      {inv.extractedData.classification.replace('BB_', '')}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            );
                         })}
                         {list.length === 0 && (
                            <div className="py-20 text-center opacity-20">
                               <FileQuestion className="w-12 h-12 mx-auto mb-4" />
                               <p className="text-[10px] font-black uppercase tracking-widest">Không có dữ liệu</p>
                            </div>
                         )}
                       </div>
                    </div>
                  );

                  return (
                    <>
                      {renderCol(pdfInvoices, "Hóa đơn PDF", FileText, "text-red-600")}
                      {renderCol(xmlInvoices, "Hóa đơn XML", FileCode, "text-emerald-600")}
                    </>
                  );
                })()}

                {/* Right: Detailed Preview Panel - Wider (500px) */}
                <div className="w-[500px] bg-white border border-slate-200 shadow-2xl rounded-[32px] flex flex-col relative z-20 overflow-hidden">
                  {(() => {
                    const activeRawInv = invoices.find(i => i.id === (previewInvoiceId || (selectedInvoices.length > 0 ? selectedInvoices[selectedInvoices.length - 1] : null)));
                    const activeInv = activeRawInv ? getEnrichedInvoice(activeRawInv, rankMap) : null;
                    if (!activeInv) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-300">
                          <Search className="w-16 h-16 mb-4 opacity-20" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Nhấp chọn để xem nhanh</p>
                        </div>
                      );
                    }

                    const data = activeInv.extractedData || {};
                    const items = data.items || data.lineItems || activeInv.lineItems || [];

                    return (
                      <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Preview Header */}
                        <div className="p-6 border-b border-indigo-500/20 bg-indigo-600 text-white shadow-xl relative">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                             <Search className="w-20 h-20 rotate-12" />
                          </div>
                          <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white border border-white/30 backdrop-blur-md">
                                <Search className="w-5 h-5" />
                              </div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Chi tiết hóa đơn</div>
                            </div>
                            <div className="bg-white/20 px-3 py-1.5 rounded-lg border border-white/20 text-[10px] font-black uppercase">
                               {formatDisplayDate(data.invoice?.date || data.date || '---')}
                            </div>
                          </div>
                          <div className="font-black text-base leading-tight break-words tracking-tight uppercase relative z-10">{activeInv.computedDisplayName}</div>
                        </div>

                        {/* Preview Content */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6 bg-slate-50/50">
                          {/* Partners info */}
                          <div className="space-y-4">
                             <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                               <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                 <Building2 className="w-3.5 h-3.5" /> BÊN BÁN
                               </div>
                               <div className="text-xs font-black text-slate-800 leading-relaxed uppercase">
                                 {data.seller?.name || '---'}
                               </div>
                               <div className="mt-2 text-[10px] font-bold text-slate-400">MST: {data.seller?.taxCode || '---'}</div>
                             </div>
                             <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                               <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                 <UserSquare2 className="w-3.5 h-3.5" /> BÊN MUA
                               </div>
                               <div className="text-xs font-black text-slate-800 leading-relaxed uppercase">
                                 {data.buyer?.name || '---'}
                               </div>
                               <div className="mt-2 text-[10px] font-bold text-slate-400">MST: {data.buyer?.taxCode || '---'}</div>
                             </div>
                          </div>

                          {/* Items List */}
                          <div className="space-y-3">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Hàng hóa & Dịch vụ</div>
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
                                  <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                    <div className="text-[11px] font-black text-slate-800 mb-2 uppercase line-clamp-2">
                                      {item.description || item.name}
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                      <div className="text-[10px] font-bold text-slate-400">
                                        {qty} × {formatThousands(String(price))} {item.unit || ''}
                                      </div>
                                      <div className="text-xs font-black text-emerald-600">
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
                             <div className="p-6 bg-slate-900 border-t border-white/5 shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
                                <div className="flex justify-between items-center">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Tổng thanh toán</span>
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
              <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-6">
                   <div className="flex gap-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Số lượng chọn</span>
                        <div className="text-2xl font-black text-indigo-600 leading-none">{selectedInvoices.length}</div>
                      </div>
                   </div>
                   <div className="w-px h-10 bg-slate-100"></div>
                   <button 
                      onClick={() => setSelectedInvoices([])}
                      className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors"
                   >
                     Hủy chọn tất cả
                   </button>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsInvoiceSelectorOpen(false)}
                    className="px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all border-2 border-transparent hover:border-slate-100"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    onClick={() => handleContractInvoiceIntegration(selectedInvoices)}
                    disabled={selectedInvoices.length === 0}
                    className="px-12 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-3 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative">Xác nhận dữ liệu</span>
                    <ArrowRight className="w-5 h-5 relative" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-xs text-center border border-slate-200">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-6">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Đang xử lý hóa đơn</h3>
            <p className="text-slate-500 text-sm italic">Mistral AI đang trích xuất dữ liệu từ các tệp của bạn. Quá trình này có thể mất vài giây...</p>
          </div>
        </div>
      )}
      
      <AIChatBox stats={{ invoices, contracts, partners }} />
    </div>
  );
}
