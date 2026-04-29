import React, { useState, useEffect } from 'react';
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
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  orderBy
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
import { cn, formatVNNumber } from './lib/utils';
import { useToast } from './components/Notifications';
import { loadTemplates, saveTemplate, deleteStoredTemplate, StoredTemplate } from './lib/storage';

// --- Types ---
type Tab = 'dashboard' | 'upload' | 'partners' | 'templates' | 'docs';

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
  extractedData?: any;
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

// --- Components ---

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
              className="font-bold text-white tracking-tight text-lg whitespace-nowrap"
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
                  className="ml-3 font-medium whitespace-nowrap"
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
}

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
            <h2 className="text-xl font-bold text-slate-800">Kiểm tra kết quả bóc tách</h2>
            <p className="text-xs text-slate-500 mt-1">Vui lòng rà soát lại thông tin trước khi lưu vào hệ thống</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Thông tin hóa đơn */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <FileText className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Thông tin Hóa đơn</h3>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Số Hóa Đơn</label>
                <input 
                  type="text" 
                  value={edited.invoice?.number || ''} 
                  onChange={(e) => handleChange('invoice.number', e.target.value)}
                  className="input-field" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ký hiệu</label>
                <input 
                  type="text" 
                  value={edited.invoice?.serial || ''} 
                  onChange={(e) => handleChange('invoice.serial', e.target.value)}
                  className="input-field" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ngày lập</label>
                <input 
                  type="text" 
                  value={edited.invoice?.date || ''} 
                  onChange={(e) => handleChange('invoice.date', e.target.value)}
                  className="input-field" 
                />
              </div>
            </div>
          </section>

          {/* Người bán & Người mua */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <Layout className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Đơn vị bán hàng</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên đơn vị</label>
                  <input 
                    type="text" 
                    value={edited.seller?.name || ''} 
                    onChange={(e) => handleChange('seller.name', e.target.value)}
                    className="input-field" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mã số thuế</label>
                  <input 
                    type="text" 
                    value={edited.seller?.taxCode || ''} 
                    onChange={(e) => handleChange('seller.taxCode', e.target.value)}
                    className="input-field" 
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <Users className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Khách hàng</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên đơn vị</label>
                  <input 
                    type="text" 
                    value={edited.buyer?.name || ''} 
                    onChange={(e) => handleChange('buyer.name', e.target.value)}
                    className="input-field" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mã số thuế</label>
                  <input 
                    type="text" 
                    value={edited.buyer?.taxCode || ''} 
                    onChange={(e) => handleChange('buyer.taxCode', e.target.value)}
                    className="input-field" 
                  />
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
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-2 text-center w-10">Stt</th>
                    <th className="p-2 text-left">Nội dung</th>
                    <th className="p-2 w-16 text-center">ĐVT</th>
                    <th className="p-2 w-16 text-center">SL</th>
                    <th className="p-2 w-24 text-right">Đơn giá</th>
                    <th className="p-2 w-28 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(edited.items || []).map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-1 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-1">
                        <input 
                          type="text" 
                          value={item.description || item.name || ''} 
                          className="w-full bg-transparent border-none p-1 focus:ring-1 focus:ring-indigo-500 rounded text-slate-700"
                          readOnly 
                        />
                      </td>
                      <td className="p-1 text-center text-slate-600">{item.unit || '-'}</td>
                      <td className="p-1 text-center text-slate-600 font-mono">{formatVNNumber(item.quantity) || '-'}</td>
                      <td className="p-1 text-right text-slate-600 font-mono">{formatVNNumber(item.unitPrice) || '-'}</td>
                      <td className="p-1 text-right font-bold text-slate-700 font-mono">
                        {formatVNNumber(item.amount || item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tổng cộng */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
               <div className="bg-slate-50 p-3 rounded-xl">
                 <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cộng tiền hàng</label>
                 <div className="font-mono font-bold text-slate-700">{formatVNNumber(edited.totals?.subtotal)}</div>
               </div>
               <div className="bg-slate-50 p-3 rounded-xl">
                 <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tiền thuế GTGT</label>
                 <div className="font-mono font-bold text-slate-700">{formatVNNumber(edited.totals?.vatAmount)}</div>
               </div>
               <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100/50">
                 <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Tổng tiền thanh toán</label>
                 <div className="font-mono font-bold text-indigo-700 text-lg leading-none">{formatVNNumber(edited.totals?.grandTotal)}</div>
               </div>
            </div>
          </section>
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <PlusSquare className="w-5 h-5" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Tổng cộng</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-4 rounded-xl">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tổng cộng tiền hàng</label>
                <div className="text-lg font-bold text-slate-800">{formatVNNumber(edited.totals?.subtotal)} đ</div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tiền thuế GTGT</label>
                <div className="text-lg font-bold text-slate-800">{formatVNNumber(edited.totals?.vatAmount)} đ</div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-amber-600 uppercase mb-1">Tổng tiền thanh toán</label>
                <div className="text-2xl font-black text-indigo-600">{formatVNNumber(edited.totals?.grandTotal)} đ</div>
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

const InvoiceItem: React.FC<InvoiceItemProps> = ({ inv, onSelectInvoice, onDeleteInvoice }) => (
  <div 
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
        <div className="font-semibold text-sm group-hover:text-blue-600 transition-colors truncate max-w-[120px] md:max-w-none">{inv.fileName}</div>
        <div className="text-[10px] text-slate-500">{new Date(inv.createdAt?.toDate()).toLocaleString()}</div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className={cn(
        "px-2 py-1 rounded text-[10px] font-bold uppercase",
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
);

// --- View: Dashboard ---
const DashboardView = ({ 
  stats, 
  onSelectInvoice, 
  onDeleteInvoice, 
  onExportExcel,
  isExportingExcel,
  isLoadingData
}: { 
  stats: any, 
  onSelectInvoice: (inv: any) => void, 
  onDeleteInvoice: (id: string) => void,
  onExportExcel: () => void,
  isExportingExcel: boolean,
  isLoadingData: boolean
}) => (
  <div className="space-y-6 overflow-y-auto h-full p-1">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 w-full">
        {[
          { label: 'Đang xử lý', value: stats.pending, color: 'border-l-yellow-500' },
          { label: 'Đối tác xác minh', value: stats.partners, color: 'border-l-blue-500' },
          { label: 'Tổng lượt trích xuất', value: stats.invoices, color: 'border-l-green-500' },
          { label: 'Độ chính xác', value: '99.8%', color: 'border-l-indigo-500' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn("bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4", stat.color)}
          >
            <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{stat.label}</div>
            <div className="text-2xl font-bold text-slate-900">
              {isLoadingData ? <Skeleton className="h-8 w-16" /> : stat.value}
            </div>
          </motion.div>
        ))}
      </div>
      
      <button 
        onClick={onExportExcel}
        disabled={isExportingExcel || stats.invoices === 0}
        className={cn(
          "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 whitespace-nowrap",
          isExportingExcel ? "bg-slate-100 text-slate-400" : "bg-green-600 text-white hover:bg-green-700"
        )}
      >
        {isExportingExcel ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
        Tải danh sách Excel
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Cột PDF */}
      <div className="card h-fit">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider">Danh sách file PDF</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">{stats.recentInvoices.filter((i: any) => i.fileType === 'pdf').length} tệp</span>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {isLoadingData ? (
              [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)
            ) : stats.recentInvoices.filter((i: any) => i.fileType === 'pdf').length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs italic">Chưa có tệp PDF nào</div>
            ) : (
              stats.recentInvoices
                .filter((i: any) => i.fileType === 'pdf')
                .map((inv: any) => (
                  <InvoiceItem key={inv.id} inv={inv} onSelectInvoice={onSelectInvoice} onDeleteInvoice={onDeleteInvoice} />
                ))
            )}
          </div>
        </div>
      </div>

      {/* Cột XML */}
      <div className="card h-fit">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider">Danh sách file XML</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">{stats.recentInvoices.filter((i: any) => i.fileType === 'xml').length} tệp</span>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {isLoadingData ? (
              [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)
            ) : stats.recentInvoices.filter((i: any) => i.fileType === 'xml').length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs italic">Chưa có tệp XML nào</div>
            ) : (
              stats.recentInvoices
                .filter((i: any) => i.fileType === 'xml')
                .map((inv: any) => (
                  <InvoiceItem key={inv.id} inv={inv} onSelectInvoice={onSelectInvoice} onDeleteInvoice={onDeleteInvoice} />
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// --- View: Upload ---
const UploadView = ({ onUpload }: { onUpload: (files: File[]) => void }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    accept: {
      'application/pdf': ['.pdf'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml']
    }
  } as any);

  return (
    <div className="space-y-6">
      <div className="card p-12">
        <div 
          {...getRootProps()} 
          className={cn(
            "border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 transition-all cursor-pointer",
            isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
          )}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Kéo và thả hóa đơn vào đây</h3>
          <p className="text-slate-500 text-sm mb-6">Hỗ trợ định dạng PDF và XML (Chuẩn Việt Nam)</p>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Chọn tệp tin
          </button>
        </div>
      </div>
    </div>
  );
};

// --- View: Partners ---
const PartnersView = ({ partners, onEdit, onDelete }: { partners: Partner[], onEdit: (p: Partner) => void, onDelete: (id: string) => void }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold">Đối tác kinh doanh</h2>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm đối tác..." 
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Thông tin công ty</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Địa chỉ</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tài khoản ngân hàng</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Người đại diện</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {partners.map((partner) => (
              <tr key={partner.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">{partner.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{partner.taxCode}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-[10px] text-slate-500 truncate max-w-[200px]" title={partner.address}>
                    <span className="font-bold">Cũ:</span> {partner.address}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[200px]" title={partner.addressPostMerger}>
                    <span className="font-bold">Sau sáp nhập:</span> {partner.addressPostMerger || '-'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs font-semibold text-slate-700">{partner.accountNumber || '-'}</div>
                  <div className="text-[10px] text-slate-400">{partner.bankName || '-'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-slate-700">{partner.representative || '-'}</div>
                  <div className="text-[10px] text-slate-400">{partner.position || '-'}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => onEdit(partner)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"
                    >
                      <Edit2 className="w-4 h-4" />
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- View: Generated Docs ---
const DocsView = ({ items, onDelete, invoices, partners }: { items: GeneratedDoc[], onDelete: (id: string) => void, invoices: Invoice[], partners: Partner[] }) => {
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

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

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: genDoc.templateType,
          data: inv.extractedData,
          partnerA: pA,
          partnerB: pB
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = genDoc.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Lỗi khi tải file: " + err.message);
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
         <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-600">Đã tạo {items.length} tài liệu</span>
         </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((docItem) => (
          <div key={docItem.id} className="card p-4 hover:border-blue-300 transition-all group relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{docItem.fileName}</div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{docItem.templateType}</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-50">
              <span className="text-slate-500">
                {docItem.createdAt?.toDate ? new Date(docItem.createdAt.toDate()).toLocaleDateString() : '...'}
              </span>
              <div className="flex items-center gap-2">
                <button 
                  disabled={isDownloading === docItem.id}
                  onClick={() => downloadDoc(docItem)}
                  className="text-blue-600 font-bold hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
                >
                  {isDownloading === docItem.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  Tải xuống
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onDelete(docItem.id);
                  }}
                  className="w-10 h-10 text-red-500 hover:bg-red-50 rounded-lg border border-red-100 transition-all flex items-center justify-center shrink-0 active:scale-95"
                  title="Xóa tài liệu"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Bulk Export Modal ---
const BulkExportModal = ({ 
  invoices, 
  partners, 
  onClose 
}: { 
  invoices: Invoice[], 
  partners: Partner[], 
  onClose: () => void 
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const completedInvoices = invoices.filter(inv => inv.status === 'completed');

  const handleSelectAll = () => {
    if (selectedIds.length === completedInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(completedInvoices.map(inv => inv.id));
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

    for (let i = 0; i < selectedIds.length; i++) {
      const invId = selectedIds[i];
      const inv = completedInvoices.find(invoice => invoice.id === invId);
      if (!inv) continue;

      const pA = partners.find(p => p.taxCode === inv.extractedData?.seller?.taxCode) || {};
      const pB = partners.find(p => p.taxCode === inv.extractedData?.buyer?.taxCode) || {};

      // Determine template type based on classification
      let templateType = 'BB_CM';
      if (inv.extractedData?.classification) {
        if (inv.extractedData.classification.includes('VT')) templateType = 'BB_VT';
        else if (inv.extractedData.classification.includes('TC')) templateType = 'BB_TC';
      }

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateType,
            data: inv.extractedData,
            partnerA: pA,
            partnerB: pB
          })
        });

        if (res.ok) {
          const blob = await res.blob();
          const fileName = `BienBan_${inv.fileName.split('.')[0]}.docx`;
          folder?.file(fileName, blob);
        }
      } catch (err) {
        console.error("Export error for invoice:", inv.fileName, err);
      }
      setExportProgress(Math.round(((i + 1) / selectedIds.length) * 100));
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `DocuForge_BulkExport_${new Date().getTime()}.zip`);
    
    setIsExporting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900">Xuất biên bản hàng loạt</h3>
            <p className="text-xs text-slate-500">Chọn các hóa đơn đã xử lý xong để tạo và tải về</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex items-center justify-between px-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Danh sách hóa đơn ({completedInvoices.length})
            </div>
            <button 
              onClick={handleSelectAll}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              {selectedIds.length === completedInvoices.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
          </div>

          <div className="space-y-2">
            {completedInvoices.map((inv) => (
              <div 
                key={inv.id}
                onClick={() => handleToggleSelect(inv.id)}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3",
                  selectedIds.includes(inv.id) 
                    ? "bg-blue-50 border-blue-200 shadow-sm" 
                    : "border-slate-100 hover:border-slate-200"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                  selectedIds.includes(inv.id) ? "bg-blue-600 border-blue-600" : "border-slate-300"
                )}>
                  {selectedIds.includes(inv.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{inv.fileName}</div>
                  <div className="text-[10px] text-slate-400 flex gap-2">
                    <span>{new Date(inv.createdAt?.toDate()).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="uppercase">{inv.extractedData?.classification || 'Ca Máy'}</span>
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-700">
                  {formatVNNumber(inv.extractedData?.totals?.grandTotal || 0)} đ
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
          {isExporting ? (
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Đang xử lý tài liệu...</span>
                <span>{exportProgress}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <button 
                onClick={handleBulkExport}
                disabled={selectedIds.length === 0}
                className={cn(
                  "flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2",
                  selectedIds.length > 0 ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed"
                )}
              >
                <Download className="w-5 h-5" />
                Tải về {selectedIds.length} biên bản (.zip)
              </button>
              <button 
                onClick={onClose}
                className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-white transition-all active:scale-95"
              >
                Hủy
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- Constants ---

const TAB_CONFIG: Record<Tab, { hash: string, label: string }> = {
  dashboard: { hash: 'tong-quan', label: 'Bảng điều khiển' },
  upload: { hash: 'tai-len', label: 'Tải lên hóa đơn' },
  partners: { hash: 'doi-tac', label: 'Đối tác & Khách hàng' },
  templates: { hash: 'mau-tai-lieu', label: 'Mẫu tài liệu' },
  docs: { hash: 'huong-dan', label: 'Hướng dẫn sử dụng' }
};

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // Sync state with Hash on mount
  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash.replace('#/', '');
      const foundTab = (Object.keys(TAB_CONFIG) as Tab[]).find(
        key => TAB_CONFIG[key].hash === currentHash
      );
      if (foundTab) {
        setActiveTab(foundTab);
      } else if (!currentHash || currentHash === '/') {
        window.location.hash = `#/${TAB_CONFIG.dashboard.hash}`;
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update Hash when Tab changes manually
  const handleTabChange = (tab: Tab) => {
    window.location.hash = `#/${TAB_CONFIG[tab].hash}`;
    setActiveTab(tab);
  };

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [showBulkExport, setShowBulkExport] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [pendingReview, setPendingReview] = useState<{file: File, docRef: any, data: any} | null>(null);
  const { toast, clearToasts } = useToast();

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
      const res = await fetch('/api/templates');
      const data = await res.json();
      setAvailableTemplates(data.templates || []);
    } catch (e) {
      console.error("Failed to fetch templates:", e);
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
      await updateDoc(doc(db, 'partners', id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      setEditingPartner(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `partners/${id}`);
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
    console.log("handleDeleteDoc called with id:", id);
    try {
      await deleteDoc(doc(db, 'generated_docs', id));
      console.log("Document deleted successfully");
    } catch (error) {
      console.error("Delete doc error:", error);
      handleFirestoreError(error, OperationType.DELETE, `generated_docs/${id}`);
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

    if (user) {
      setIsLoadingInvoices(true);
      // Sync data from Firestore
      const qPartners = query(
        collection(db, 'partners'), 
        where('ownerId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );
      unsubPartners = onSnapshot(qPartners, (snap) => {
        setPartners(snap.docs.map(d => ({ id: d.id, ...d.data() } as Partner)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'partners');
      });

      const qInvoices = query(
        collection(db, 'invoices'), 
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      unsubInvoices = onSnapshot(qInvoices, (snap) => {
        setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
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
    } else {
      setPartners([]);
      setInvoices([]);
      setGeneratedDocs([]);
    }

    return () => {
      unsubAuth();
      unsubPartners();
      unsubInvoices();
      unsubDocs();
    };
  }, [user]);

  const handleFileUpload = async (files: File[]) => {
    if (!user) {
      toast("Vui lòng đăng nhập trước khi thực hiện.", "error");
      return;
    }
    setIsProcessing(true);
    
    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      toast(`[${i+1}/${files.length}] Đang xử lý ${file.name}...`, 'loading');
      
      // Image Compression for image files
      if (file.type.startsWith('image/')) {
        try {
          toast(`[${i+1}/${files.length}] Đang nén ảnh để tối ưu tốc độ...`, 'loading');
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
          docRef = await addDoc(collection(db, 'invoices'), {
            fileName: file.name,
            fileType: fileExt,
            fileURL: fileURL,
            storagePath: filePath,
            status: 'processing',
            ownerId: user.uid,
            createdAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'invoices');
        }

        toast(`[${i+1}/${files.length}] Đang gửi dữ liệu sang Google Script...`, 'loading');

        let extractedData: any;
        if (fileExt === 'xml') {
          setRequestCount(prev => prev + 1); // Increment for XML parse
          const text = await file.text();
          const res = await fetch('/api/parse-xml', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ xmlString: text })
          });
          extractedData = await res.json();
          
          if (extractedData.items) {
            try {
              const { classifyInvoice } = await import('./lib/mistral');
              extractedData.classification = await classifyInvoice(extractedData.items);
            } catch (e) {
              console.error("Classification failed:", e);
            }
          }
        } else {
          toast(`[${i+1}/${files.length}] Đang chờ Mistral AI phản hồi...`, 'loading');
          setRequestCount(prev => prev + 1); // Increment for PDF extraction
          extractedData = await extractFromInvoice(file);
        }

        // Step 3 (NEW): Show Review Modal instead of auto-completing
        clearToasts(); 
        setPendingReview({ file, docRef, data: extractedData });
        setIsProcessing(false);
        return; // Break processing loop to wait for user review

      } catch (error: any) {
        console.error("Processing error:", error);
        toast(`Lỗi khi xử lý tệp ${file.name}: ${error.message}`, "error");
        if (docRef) {
          try {
            await updateDoc(docRef, { 
              status: 'error',
              error: error instanceof Error ? error.message : String(error)
            });
          } catch (e) {
            console.error("Failed to update error status:", e);
          }
        }
      }
    }
    setIsProcessing(false);
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

  const finalizeInvoice = async (updatedData: any) => {
    if (!pendingReview) return;
    const { docRef } = pendingReview;
    setIsProcessing(true);
    try {
      const updates: any = {
        status: 'completed',
        extractedData: updatedData
      };

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

      const upsertPartner = async (p: any) => {
        if (!p || !p.taxCode || !user) return;
        const q = query(
          collection(db, 'partners'), 
          where('ownerId', '==', user.uid),
          where('taxCode', '==', p.taxCode)
        );
        const snap = await getDocs(q);
        const existing = snap.docs[0];
        
        const partnerData = {
          name: p.name,
          taxCode: p.taxCode,
          address: isPostMerger ? '' : p.address,
          addressPostMerger: isPostMerger ? p.address : '',
          updatedAt: serverTimestamp(),
          ownerId: user?.uid
        };

        if (!existing) {
          await addDoc(collection(db, 'partners'), partnerData);
        } else {
          const current = existing.data();
          const updates: any = { updatedAt: serverTimestamp() };
          if (isPostMerger && !current.addressPostMerger) updates.addressPostMerger = p.address;
          if (!isPostMerger && !current.address) updates.address = p.address;
          await updateDoc(existing.ref, updates);
        }
      };

      if (seller) await upsertPartner(seller);
      if (buyer) await upsertPartner(buyer);

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
    recentInvoices: invoices.slice(0, 5)
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
        <header className="h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2 text-slate-500 text-sm italic">
            <span>DocuForge AI</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-bold not-italic font-mono uppercase text-xs">
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
                onClick={() => setShowBulkExport(true)}
                className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg text-xs font-bold transition-all flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Xuất hàng loạt
              </button>
              <span className="w-px h-4 bg-slate-200 mx-1"></span>
              <button 
                onClick={() => handleTabChange('upload')}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2"
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

        <div className="flex-1 p-8 overflow-y-auto">
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
                  onSelectInvoice={setSelectedInvoice} 
                  onDeleteInvoice={handleDeleteInvoice}
                  onExportExcel={exportInvoicesToExcel}
                  isExportingExcel={isExportingExcel}
                  isLoadingData={isLoadingInvoices}
                />
              )}
              {activeTab === 'dashboard' && selectedInvoice && (
                <div className="grid grid-cols-12 gap-6 h-full min-h-[600px]">
                  {/* Left Panel: Extracted Source */}
                  <div className="col-span-4 flex flex-col card h-full">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h3 className="font-bold text-sm text-slate-700 truncate mr-2">Nguồn: {selectedInvoice.fileName}</h3>
                      <button 
                        onClick={() => setSelectedInvoice(null)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Quay lại
                      </button>
                    </div>
                    <div className="flex-1 p-4 space-y-6 overflow-y-auto text-sm">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Người bán (Bên A)</label>
                        <div className="font-semibold">{selectedInvoice.extractedData?.seller?.name}</div>
                        <div className="text-xs text-slate-500 font-mono">MST: {selectedInvoice.extractedData?.seller?.taxCode}</div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Người mua (Bên B)</label>
                        <div className="font-semibold">{selectedInvoice.extractedData?.buyer?.name}</div>
                        <div className="text-xs text-slate-500 font-mono">MST: {selectedInvoice.extractedData?.buyer?.taxCode}</div>
                      </div>
                      <div className="p-4 bg-slate-900 rounded-xl font-mono text-[11px] text-blue-400 overflow-x-auto shadow-inner">
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
                            const res = await fetch('/api/generate', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                templateType: tType,
                                data: selectedInvoice.extractedData,
                                partnerA: pA,
                                partnerB: pB
                              })
                            });
                            
                            if (!res.ok) {
                              const errorData = await res.json().catch(() => ({}));
                              throw new Error(errorData.error || "Failed to generate. Ensure template is in /templates folder.");
                            }

                            const blob = await res.blob();
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
                          {selectedInvoice.extractedData?.items?.map((item: any, i: number) => (
                            <tr key={i}>
                              <td className="border border-slate-200 p-2 text-center text-slate-400 font-mono">{i + 1}</td>
                              <td className="border border-slate-200 p-2 font-medium">{item.description || item.name}</td>
                              <td className="border border-slate-200 p-2 text-center">{item.unit || '-'}</td>
                              <td className="border border-slate-200 p-2 text-center">{formatVNNumber(item.quantity) || '-'}</td>
                              <td className="border border-slate-200 p-2 text-right font-mono">{formatVNNumber(item.unitPrice) || '-'}</td>
                              <td className="border border-slate-200 p-2 text-right font-bold text-slate-800 font-mono">{formatVNNumber(item.amount || item.total)}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-100/50 font-bold">
                            <td colSpan={5} className="border border-slate-200 p-2 text-right uppercase text-[10px] tracking-wider">Tổng cộng</td>
                            <td className="border border-slate-200 p-2 text-right font-mono">{formatVNNumber(selectedInvoice.extractedData?.totals?.subtotal)}</td>
                          </tr>
                          <tr className="font-bold">
                            <td colSpan={5} className="border border-slate-200 p-2 text-right italic text-[10px]">Thuế GTGT ({selectedInvoice.extractedData?.invoice?.vatRate}%)</td>
                            <td className="border border-slate-200 p-2 text-right font-mono">{formatVNNumber(selectedInvoice.extractedData?.totals?.vatAmount)}</td>
                          </tr>
                          <tr className="bg-blue-50 text-blue-900 font-bold">
                            <td colSpan={5} className="border border-slate-200 p-2 text-right text-xs uppercase tracking-tight">Thành tiền (Sau thuế)</td>
                            <td className="border border-slate-200 p-2 text-right text-xs font-mono">{formatVNNumber(selectedInvoice.extractedData?.totals?.grandTotal || selectedInvoice.extractedData?.totals?.grand_total)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'upload' && <UploadView onUpload={handleFileUpload} />}
              {activeTab === 'partners' && <PartnersView partners={partners} onEdit={setEditingPartner} onDelete={handleDeletePartner} />}
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
                        <h4 className="font-bold text-slate-900 mb-1">{t.label}</h4>
                        <p className="text-xs text-slate-500 mb-6 flex-1">{t.desc}</p>
                        
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
                  invoices={invoices}
                  partners={partners}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="h-10 bg-slate-100 border-t border-slate-200 flex items-center px-6 justify-between text-[10px] text-slate-500 font-medium shrink-0">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <span>REGION: asia-southeast1</span>
              <span className="w-px h-3 bg-slate-300"></span>
              <span className="font-bold text-slate-700">MISTRAL AI (Pixtral)</span>
            </div>
            <span className="w-px h-3 bg-slate-300"></span>
            <div className="flex items-center gap-2 px-2 py-0.5 bg-white rounded border border-slate-200 shadow-sm">
              <span className="text-slate-400 font-bold">TOKEN MANAGER:</span>
              <span className={cn(
                "font-bold",
                requestCount >= 5 ? "text-red-500" : "text-indigo-600"
              )}>{Math.max(0, 5 - requestCount)} Lượt còn lại</span>
              {timeLeft > 0 && (
                <>
                  <span className="w-px h-2 bg-slate-200"></span>
                  <span className="text-orange-500 font-bold shrink-0">RESET TRONG: {timeLeft}s</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isProcessing && (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                <span className="text-blue-600 font-bold">ĐANG XỬ LÝ DỮ LIỆU</span>
              </>
            )}
            {!isProcessing && (
              <>
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>HỆ THỐNG SẴN SÀNG</span>
              </>
            )}
          </div>
        </footer>
      </main>

      {/* Quota Reset Notice */}
      <div className="fixed bottom-12 right-6">
        <AnimatePresence>
          {requestCount >= 4 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-[10px] px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2"
            >
              <AlertCircle className="w-3 h-3" />
              <span>Sắp chạm ngưỡng giới hạn (5 lượt/phút)</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Partner Edit Modal */}
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
                <h3 className="font-bold text-slate-900">Chỉnh sửa thông tin đối tác</h3>
                <button onClick={() => setEditingPartner(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form 
                className="p-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleUpdatePartner(editingPartner.id, {
                    representative: formData.get('representative') as string,
                    position: formData.get('position') as string,
                    gender: formData.get('gender') as string,
                    address: formData.get('address') as string,
                    addressPostMerger: formData.get('addressPostMerger') as string,
                    accountNumber: formData.get('accountNumber') as string,
                    bankName: formData.get('bankName') as string,
                  });
                }}
              >
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tên công ty</label>
                  <div className="text-sm font-semibold p-2 bg-slate-50 border border-slate-100 rounded text-slate-500">{editingPartner.name}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Mã số thuế</label>
                  <div className="text-xs font-mono p-2 bg-slate-50 border border-slate-100 rounded text-slate-500">{editingPartner.taxCode}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Địa chỉ (Tiêu chuẩn)</label>
                    <input 
                      name="address"
                      defaultValue={editingPartner.address}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Địa chỉ..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Địa chỉ (Sau sáp nhập 1/7/2025)</label>
                    <input 
                      name="addressPostMerger"
                      defaultValue={editingPartner.addressPostMerger}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Địa chỉ sau sáp nhập..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Số tài khoản</label>
                    <input 
                      name="accountNumber"
                      defaultValue={editingPartner.accountNumber}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Số tài khoản..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tên ngân hàng</label>
                    <input 
                      name="bankName"
                      defaultValue={editingPartner.bankName}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Tên ngân hàng..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Người đại diện</label>
                    <input 
                      name="representative"
                      defaultValue={editingPartner.representative}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Chức vụ</label>
                    <input 
                      name="position"
                      defaultValue={editingPartner.position}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Giám đốc"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Giới tính</label>
                  <select 
                    name="gender" 
                    defaultValue={editingPartner.gender || 'Nam'}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="submit" className="btn-primary flex-1">Lưu thay đổi</button>
                  <button type="button" onClick={() => setEditingPartner(null)} className="px-4 py-1.5 border border-slate-200 rounded text-sm hover:bg-slate-50 transition-colors flex-1">Hủy</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {showBulkExport && (
          <BulkExportModal 
            invoices={invoices}
            partners={partners}
            onClose={() => setShowBulkExport(false)}
          />
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
    </div>
  );
}
