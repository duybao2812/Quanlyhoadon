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
  MapPin
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
import { generateDocxBlob } from './lib/docxGenerator';
import { smartConvertAddress } from './lib/addressConverter';
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
  contractNumber?: string;
  contractDate?: string;
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
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Địa chỉ</label>
                  <input 
                    type="text" 
                    value={edited.seller?.address || ''} 
                    onChange={(e) => handleChange('seller.address', e.target.value)}
                    className="input-field" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Số tài khoản</label>
                    <input 
                      type="text" 
                      value={edited.seller?.accountNumber || ''} 
                      onChange={(e) => handleChange('seller.accountNumber', e.target.value)}
                      className="input-field" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ngân hàng</label>
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
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Địa chỉ</label>
                  <input 
                    type="text" 
                    value={edited.buyer?.address || ''} 
                    onChange={(e) => handleChange('buyer.address', e.target.value)}
                    className="input-field" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Số tài khoản</label>
                    <input 
                      type="text" 
                      value={edited.buyer?.accountNumber || ''} 
                      onChange={(e) => handleChange('buyer.accountNumber', e.target.value)}
                      className="input-field" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ngân hàng</label>
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
                      <td className="p-2 whitespace-normal break-words text-slate-700 leading-relaxed min-w-[200px]">
                        {item.description || item.name || ''}
                      </td>
                      <td className="p-1 text-center text-slate-600">{item.unit || '-'}</td>
                      <td className="p-1 text-center text-slate-600 font-mono">
                        {item.quantity && item.quantity !== 0 ? formatVNNumber(item.quantity) : ''}
                      </td>
                      <td className="p-1 text-right text-slate-600 font-mono">
                        {item.unitPrice && item.unitPrice !== 0 ? formatVNNumber(item.unitPrice) : ''}
                      </td>
                      <td className="p-1 text-right font-bold text-slate-700 font-mono">
                        {formatVNNumber(item.amount || item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Tiền thuế GTGT {edited.invoice?.vatRate ? `(${edited.invoice.vatRate}%)` : ''}
                </label>
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
}) => {
  const [fileSearchTerm, setFileSearchTerm] = useState('');

  const filteredInvoices = (stats.recentInvoices || []).filter((inv: any) => 
    inv.fileName?.toLowerCase().includes(fileSearchTerm.toLowerCase())
  );

  const pdfFiles = filteredInvoices.filter((i: any) => i.fileType === 'pdf');
  const xmlFiles = filteredInvoices.filter((i: any) => i.fileType === 'xml');

  return (
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

      {/* Thanh tìm kiếm tệp */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Tìm kiếm tên tệp PDF hoặc XML..."
            value={fileSearchTerm}
            onChange={(e) => setFileSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all font-medium"
          />
        </div>
        {fileSearchTerm && (
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
            Tìm thấy: {filteredInvoices.length} tệp
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cột PDF */}
        <div className="card h-fit">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider">Danh sách file PDF</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400">{pdfFiles.length} tệp</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {isLoadingData ? (
                [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)
              ) : pdfFiles.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  {fileSearchTerm ? "Không tìm thấy kết quả" : "Chưa có tệp PDF nào"}
                </div>
              ) : (
                pdfFiles.map((inv: any) => (
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
            <span className="text-[10px] font-bold text-slate-400">{xmlFiles.length} tệp</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {isLoadingData ? (
                [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)
              ) : xmlFiles.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  {fileSearchTerm ? "Không tìm thấy kết quả" : "Chưa có tệp XML nào"}
                </div>
              ) : (
                xmlFiles.map((inv: any) => (
                  <InvoiceItem key={inv.id} inv={inv} onSelectInvoice={onSelectInvoice} onDeleteInvoice={onDeleteInvoice} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
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
                <div className="flex items-center gap-2 text-[10px] font-bold text-red-500 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                  HÓA ĐƠN PDF / ẢNH
                </div>
                <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">
                  {queue.filter(f => !f.name.toLowerCase().endsWith('.xml')).length}
                </span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {queue.filter(f => !f.name.toLowerCase().endsWith('.xml')).length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-[10px] text-slate-300 italic font-medium uppercase tracking-widest">Trống</p>
                  </div>
                )}
                {queue.filter(f => !f.name.toLowerCase().endsWith('.xml')).map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 group hover:border-red-100 hover:bg-red-50/10 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-700 truncate">{file.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono uppercase">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemove(file.name)} 
                      className="p-1.5 hover:bg-red-500 hover:text-white rounded-lg text-slate-300 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
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
                        <p className="text-[11px] font-bold text-slate-700 truncate">{file.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono uppercase">{(file.size / 1024).toFixed(1)} KB</p>
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
          <h2 className="text-xl font-bold text-slate-800">Đối tác & Khách hàng</h2>
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
                        <div className="text-sm font-medium text-slate-700 font-mono tracking-tight">{convResult.detail || "N/A"}</div>
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
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{partner.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{partner.taxCode}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[10px] text-slate-500 truncate max-w-[200px] leading-relaxed" title={partner.address}>
                      <span className="font-bold text-slate-400 uppercase text-[9px]">Gốc:</span> {partner.address}
                    </div>
                    {partner.addressPostMerger && (
                      <div className="text-[10px] text-indigo-500 truncate max-w-[200px] mt-0.5 leading-relaxed" title={partner.addressPostMerger}>
                        <span className="font-bold uppercase text-[9px]">Mới:</span> {partner.addressPostMerger}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono">
                    <div className="text-xs font-bold text-slate-700">{partner.accountNumber || '-'}</div>
                    <div className="text-[9px] text-slate-400 uppercase font-sans font-bold">{partner.bankName || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-700 font-medium">{partner.representative || '-'}</div>
                    <div className="text-[10px] text-slate-400 italic">{partner.position || '-'}</div>
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
            partnerB: pB,
            contractNumber: inv.contractNumber,
            contractDate: inv.contractDate
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
  docs: { hash: 'tai-lieu-da-tao', label: 'Tài liệu đã tạo' }
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

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([]);
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

  // Sync state with Hash on mount
  useEffect(() => {
    const handleHashChange = () => {
      const currentFullHash = window.location.hash.replace('#/', '');
      const [path, slug] = currentFullHash.split('/');
      
      const foundTab = (Object.keys(TAB_CONFIG) as Tab[]).find(
        key => TAB_CONFIG[key].hash === path
      );
      
      if (foundTab) {
        setActiveTab(foundTab);
        // Special handling for dashboard detail view
        if (foundTab === 'dashboard' && slug) {
          // Extract ID from slug (slug is filename-id)
          const parts = slug.split('-');
          const id = parts[parts.length - 1]; // ID is always the last part

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
          const parts = slug.split('-');
          const taxCode = parts[0];
          
          if (partners.length > 0) {
            const pIndex = partners.findIndex(p => p.taxCode === taxCode);
            if (pIndex !== -1) {
              const p = partners[pIndex];
              setMultiPartnerEdit(prev => (prev?.isOpen ? { ...prev, currentIndex: pIndex } : prev));
              setEditingPartner(p);
            }
          }
        } else if (foundTab === 'partners' && !slug) {
          setEditingPartner(null);
        }
      } else if (!currentFullHash || currentFullHash === '/') {
        window.location.hash = `#/${TAB_CONFIG.dashboard.hash}/`;
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [invoices.length]); // Re-run when invoices are loaded to catch direct links

  // Sync Hash with Multi-Partner Edit
  useEffect(() => {
    if (multiPartnerEdit?.isOpen) {
      const currentPartner = partners[multiPartnerEdit.currentIndex];
      if (currentPartner) {
        const cleanName = removeTones(currentPartner.name).replace(/\s+/g, '').toUpperCase();
        window.location.hash = `#/${TAB_CONFIG.partners.hash}/${currentPartner.taxCode}-${cleanName}/`;
      }
    }
  }, [multiPartnerEdit?.currentIndex, multiPartnerEdit?.isOpen, partners]);

  // Update Hash when Tab changes manually
  const handleTabChange = (tab: Tab) => {
    window.location.hash = `#/${TAB_CONFIG[tab].hash}/`;
    setActiveTab(tab);
    if (tab === 'dashboard') {
      setSelectedInvoice(null);
    }
  };

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
      
      const res = await fetch(`templates/${templateId}.docx`);
      if (!res.ok) throw new Error(`Template ${templateId} không tìm thấy trong hệ thống.`);
      return await res.arrayBuffer();
    } catch (error: any) {
      console.error("Error loading template buffer:", error);
      throw new Error(`Không thể tải mẫu [${templateId}]: ${error.message}`);
    }
  };

  const handleInvoiceSelect = (inv: Invoice | null) => {
    if (inv) {
      // Get filename without extension
      const baseName = inv.fileName.replace(/\.[^/.]+$/, "");
      // Remove tones but preserve case
      const cleanFileName = removeTones(baseName);
      
      window.location.hash = `#/${TAB_CONFIG.dashboard.hash}/${cleanFileName}-${inv.id}/`;
      setSelectedInvoice(inv);
    } else {
      window.location.hash = `#/${TAB_CONFIG.dashboard.hash}/`;
      setSelectedInvoice(null);
    }
  };

  const handlePartnerEditSelect = (p: Partner | null) => {
    if (p) {
      const cleanName = removeTones(p.name).replace(/\s+/g, '').toUpperCase();
      window.location.hash = `#/${TAB_CONFIG.partners.hash}/${p.taxCode}-${cleanName}/`;
      setEditingPartner(p);
    } else {
      window.location.hash = `#/${TAB_CONFIG.partners.hash}/`;
      setEditingPartner(null);
    }
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
      await updateDoc(doc(db, 'partners', id), cleanObject({
        ...updates,
        updatedAt: serverTimestamp()
      }));
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

  // Helper: Normalize extracted data (Fix typos, common AI mistakes)
  const normalizeExtractedData = (data: any) => {
    if (!data) return data;
    
    // Helper to fix string values
    const fixString = (str: any) => {
      if (typeof str !== 'string') return str;
      // Fix "Ngọc Thám" to "Ngọc Thắm" (misreading tone mark)
      return str.replace(/NGỌC THÁM/gi, (match) => {
        if (match === match.toUpperCase()) return 'NGỌC THẮM';
        if (match === match.toLowerCase()) return 'ngọc thắm';
        return 'Ngọc Thắm';
      });
    };

    const newData = { ...data };
    
    // Fix Seller & Buyer names and addresses
    if (newData.seller) {
      newData.seller.name = fixString(newData.seller.name);
      newData.seller.address = fixString(newData.seller.address);
    }
    if (newData.buyer) {
      newData.buyer.name = fixString(newData.buyer.name);
      newData.buyer.address = fixString(newData.buyer.address);
    }
    
    // Fix items description
    if (newData.items && Array.isArray(newData.items)) {
      newData.items = newData.items.map((item: any) => ({
        ...item,
        name: fixString(item.name),
        description: fixString(item.description)
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
      name: p.name || "",
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
                  onSelectInvoice={handleInvoiceSelect} 
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
                        onClick={() => handleInvoiceSelect(null)}
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
                      
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Thông tin Hợp đồng</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <div className="text-[9px] text-slate-400 uppercase font-bold px-1">Số hợp đồng</div>
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
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[9px] text-slate-400 uppercase font-bold px-1">Ngày ký HĐ</div>
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
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>
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
                            const fallback = "....................";

                            return (
                              <tr key={i}>
                                <td className="border border-slate-200 p-2 text-center text-slate-400 font-mono">{i + 1}</td>
                                <td className="border border-slate-200 p-2 font-medium">{item.description || item.name || fallback}</td>
                                <td className="border border-slate-200 p-2 text-center">{item.unit || fallback}</td>
                                <td className="border border-slate-200 p-2 text-center">{qty > 0 ? formatVNNumber(qty) : fallback}</td>
                                <td className="border border-slate-200 p-2 text-right font-mono">{price > 0 ? formatVNNumber(price) : fallback}</td>
                                <td className="border border-slate-200 p-2 text-right font-bold text-slate-800 font-mono">{amount > 0 ? formatVNNumber(amount) : '0'}</td>
                              </tr>
                            );
                          })}
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
                  onBatchEdit={() => {
                    setMultiPartnerEdit({
                      isOpen: true,
                      currentIndex: 0,
                      drafts: {},
                      showExitConfirm: false
                    });
                  }}
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
                  onBulkDelete={handleBulkDeleteDocs}
                  onDeleteAll={handleDeleteAllDocs}
                  invoices={invoices}
                  partners={partners}
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
            <div className="text-5xl font-black text-indigo-600 font-mono tracking-tighter">
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
                  <h3 className="font-bold text-slate-900">Chỉnh sửa nhanh</h3>
                </div>
                <button onClick={() => handlePartnerEditSelect(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
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
                    await handleUpdatePartner(editingPartner.id, {
                      representative: formData.get('representative') as string,
                      position: formData.get('position') as string,
                      gender: formData.get('gender') as string,
                      address: formData.get('address') as string,
                      addressPostMerger: formData.get('addressPostMerger') as string,
                      accountNumber: formData.get('accountNumber') as string,
                      bankName: formData.get('bankName') as string,
                    });
                    handlePartnerEditSelect(null);
                    toast("Đã cập nhật đối tác", "success");
                  } catch (err) {
                    toast("Lỗi cập nhật", "error");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
              >
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Công ty / MST</label>
                  <div className="text-sm font-semibold text-slate-900">{editingPartner.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono italic">{editingPartner.taxCode}</div>
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
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
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
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 font-mono text-sm">
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
