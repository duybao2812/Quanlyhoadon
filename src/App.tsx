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
  Save,
  BarChart3,
  FolderArchive,
  Landmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithCredential
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import imageCompression from 'browser-image-compression';
import * as XLSX from 'xlsx';
import { handleFirestoreError, OperationType, auth } from './lib/firebase';
import { supabase, setCustomUserId } from './services/supabaseClient';
import { extractFromInvoice } from './services/mistral';
import { parseInvoiceXml } from './lib/xmlParser';
import { generateDocxBlob, extractTags } from './lib/docxGenerator';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { smartConvertAddress } from './lib/addressConverter';
import { cn, formatVNNumber, mapInvoiceToSupabase, getTemplateBuffer, executeSecureExport } from './lib/utils';
import { useToast } from './components/Notifications';
import { loadTemplates, saveTemplate, deleteStoredTemplate, StoredTemplate } from './lib/storage';
import { AIChatBox } from './components/AIChatBox';
import { InvoiceItemComp } from './components/Invoice/InvoiceItemComp';
import { InvoiceResponsiveCard } from './components/Invoice/InvoiceResponsiveCard';
import { InvoiceItem as MappedInvoiceItem } from './types/invoiceData';
import { DashboardInvoiceList } from './components/Dashboard/DashboardInvoiceList';
import { ExtendedInvoiceItem } from './components/Dashboard/demoData';
import { SystemMonitorView } from './components/SystemMonitorView';
import { ContractUploadView } from './components/Contract/ContractUploadView';
import { extractFromContract, convertContractDataToFormData } from './services/contractMistral';
import { AgentHubView } from './components/AgentHub/AgentHubView';
import { DossierView } from './components/DocumentManagement';
import { TaxLookupView } from './components/TaxLookup/TaxLookupView';
import TransactionsView from './components/Transactions/TransactionsView';


// Safe check for iframe/wallpaper environment that won't throw cross-origin errors
const isIframeMode = () => {
  try {
    return window.self !== window.top || 
           window.location.search.includes('wallpaper=true') ||
           window.location.search.includes('we=true') ||
           (window as any).wallpaperRequestResources !== undefined ||
           (window as any).wallpaperRegisterAudioListener !== undefined ||
           (window as any).wallpaperPropertyListener !== undefined ||
           (navigator.userAgent && navigator.userAgent.includes('WallpaperEngine'));
  } catch (e) {
    return true; // Cross-origin SecurityError means we are definitely inside an iframe
  }
};

// --- Types & Component Imports ---
import { Tab, Partner, Invoice, GeneratedDoc, SmartContract } from './types/appTypes';
import { Sidebar } from './components/Sidebar';
import { ReviewModal, getEnrichedInvoice, parseInvoiceDate, formatDisplayDate } from './components/Invoice/ReviewModal';
import { UploadView } from './components/Invoice/UploadView';
import { ContractManagementView } from './components/Contract/ContractManagementView';
import { ContractView, fetchTemplateBuffer, generateDocxBlobForContract, blobToBase64, getFriendlyLabel } from './components/Contract/ContractView';
import { PartnersView } from './components/Partners/PartnersView';
import { DocsView } from './components/Docs/DocsView';
import { BulkExportModal } from './components/Docs/BulkExportModal';
import { DashboardView } from './components/Dashboard/DashboardView';
// --- Components ---

import {
  formatThousands,
  numberToVietnameseWords
} from './lib/contractUtils';

// --- Constants ---

// --- Helpers ---
const TAB_CONFIG: Record<Tab, { path: string, label: string }> = {
  dashboard: { path: 'tong-quan', label: 'Bảng điều khiển' },
  upload: { path: 'tai-len', label: 'Tải lên hóa đơn' },
  partners: { path: 'doi-tac', label: 'Đối tác & Khách hàng' },
  docs: { path: 'tai-lieu-da-tao', label: 'Tài liệu đã tạo' },
  contract: { path: 'tao-hop-dong', label: 'Tạo hợp đồng' },
  contract_upload: { path: 'tai-len-hop-dong', label: 'Tải lên hợp đồng' },
  system: { path: 'theo-doi-he-thong', label: 'Theo dõi hệ thống' },
  'agent-hub': { path: 'agent-hub', label: 'Cấu hình Agent Hub' },
  dossier: { path: 'ho-so', label: 'Hồ sơ' },
  'tax-lookup': { path: 'tra-cuu-thue', label: 'Tra cứu thuế' },
  'transactions': { path: 'giao-dich', label: 'Giao dịch ngân hàng' }
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

  // ─── AGENT HUB HEARTBEAT EFFECT ───
  useEffect(() => {
    let intervalId: any = null;
    
    const sendHeartbeat = async () => {
      let hubUrl = 'http://localhost:56789';
      let securityToken = 'CHANGE-THIS-TO-SECURE-TOKEN';
      
      try {
        const stored = localStorage.getItem('agenthub_config');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.hubUrl) hubUrl = parsed.hubUrl;
          if (parsed.securityToken) securityToken = parsed.securityToken;
        }
      } catch (e) {}

      // Neu la localhost ma chua co token thi thu tai tu dong
      const isLocalhost = hubUrl.includes('localhost') || hubUrl.includes('127.0.0.1');
      if (isLocalhost && (!securityToken || securityToken === 'CHANGE-THIS-TO-SECURE-TOKEN')) {
        try {
          const tokenUrl = `${hubUrl.replace(/\/$/, '')}/api/status/token`;
          const tokenRes = await fetch(tokenUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(2000)
          });
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            if (tokenData.token) {
              securityToken = tokenData.token;
              localStorage.setItem('agenthub_config', JSON.stringify({ hubUrl, securityToken }));
            }
          }
        } catch (e) {}
      }

      try {
        const heartbeatUrl = `${hubUrl.replace(/\/$/, '')}/api/status/heartbeat`;
        await fetch(heartbeatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Agent-Token': securityToken
          },
          body: JSON.stringify({ client: 'Web App' }),
          signal: AbortSignal.timeout(3000)
        });
      } catch (error) {
        // Silent catch
      }
    };

    sendHeartbeat();
    intervalId = setInterval(sendHeartbeat, 5000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Trang thai tien trinh OCR hop dong - dung de hien thi o footer
  const [ocrProgress, setOcrProgress] = useState<{
    message: string; percent: number; stage: number; totalStages: number;
    status: 'running' | 'error' | 'done'; fileSizeMb?: number;
  } | null>(null);

  // Cac state moi de quan ly hang doi va tu dong luu OCR hop dong
  const [ocrQueue, setOcrQueue] = useState<{
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'completed' | 'error';
    error?: string;
    result?: any;
  }[]>([]);
  const [currentOcrIndex, setCurrentOcrIndex] = useState<number>(-1);
  const [isCooldown, setIsCooldown] = useState<boolean>(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [showOcrBatchCompleteModal, setShowOcrBatchCompleteModal] = useState<boolean>(false);
  const [batchOcrCount, setBatchOcrCount] = useState<number>(0);
  const [newlyOcrContractIds, setNewlyOcrContractIds] = useState<string[]>([]);

  // Logic theo doi OCR hop dong tu dong
  useEffect(() => {
    if (currentOcrIndex !== -1 && currentOcrIndex < ocrQueue.length) {
      const item = ocrQueue[currentOcrIndex];
      
      // Neu dang cooldown thi khong chay file tiep theo
      if (isCooldown) return;
 
      if (item.status === 'pending') {
        setOcrQueue(prev => prev.map((q, i) => i === currentOcrIndex ? { ...q, status: 'processing' } : q));
        
        (async () => {
          try {
            setOcrProgress({ 
              message: `Đang tải tệp: ${item.file.name}`, 
              percent: 10, 
              stage: currentOcrIndex + 1, 
              totalStages: ocrQueue.length, 
              status: 'running' 
            });
            
            // Su dung extractFromContract thuc te de lay du lieu tu contractMistral
            const result = await extractFromContract(item.file, (progress) => {
              setOcrProgress(prev => prev ? { 
                ...prev, 
                message: `${progress}: ${item.file.name}`, 
                percent: Math.min(80, prev.percent + 5) 
              } : null);
            });

            // Giai doan: Tu dong luu ket qua OCR
            setOcrProgress({ 
              message: `Đang tự động lưu hợp đồng: ${item.file.name}`, 
              percent: 90, 
              stage: currentOcrIndex + 1, 
              totalStages: ocrQueue.length, 
              status: 'running' 
            });

            const converted = convertContractDataToFormData(result);
            await autoSaveContractOCR({
              fileName: item.file.name,
              formData: converted,
              extractedData: result,
              file: item.file
            });
            
            setOcrProgress({ 
              message: `Hoàn tất: ${item.file.name}`, 
              percent: 100, 
              stage: currentOcrIndex + 1, 
              totalStages: ocrQueue.length, 
              status: 'done' 
            });

            setOcrQueue(prev => prev.map((q, i) => i === currentOcrIndex ? { ...q, status: 'completed', result } : q));
            
            if (currentOcrIndex === ocrQueue.length - 1) {
              // Hoan thanh tat ca
              setCurrentOcrIndex(-1);
              setShowOcrBatchCompleteModal(true);
            } else {
              // Con file tiep theo, kich hoat cooldown 60 giay
              setIsCooldown(true);
              setCooldownRemaining(60);
            }
          } catch (err: any) {
            console.error(`Lỗi OCR file ${item.file.name}:`, err);
            setOcrProgress({ 
              message: `Lỗi file ${item.file.name}: ${err.message}`, 
              percent: 100, 
              stage: currentOcrIndex + 1, 
              totalStages: ocrQueue.length, 
              status: 'error' 
            });
            setOcrQueue(prev => prev.map((q, i) => i === currentOcrIndex ? { ...q, status: 'error', error: err.message } : q));

            if (currentOcrIndex === ocrQueue.length - 1) {
              setCurrentOcrIndex(-1);
              setShowOcrBatchCompleteModal(true);
            } else {
              setIsCooldown(true);
              setCooldownRemaining(60);
            }
          }
        })();
      }
    }
  }, [currentOcrIndex, ocrQueue, isCooldown]);

  // Logic dem nguoc cooldown 60 giay giua cac file
  useEffect(() => {
    let timer: any = null;
    if (isCooldown && cooldownRemaining > 0) {
      setOcrProgress({
        message: `Chờ 60s giãn cách API để bảo vệ tài nguyên (còn ${cooldownRemaining}s)...`,
        percent: Math.round(((60 - cooldownRemaining) / 60) * 100),
        stage: currentOcrIndex + 1,
        totalStages: ocrQueue.length,
        status: 'running'
      });

      timer = setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsCooldown(false);
            setCurrentOcrIndex(curr => curr + 1);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCooldown, cooldownRemaining]);

  // Synchronize mouse wheel scrolling in iframe mode OR standalone Wallpaper Engine mode
  useEffect(() => {
    if (!isIframeMode()) return;
    
    let lastMouseTarget: HTMLElement | null = null;
    let lastNativeTarget: HTMLElement | null = null;
    
    const handleMouseMove = (e: MouseEvent) => {
      lastMouseTarget = e.target as HTMLElement;
    };
    
    const findScrollableParent = (el: HTMLElement | null): HTMLElement | null => {
      while (el && el !== document.body && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const isScrollable = el.scrollHeight > el.clientHeight && 
                            (style.overflowY === 'auto' || style.overflowY === 'scroll');
        if (isScrollable) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };

    const scrollVisibleContainers = (dy: number) => {
      const scrollables = document.querySelectorAll('.overflow-y-auto, .custom-scrollbar, [style*="overflow-y: auto"], [style*="overflow-y: scroll"]');
      scrollables.forEach((el: any) => {
        if (el.scrollHeight > el.clientHeight) {
          try {
            el.scrollBy({ top: dy, behavior: 'auto' });
          } catch (err) {}
        }
      });
    };

    // Global focus & interaction notifier to notify parent dashboard to focus this iframe
    const notifyParentInteraction = () => {
      try {
        window.parent.postMessage({ type: 'IFRAME_CLICKED' }, '*');
      } catch (err) {}
    };

    let lastScrollTime = 0;
    const executeScroll = (dy: number, targetEl: HTMLElement | null) => {
      const now = Date.now();
      if (now - lastScrollTime < 20) return; // Prevent duplicate scroll triggering
      lastScrollTime = now;

      const scrollable = findScrollableParent(targetEl);
      if (scrollable) {
        scrollable.scrollBy({ top: dy, behavior: 'auto' });
      } else {
        scrollVisibleContainers(dy);
      }
    };
    
    // 1. Listen to forwarded scroll events from parent dashboard (when inside iframe)
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'WHEEL_SCROLL') {
        let dy = e.data.deltaY;
        // Amplify small scroll steps from CEF
        if (Math.abs(dy) < 40) {
          dy = Math.sign(dy) * 60;
        } else {
          dy = dy * 1.5;
        }
        executeScroll(dy, lastMouseTarget);
      }
    };
    
    // 2. Listen to native wheel events directly
    const handleNativeWheel = (e: WheelEvent) => {
      notifyParentInteraction();
      let dy = e.deltaY;
      // Amplify scroll steps
      if (Math.abs(dy) < 40) {
        dy = Math.sign(dy) * 60;
      } else {
        dy = dy * 1.5;
      }

      const target = e.target as HTMLElement;
      lastNativeTarget = target;
      executeScroll(dy, target);
    };

    const handleGlobalMouseDown = (e: MouseEvent) => {
      notifyParentInteraction();
      // Force element focus inside CEF
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.hasAttribute('contenteditable'))) {
        target.focus();
      }
    };

    const handleMouseEnter = () => {
      notifyParentInteraction();
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('message', handleMessage);
    window.addEventListener('wheel', handleNativeWheel, { passive: true });
    document.addEventListener('wheel', handleNativeWheel, { passive: true });
    
    // Lightweight global focus listeners
    window.addEventListener('mousedown', handleGlobalMouseDown, true);
    document.addEventListener('mousedown', handleGlobalMouseDown, true);
    document.addEventListener('mouseenter', handleMouseEnter);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('wheel', handleNativeWheel);
      document.removeEventListener('wheel', handleNativeWheel);
      window.removeEventListener('mousedown', handleGlobalMouseDown, true);
      document.removeEventListener('mousedown', handleGlobalMouseDown, true);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  // Global key event propagation block fixer for inputs under CEF inside Wallpaper Engine
  useEffect(() => {
    if (!isIframeMode()) return;

    const stopWeBlock = (e: Event) => {
      e.stopPropagation();
    };

    const applyInputFixer = () => {
      const elements = document.querySelectorAll('input, textarea, [contenteditable]');
      elements.forEach((el: any) => {
        if (el.dataset.weFocusFixed === 'true') return;
        el.dataset.weFocusFixed = 'true';

        el.addEventListener('keydown', stopWeBlock);
        el.addEventListener('keyup', stopWeBlock);
        el.addEventListener('keypress', stopWeBlock);
        el.style.pointerEvents = 'auto';
        el.style.userSelect = 'text';
        
        el.addEventListener('mousedown', (e: MouseEvent) => {
          el.focus();
          try {
            window.parent.postMessage({ type: 'IFRAME_CLICKED' }, '*');
          } catch (err) {}
        });
      });
    };

    applyInputFixer();

    const observer = new MutationObserver(() => {
      applyInputFixer();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as any;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.hasAttribute('contenteditable'))) {
        if (target.dataset.weFocusFixed !== 'true') {
          target.dataset.weFocusFixed = 'true';
          target.addEventListener('keydown', stopWeBlock);
          target.addEventListener('keyup', stopWeBlock);
          target.addEventListener('keypress', stopWeBlock);
          target.style.pointerEvents = 'auto';
          target.style.userSelect = 'text';
        }
        try {
          window.parent.postMessage({ type: 'IFRAME_CLICKED' }, '*');
        } catch (err) {}
      }
    };
    
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      observer.disconnect();
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);
  const [dashboardSubTab, setDashboardSubTab] = useState<'invoices'>('invoices');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([]);
  const [contracts, setContracts] = useState<SmartContract[]>([]);
  const [editingContractOcr, setEditingContractOcr] = useState<SmartContract | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerFormValues, setPartnerFormValues] = useState({
    name: '',
    taxCode: '',
    address: '',
    addressPostMerger: '',
    accountNumber: '',
    bankName: '',
    representative: '',
    position: 'Giám đốc',
    gender: 'Ông'
  });
  const [isSearchingTaxCode, setIsSearchingTaxCode] = useState(false);

  const partnerAddressRef = useRef<HTMLTextAreaElement>(null);
  const partnerAddressPostMergerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = partnerAddressRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [partnerFormValues.address, editingPartner]);

  useEffect(() => {
    const el = partnerAddressPostMergerRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [partnerFormValues.addressPostMerger, editingPartner]);

  const handleFetchTaxInfoInForm = async () => {
    const query = partnerFormValues.taxCode.trim().replace(/[^0-9\-]/g, '');
    if (!query) {
      toast("Vui lòng nhập mã số thuế hợp lệ", "error");
      return;
    }

    setIsSearchingTaxCode(true);
    try {
      const res = await fetch(`https://api.vietqr.io/v2/business/${query}`, {
        headers: { Accept: 'application/json' }
      });

      if (!res.ok) {
        throw new Error(`Lỗi kết nối: HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.code === '00' && json.data) {
        const busData = json.data;
        const convertResult = smartConvertAddress(busData.address);
        
        setPartnerFormValues(prev => ({
          ...prev,
          name: busData.name || '',
          address: busData.address || '',
          addressPostMerger: convertResult.isConverted ? convertResult.fullAddress : (convertResult.oldFullAddress || busData.address || '')
        }));
        
        toast("Tự động điền thông tin doanh nghiệp thành công!", "success");
      } else {
        toast("Không tìm thấy thông tin cho mã số thuế này", "info");
      }
    } catch (err: any) {
      toast(`Lỗi tra cứu: ${err.message || 'Không kết nối được'}`, "error");
    } finally {
      setIsSearchingTaxCode(false);
    }
  };

  useEffect(() => {
    if (editingPartner) {
      setPartnerFormValues({
        name: editingPartner.name || '',
        taxCode: editingPartner.taxCode || '',
        address: editingPartner.address || '',
        addressPostMerger: editingPartner.addressPostMerger || '',
        accountNumber: editingPartner.accountNumber || '',
        bankName: editingPartner.bankName || '',
        representative: editingPartner.representative || '',
        position: editingPartner.position || 'Giám đốc',
        gender: editingPartner.gender || 'Ông'
      });
    }
  }, [editingPartner]);
  const [multiPartnerEdit, setMultiPartnerEdit] = useState<{
    isOpen: boolean;
    currentIndex: number;
    drafts: Record<string, Partial<Partner>>;
    showExitConfirm: boolean;
  } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const handleLogin = async () => {
    if (isIframeMode()) {
      const defaultUser = {
        uid: "u0weCnnlzSNJvbWrsAJe4U1cqzm1",
        email: "huynhbao.desktop@gmail.com",
        displayName: "Huỳnh Bảo Desktop",
        photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Bao"
      };
      setUser(defaultUser as any);
      try {
        setCustomUserId(defaultUser.uid);
      } catch (e) {
        console.error("Failed to set user header:", e);
      }
      setIsLoadingInvoices(true);
      Promise.all([
        fetchPartners(defaultUser.uid),
        fetchInvoices(defaultUser.uid),
        fetchGeneratedDocs(defaultUser.uid),
        fetchContracts(defaultUser.uid),
        fetchVatConfig(defaultUser.uid)
      ]).then(() => {
        setIsLoadingInvoices(false);
      }).catch(err => {
        console.error("Failed to fetch data offline:", err);
        setIsLoadingInvoices(false);
      });
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      console.log("[DEBUG] Attempting Google Sign-In with Popup...");
      await signInWithPopup(auth, provider);
      console.log("[DEBUG] Google Popup Sign-In successful!");
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        console.warn("[DEBUG] Popup blocked or cancelled. Falling back to Redirect...");
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectErr: any) {
          console.error("[DEBUG] Google Redirect Sign-In error:", redirectErr);
          toast(`Lỗi đăng nhập: ${redirectErr.message}`, "error");
        }
      } else {
        console.error("[DEBUG] Google Popup Sign-In error:", error);
        toast(`Lỗi đăng nhập: ${error.message}`, "error");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

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

  // VAT keyword configuration states
  const [vatConfig, setVatConfig] = useState<{ keyword: string; rate: number }[]>(() => {
    const saved = localStorage.getItem('vat_keyword_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { keyword: 'cát', rate: 10 },
      { keyword: 'đá', rate: 10 },
      { keyword: 'bê tông', rate: 8 },
      { keyword: 'xe', rate: 8 },
      { keyword: 'máy', rate: 8 }
    ];
  });
  const [isVatConfigOpen, setIsVatConfigOpen] = useState(false);
  const [localVatConfig, setLocalVatConfig] = useState<{ keyword: string; rate: number }[]>([]);

  useEffect(() => {
    if (isVatConfigOpen) {
      setLocalVatConfig([...vatConfig]);
    }
  }, [isVatConfigOpen, vatConfig]);

  const handleLocalVatConfigChange = (idx: number, field: 'keyword' | 'rate', value: any) => {
    const next = [...localVatConfig];
    next[idx] = { ...next[idx], [field]: value };
    setLocalVatConfig(next);
  };

  const handleAddLocalVatConfig = () => {
    setLocalVatConfig([...localVatConfig, { keyword: '', rate: 8 }]);
  };

  const handleRemoveLocalVatConfig = (idx: number) => {
    setLocalVatConfig(localVatConfig.filter((_, i) => i !== idx));
  };

  const handleSaveVatConfig = async () => {
    const cleaned = localVatConfig.filter(c => c.keyword.trim() !== '');
    setVatConfig(cleaned);
    localStorage.setItem('vat_keyword_config', JSON.stringify(cleaned));
    setIsVatConfigOpen(false);

    if (user) {
      try {
        const { data, error } = await supabase
          .from('contracts')
          .select('id')
          .eq('owner_id', user.uid)
          .eq('template_id', 'SYSTEM_VAT_CONFIG')
          .eq('file_name', '__VAT_CONFIG__')
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const { error: updateError } = await supabase
            .from('contracts')
            .update({
              form_data: { config: cleaned },
              updated_at: new Date().toISOString()
            })
            .eq('id', data.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('contracts')
            .insert({
              template_id: 'SYSTEM_VAT_CONFIG',
              file_name: '__VAT_CONFIG__',
              form_data: { config: cleaned },
              owner_id: user.uid
            });
          if (insertError) throw insertError;
        }
        toast("Đã lưu cấu hình thuế VAT vào cơ sở dữ liệu!", "success");
      } catch (dbErr: any) {
        console.error("Lỗi khi lưu cấu hình VAT vào DB:", dbErr.message);
        toast(`Đã lưu cục bộ nhưng lỗi lưu vào DB: ${dbErr.message}`, "error");
      }
    } else {
      toast("Đã lưu cấu hình thuế VAT cục bộ!", "success");
    }
  };

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

  // Contract OCR / Document Upload States
  const [showContractUpload, setShowContractUpload] = useState(false);
  const [contractUploadMode, setContractUploadMode] = useState<'ocr' | 'editor'>('editor');

  // ── Phân loại hợp đồng bằng JS fallback ──────────────────────────────────
  const classifyContractType = (fileName: string, formData: any): string => {
    // Ưu tiên templateId từ Mistral AI
    if (formData?.templateId && ['HDCM', 'HDTC', 'HDNT'].includes(formData.templateId)) {
      return formData.templateId;
    }
    const text = [
      fileName || '',
      formData?.workDescription || '',
      formData?.projectName || '',
      formData?.partyA?.name || '',
      JSON.stringify(formData?.items || [])
    ].join(' ').toLowerCase();

    if (/ca máy|xe cuốc|xe lu|xe tải|máy đào|xe đào|máy ủi|thiết bị thi công/.test(text)) return 'HDCM';
    if (/thi công|xây dựng|xây lắp|sửa chữa công trình|hoàn thiện|lắp đặt/.test(text)) return 'HDTC';
    return 'HDNT';
  };

  // Helper dinh dang date sang YYYY-MM-DD hop le cho database DATE column
  const formatDbDate = (dateStr: any): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    let str = String(dateStr).trim();
    if (str.includes('T')) {
      str = str.split('T')[0].trim();
    }
    if (!str) return new Date().toISOString().split('T')[0];
    
    // Neu dung dinh dang YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    
    // Neu dung dinh dang DD/MM/YYYY hoac DD-MM-YYYY
    const match = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (match) {
      const [_, day, month, year] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return new Date().toISOString().split('T')[0];
  };

  // ── Tự động lưu hợp đồng chạy ngầm vào Supabase ─────────────────────────
  const autoSaveContractOCR = async (uploadData: { fileName: string; formData: any; extractedData: any; file: File }) => {
    if (!user) return null;
    try {
      const templateId = classifyContractType(uploadData.fileName || '', uploadData.formData);

      let invoicesList = '[]';
      if (Array.isArray(uploadData.formData?.items) && uploadData.formData.items.length > 0) {
        const mapped = uploadData.formData.items.map((item: any, i: number) => {
          const getVal = (keywords: string[]) => {
            for (const kw of keywords) {
              const k = Object.keys(item).find(x => x.toLowerCase().includes(kw));
              if (k && item[k] !== undefined && item[k] !== '') return item[k];
            }
            return '';
          };
          const dongia = parseFloat(String(getVal(['đơn giá', 'don gia', 'gia'])).replace(/[^0-9.]/g, '')) || 0;
          const soluong = parseFloat(String(getVal(['số lượng', 'so luong', 'khối lượng', 'kl', 'sl'])).replace(/[^0-9.]/g, '')) || 1;
          const amount = parseFloat(String(getVal(['thành tiền', 'thanh tien', 'tổng', 'tong'])).replace(/[^0-9.]/g, '')) || Math.round(dongia * soluong);
          return {
            id: `ocr_${i}_${Math.random().toString(36).slice(2, 7)}`,
            noidung: getVal(['nội dung', 'noi dung', 'tên thiết bị', 'ten thiet bi', 'mô tả', 'mo ta']) || `Hạng mục ${i + 1}`,
            donvi: getVal(['đvt', 'đơn vị', 'don vi']),
            soluong: String(soluong),
            dongia: String(dongia),
            amount
          };
        });
        invoicesList = JSON.stringify(mapped);
      }

      const finalFormData = {
        ...uploadData.formData,
        _invoicesList: invoicesList
      };

      const contractNumber = uploadData.formData.contractNumber || '';
      const contractDate = formatDbDate(uploadData.formData.contractDate);
      const partyATaxCode = uploadData.formData.partyA?.taxCode || '';
      const partyBTaxCode = uploadData.formData.partyB?.taxCode || '';
      const partyAAddress = uploadData.formData.partyA?.address || '';
      const partyBAddress = uploadData.formData.partyB?.address || '';
      const partyARepresentative = uploadData.formData.partyA?.representative || '';
      const partyBRepresentative = uploadData.formData.partyB?.representative || '';
      const projectName = uploadData.formData.projectName || '';
      const contractType = 'ocr_pdf';

      const { data: insertedRows, error } = await supabase.from('contracts').insert({
        template_id: templateId,
        form_data: finalFormData,
        file_name: uploadData.fileName,
        owner_id: user.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contract_number: contractNumber,
        contract_date: contractDate,
        party_a_tax_code: partyATaxCode,
        party_b_tax_code: partyBTaxCode,
        party_a_address: partyAAddress,
        party_b_address: partyBAddress,
        party_a_representative: partyARepresentative,
        party_b_representative: partyBRepresentative,
        project_name: projectName,
        contract_type: contractType
      }).select('id').single();

      if (error) throw error;

      const contractRowId: string = insertedRows?.id || '';
      if (contractRowId) {
        setNewlyOcrContractIds(prev => [...prev, contractRowId]);
      }

      if (contractRowId && Array.isArray(uploadData.formData.items) && uploadData.formData.items.length > 0) {
        const itemsToInsert = uploadData.formData.items.map((item: any) => {
          const getVal = (keywords: string[]) => {
            for (const kw of keywords) {
              const k = Object.keys(item).find(x => x.toLowerCase().includes(kw));
              if (k && item[k] !== undefined && item[k] !== '') return item[k];
            }
            return '';
          };
          const stt = getVal(['stt', 'số thứ tự']);
          const itemCode = getVal(['mã', 'mã hiệu', 'ma hieu', 'ma']);
          const itemName = getVal(['tên', 'tên công việc', 'nội dung', 'thiết bị', 'mặt hàng']);
          const unit = getVal(['đơn vị', 'đvt', 'đơn vị tính']);
          
          const qtyStr = String(getVal(['số lượng', 'so luong', 'khối lượng', 'kl', 'sl'])).replace(/[^0-9.]/g, '');
          const quantity = parseFloat(qtyStr) || null;
          
          const priceStr = String(getVal(['đơn giá', 'don gia', 'giá'])).replace(/[^0-9.]/g, '');
          const unitPrice = parseFloat(priceStr) || null;
          
          const amtStr = String(getVal(['thành tiền', 'thanh tien', 'tổng'])).replace(/[^0-9.]/g, '');
          const amount = parseFloat(amtStr) || null;

          return {
            contract_id: contractRowId,
            stt: stt ? String(stt) : null,
            item_code: itemCode ? String(itemCode) : null,
            item_name: itemName ? String(itemName) : null,
            unit: unit ? String(unit) : null,
            quantity: quantity,
            unit_price: unitPrice,
            amount: amount,
            raw_data: item,
            owner_id: user.uid,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });

        const { error: itemsErr } = await supabase.from('contract_items').insert(itemsToInsert);
        if (itemsErr) console.error("Lỗi lưu contract_items ngầm:", itemsErr.message);
      }

      toast(`Lưu ngầm thành công hợp đồng: ${uploadData.fileName}`, 'success');
      await fetchContracts(user.uid);

      const pdfFile: File | null = uploadData.file || null;
      if (pdfFile && contractRowId) {
        (async () => {
          try {
            const gasUrl = (import.meta as any).env.VITE_GAS_WEB_APP_URL;
            if (!gasUrl) return;

            const base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string).split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(pdfFile);
            });

            const gasRes = await fetch(gasUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify({
                action: 'save_contract_pdf',
                base64Data,
                fileName: pdfFile.name,
                contractFolder: 'Hợp đồng trích xuất AI',
                parentFolderName: 'Hệ Thống Quản Lý Hóa Đơn'
              })
            });

            if (gasRes.ok) {
              const gasJson = await gasRes.json();
              if (gasJson.success) {
                const updatedFormData = {
                  ...finalFormData,
                  _pdfUrl: gasJson.driveUrl,
                  _pdfFileId: gasJson.fileId
                };
                await supabase.from('contracts')
                  .update({ 
                    form_data: updatedFormData, 
                    pdf_url: gasJson.driveUrl,
                    updated_at: new Date().toISOString() 
                  })
                  .eq('id', contractRowId);
                await fetchContracts(user.uid);
              }
            }
          } catch (e: any) {
            console.error('Lỗi upload PDF Drive ngầm:', e);
          }
        })();
      }
      return contractRowId;
    } catch (err: any) {
      console.error('Lỗi khi tự động lưu hợp đồng:', err.message);
      return null;
    }
  };

  // ── Lưu hợp đồng từ luồng OCR Upload ────────────────────────────────────
  const handleContractUploadSave = async (uploadData: any) => {
    if (!user) return;
    try {
      const templateId = classifyContractType(uploadData.fileName || '', uploadData.formData);

      // Map items OCR → _invoicesList cho modal Tài chính
      let invoicesList = '[]';
      if (Array.isArray(uploadData.formData?.items) && uploadData.formData.items.length > 0) {
        const mapped = uploadData.formData.items.map((item: any, i: number) => {
          const getVal = (keywords: string[]) => {
            for (const kw of keywords) {
              const k = Object.keys(item).find(x => x.toLowerCase().includes(kw));
              if (k && item[k] !== undefined && item[k] !== '') return item[k];
            }
            return '';
          };
          const dongia = parseFloat(String(getVal(['đơn giá', 'don gia', 'gia'])).replace(/[^0-9.]/g, '')) || 0;
          const soluong = parseFloat(String(getVal(['số lượng', 'so luong', 'khối lượng', 'kl', 'sl'])).replace(/[^0-9.]/g, '')) || 1;
          const amount = parseFloat(String(getVal(['thành tiền', 'thanh tien', 'tổng', 'tong'])).replace(/[^0-9.]/g, '')) || Math.round(dongia * soluong);
          return {
            id: `ocr_${i}_${Math.random().toString(36).slice(2, 7)}`,
            noidung: getVal(['nội dung', 'noi dung', 'tên thiết bị', 'ten thiet bi', 'mô tả', 'mo ta']) || `Hạng mục ${i + 1}`,
            donvi: getVal(['đvt', 'đơn vị', 'don vi']),
            soluong: String(soluong),
            dongia: String(dongia),
            amount
          };
        });
        invoicesList = JSON.stringify(mapped);
      }

      const finalFormData = {
        ...uploadData.formData,
        _invoicesList: invoicesList
      };

      const contractNumber = uploadData.formData.contractNumber || '';
      const contractDate = formatDbDate(uploadData.formData.contractDate);
      const partyATaxCode = uploadData.formData.partyA?.taxCode || '';
      const partyBTaxCode = uploadData.formData.partyB?.taxCode || '';
      const partyAAddress = uploadData.formData.partyA?.address || '';
      const partyBAddress = uploadData.formData.partyB?.address || '';
      const partyARepresentative = uploadData.formData.partyA?.representative || '';
      const partyBRepresentative = uploadData.formData.partyB?.representative || '';
      const projectName = uploadData.formData.projectName || '';
      const contractType = 'ocr_pdf';
      const documentType = uploadData.documentType || null;

      // Yêu cầu 1: Lưu vào bảng chính contracts với các cột đơn lẻ và loại hợp đồng
      const { data: insertedRows, error } = await supabase.from('contracts').insert({
        template_id: templateId,
        form_data: finalFormData,
        file_name: uploadData.fileName,
        owner_id: user.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contract_number: contractNumber,
        contract_date: contractDate,
        party_a_tax_code: partyATaxCode,
        party_b_tax_code: partyBTaxCode,
        party_a_address: partyAAddress,
        party_b_address: partyBAddress,
        party_a_representative: partyARepresentative,
        party_b_representative: partyBRepresentative,
        project_name: projectName,
        contract_type: contractType,
        document_type: documentType
      }).select('id').single();
      if (error) throw error;

      const contractRowId: string = insertedRows?.id || '';
      if (contractRowId) {
        setNewlyOcrContractIds(prev => [...prev, contractRowId]);
      }

      // ── Tạo bản ghi Văn bản nếu có phân loại ───────────────────────────────
      if (contractRowId && documentType) {
        try {
          if (documentType === 'incoming' && uploadData.incomingDocFields) {
            const docFields = uploadData.incomingDocFields;
            await supabase.from('incoming_documents').insert({
              incoming_number: docFields.incomingNumber || contractNumber || uploadData.fileName,
              document_number: contractNumber,
              received_date: docFields.receivedDate || new Date().toISOString().split('T')[0],
              issue_date: docFields.issueDate || null,
              sender: docFields.sender || uploadData.formData.partyA?.name || '',
              signer: docFields.signer || partyARepresentative || null,
              summary: docFields.summary || projectName || null,
              field: docFields.field || null,
              security_level: docFields.securityLevel || 'normal',
              urgency_level: docFields.urgencyLevel || 'normal',
              note: docFields.note || null,
              owner_id: user.uid,
              contract_id: contractRowId
            });
            console.log('[CONTRACT→INCOMING] Đã tạo văn bản đến từ hợp đồng');
          } else if (documentType === 'outgoing' && uploadData.outgoingDocFields) {
            const docFields = uploadData.outgoingDocFields;
            await supabase.from('outgoing_documents').insert({
              outgoing_number: docFields.outgoingNumber || contractNumber || uploadData.fileName,
              document_number: contractNumber,
              issue_date: docFields.issueDate || new Date().toISOString().split('T')[0],
              receiver: docFields.receiver || uploadData.formData.partyB?.name || '',
              signer: docFields.signer || partyARepresentative || null,
              summary: docFields.summary || projectName || null,
              field: docFields.field || null,
              security_level: docFields.securityLevel || 'normal',
              urgency_level: docFields.urgencyLevel || 'normal',
              note: docFields.note || null,
              owner_id: user.uid,
              contract_id: contractRowId
            });
            console.log('[CONTRACT→OUTGOING] Đã tạo văn bản đi từ hợp đồng');
          }
        } catch (docErr: any) {
          console.error('[CONTRACT→DOC] Lỗi tạo document:', docErr.message);
        }
      }

      // Yêu cầu 1: Lưu vào bảng phụ contract_items (One-to-Many)
      if (contractRowId && Array.isArray(uploadData.formData.items) && uploadData.formData.items.length > 0) {
        const itemsToInsert = uploadData.formData.items.map((item: any) => {
          const getVal = (keywords: string[]) => {
            for (const kw of keywords) {
              const k = Object.keys(item).find(x => x.toLowerCase().includes(kw));
              if (k && item[k] !== undefined && item[k] !== '') return item[k];
            }
            return '';
          };
          const stt = getVal(['stt', 'số thứ tự']);
          const itemCode = getVal(['mã', 'mã hiệu', 'ma hieu', 'ma']);
          const itemName = getVal(['tên', 'tên công việc', 'nội dung', 'thiết bị', 'mặt hàng']);
          const unit = getVal(['đơn vị', 'đvt', 'đơn vị tính']);
          
          const qtyStr = String(getVal(['số lượng', 'so luong', 'khối lượng', 'kl', 'sl'])).replace(/[^0-9.]/g, '');
          const quantity = parseFloat(qtyStr) || null;
          
          const priceStr = String(getVal(['đơn giá', 'don gia', 'giá'])).replace(/[^0-9.]/g, '');
          const unitPrice = parseFloat(priceStr) || null;
          
          const amtStr = String(getVal(['thành tiền', 'thanh tien', 'tổng'])).replace(/[^0-9.]/g, '');
          const amount = parseFloat(amtStr) || null;

          return {
            contract_id: contractRowId,
            stt: stt ? String(stt) : null,
            item_code: itemCode ? String(itemCode) : null,
            item_name: itemName ? String(itemName) : null,
            unit: unit ? String(unit) : null,
            quantity: quantity,
            unit_price: unitPrice,
            amount: amount,
            raw_data: item,
            owner_id: user.uid,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });

        const { error: itemsErr } = await supabase.from('contract_items').insert(itemsToInsert);
        if (itemsErr) console.error("Lỗi lưu contract_items:", itemsErr.message);
      }

      if (uploadData.isSilent) {
        toast(`Lưu ngầm thành công hợp đồng: ${uploadData.fileName}`, 'success');
      } else {
        toast('Đã lưu hợp đồng từ OCR thành công!', 'success');
        setShowContractUpload(false);
      }
      fetchContracts(user.uid);

      // Upload PDF lên Drive subfolder (không block UI)
      const pdfFile: File | null = uploadData.file || null;
      if (pdfFile && contractRowId) {
        (async () => {
          try {
            const gasUrl = (import.meta as any).env.VITE_GAS_WEB_APP_URL;
            if (!gasUrl) return;

            toast('Đang tải PDF hợp đồng lên Google Drive...', 'success');
            const base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string).split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(pdfFile);
            });

            const gasRes = await fetch(gasUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify({
                action: 'save_contract_pdf',
                base64Data,
                fileName: pdfFile.name,
                contractFolder: 'Hợp đồng trích xuất AI',
                parentFolderName: 'Hệ Thống Quản Lý Hóa Đơn'
              })
            });

            if (gasRes.ok) {
              const gasJson = await gasRes.json();
              if (gasJson.success) {
                const updatedFormData = {
                  ...finalFormData,
                  _pdfUrl: gasJson.driveUrl,
                  _pdfFileId: gasJson.fileId
                };
                // Yêu cầu 1: Cập nhật đường dẫn liên kết tệp PDF gốc driveUrl vào cột pdf_url
                await supabase.from('contracts')
                  .update({ 
                    form_data: updatedFormData, 
                    pdf_url: gasJson.driveUrl,
                    updated_at: new Date().toISOString() 
                  })
                  .eq('id', contractRowId);
                fetchContracts(user.uid);
                toast('Tải PDF lên Google Drive thành công!', 'success');
              } else {
                toast('Lỗi tải PDF lên Drive: ' + (gasJson.error || 'Không rõ'), 'error');
              }
            }
          } catch (e: any) {
            console.error('Lỗi upload PDF Drive:', e);
          }
        })();
      }
    } catch (err: any) {
      toast('Lỗi khi lưu hợp đồng: ' + err.message, 'error');
    }
  };

  const handleUpdateContractOCR = async (id: string, updatedData: any) => {
    if (!user) return;
    try {
      const templateId = classifyContractType(updatedData.fileName || '', updatedData.formData);
      
      // Map items OCR → _invoicesList cho modal Tài chính
      let invoicesList = '[]';
      if (Array.isArray(updatedData.formData?.items) && updatedData.formData.items.length > 0) {
        const mapped = updatedData.formData.items.map((item: any, i: number) => {
          const getVal = (keywords: string[]) => {
            for (const kw of keywords) {
              const k = Object.keys(item).find(x => x.toLowerCase().includes(kw));
              if (k && item[k] !== undefined && item[k] !== '') return item[k];
            }
            return '';
          };
          const dongia = parseFloat(String(getVal(['đơn giá', 'don gia', 'gia'])).replace(/[^0-9.]/g, '')) || 0;
          const soluong = parseFloat(String(getVal(['số lượng', 'so luong', 'khối lượng', 'kl', 'sl'])).replace(/[^0-9.]/g, '')) || 1;
          const amount = parseFloat(String(getVal(['thành tiền', 'thanh tien', 'tổng', 'tong'])).replace(/[^0-9.]/g, '')) || Math.round(dongia * soluong);
          return {
            id: `ocr_${i}_${Math.random().toString(36).slice(2, 7)}`,
            noidung: getVal(['nội dung', 'noi dung', 'tên thiết bị', 'ten thiet bi', 'mô tả', 'mo ta']) || `Hạng mục ${i + 1}`,
            donvi: getVal(['đvt', 'đơn vị', 'don vi']),
            soluong: String(soluong),
            dongia: String(dongia),
            amount
          };
        });
        invoicesList = JSON.stringify(mapped);
      }

      const finalFormData = {
        ...updatedData.formData,
        _invoicesList: invoicesList
      };

      const contractNumber = updatedData.formData.contractNumber || '';
      const contractDate = formatDbDate(updatedData.formData.contractDate);
      const partyATaxCode = updatedData.formData.partyA?.taxCode || '';
      const partyBTaxCode = updatedData.formData.partyB?.taxCode || '';
      const partyAAddress = updatedData.formData.partyA?.address || '';
      const partyBAddress = updatedData.formData.partyB?.address || '';
      const partyARepresentative = updatedData.formData.partyA?.representative || '';
      const partyBRepresentative = updatedData.formData.partyB?.representative || '';
      const projectName = updatedData.formData.projectName || '';
      const pdfUrl = updatedData.formData._pdfUrl || '';

      // 1. Cập nhật bảng chính contracts
      const { error: mainErr } = await supabase.from('contracts').update({
        template_id: templateId,
        form_data: finalFormData,
        updated_at: new Date().toISOString(),
        contract_number: contractNumber,
        contract_date: contractDate,
        party_a_tax_code: partyATaxCode,
        party_b_tax_code: partyBTaxCode,
        party_a_address: partyAAddress,
        party_b_address: partyBAddress,
        party_a_representative: partyARepresentative,
        party_b_representative: partyBRepresentative,
        project_name: projectName,
        pdf_url: pdfUrl
      }).eq('id', id);
      
      if (mainErr) throw mainErr;

      // 2. Cập nhật bảng phụ contract_items: Xóa cũ và Thêm mới
      await supabase.from('contract_items').delete().eq('contract_id', id);
      
      if (Array.isArray(updatedData.formData.items) && updatedData.formData.items.length > 0) {
        const itemsToInsert = updatedData.formData.items.map((item: any) => {
          const getVal = (keywords: string[]) => {
            for (const kw of keywords) {
              const k = Object.keys(item).find(x => x.toLowerCase().includes(kw));
              if (k && item[k] !== undefined && item[k] !== '') return item[k];
            }
            return '';
          };
          const stt = getVal(['stt', 'số thứ tự']);
          const itemCode = getVal(['mã', 'mã hiệu', 'ma hieu', 'ma']);
          const itemName = getVal(['tên', 'tên công việc', 'nội dung', 'thiết bị', 'mặt hàng']);
          const unit = getVal(['đơn vị', 'đvt', 'đơn vị tính']);
          
          const qtyStr = String(getVal(['số lượng', 'so luong', 'khối lượng', 'kl', 'sl'])).replace(/[^0-9.]/g, '');
          const quantity = parseFloat(qtyStr) || null;
          
          const priceStr = String(getVal(['đơn giá', 'don gia', 'giá'])).replace(/[^0-9.]/g, '');
          const unitPrice = parseFloat(priceStr) || null;
          
          const amtStr = String(getVal(['thành tiền', 'thanh tien', 'tổng'])).replace(/[^0-9.]/g, '');
          const amount = parseFloat(amtStr) || null;

          return {
            contract_id: id,
            stt: stt ? String(stt) : null,
            item_code: itemCode ? String(itemCode) : null,
            item_name: itemName ? String(itemName) : null,
            unit: unit ? String(unit) : null,
            quantity: quantity,
            unit_price: unitPrice,
            amount: amount,
            raw_data: item,
            owner_id: user.uid,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });

        const { error: itemsErr } = await supabase.from('contract_items').insert(itemsToInsert);
        if (itemsErr) console.error("Lỗi cập nhật contract_items:", itemsErr.message);
      }

      toast("Đã cập nhật dữ liệu hợp đồng thành công!", "success");
      fetchContracts(user.uid);
      setEditingContractOcr(null); // Đóng modal chỉnh sửa
    } catch (err: any) {
      console.error("Lỗi cập nhật hợp đồng:", err);
      toast("Lỗi khi cập nhật hợp đồng: " + err.message, "error");
    }
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

        // Lấy note từ nhiều nguồn
        const noteValue = inv.note || extractedData?.invoice?.note || extractedData?.note || null;
        // Lấy attachments từ extractedData
        const attachmentsData = extractedData?.attachments || [];

        // Lấy các trường tài chính từ extractedData nếu có
        const totalValue = extractedData?.totals?.grandTotal || extractedData?.totals?.total || inv.total_amount || 0;
        const subtotalValue = extractedData?.totals?.subtotal || 0;
        const vatValue = extractedData?.totals?.vatAmount || (totalValue > 0 && subtotalValue > 0 ? totalValue - subtotalValue : 0);

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
          date: extractedData?.invoice?.date || extractedData?.date || inv.date || null,
          total: Number(totalValue) || 0,
          vat: Number(vatValue) || 0,
          vatRate: extractedData?.invoice?.vatRate || null,
          note: noteValue,
          notes: noteValue,
          isAdjustment: inv.is_adjustment || extractedData?.invoice?.isAdjustment || false,
          totalAmount: inv.total_amount,
          extractedData,
          attachments: attachmentsData,
          lineItems: inv.line_items,
          ownerId: inv.owner_id,
          createdAt: { toMillis: () => new Date(inv.created_at).getTime() } as any,
          updatedAt: inv.updated_at
        } as any; // ExtendedInvoiceItem
      }));

      // Debug: Log first invoice's note and attachments for verification
      if (filteredList.length > 0) {
        const firstInv = filteredList[0];
        const rawExtData = firstInv.extracted_data;
        console.log('[DEBUG] First invoice note data:', {
          'db_note': firstInv.note,
          'extracted_note': rawExtData?.invoice?.note,
          'extractedData.note': rawExtData?.note,
          'attachments': rawExtData?.attachments
        });
      }
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
      const filtered = (data || []).filter(c => c.template_id !== 'SYSTEM_VAT_CONFIG');
      setContracts(filtered.map(c => ({
        id: c.id,
        templateId: c.template_id,
        partyAId: c.party_a_id,
        partyBId: c.party_b_id,
        formData: c.form_data,
        fileName: c.file_name,
        ownerId: c.owner_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        contractType: c.contract_type || (c.form_data?._pdfUrl ? 'ocr_pdf' : 'word_docx')
      } as SmartContract)));
    } catch (err: any) {
      console.error("Lỗi khi tải danh sách hợp đồng:", err.message);
    }
  };

  const fetchVatConfig = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('owner_id', uid)
        .eq('template_id', 'SYSTEM_VAT_CONFIG')
        .eq('file_name', '__VAT_CONFIG__')
        .maybeSingle();
      if (error) throw error;
      if (data && data.form_data && (data.form_data as any).config) {
        const config = (data.form_data as any).config;
        setVatConfig(config);
        localStorage.setItem('vat_keyword_config', JSON.stringify(config));
      }
    } catch (err: any) {
      console.error("Lỗi khi tải cấu hình VAT:", err.message);
    }
  };

  const handleContractFieldChange = (tagOrUpdates: string | Record<string, string>, val?: string) => {
    if (typeof tagOrUpdates === 'object') {
      setContractFormData((prev: Record<string, string>) => {
        let next = { ...prev };
        Object.entries(tagOrUpdates).forEach(([tag, value]) => {
          const upperTag = tag.toUpperCase();
          const tags = contractForm.tags || [];

          const isTableTag = (upperTag.includes('BANG') || upperTag.includes('TABLE')) &&
            !upperTag.includes('BANG_CHU') && !upperTag.includes('BANGCHU');

          const isCurrencyField = !isTableTag && [
            'GIATRI', 'GIA_TRI', 'SO_TIEN', 'TONG_TIEN', 'THANH_TIEN', 'PHI', 'PHIDICHVU', 'GIA_TRI_HD', 'GIATRIHOPDONG'
          ].some(v => upperTag.includes(v));

          let finalVal = value;
          let autoWords = '';

          if (isCurrencyField) {
            finalVal = formatThousands(value);
            const numericString = value.replace(/\D/g, '');
            if (numericString) {
              const num = parseInt(numericString, 10);
              if (!isNaN(num)) {
                autoWords = numberToVietnameseWords(num);
              }
            }
          }

          next[tag] = finalVal;

          if (autoWords) {
            const wordTag = tags.find(t => {
              const u = t.toUpperCase();
              return (u.includes('BANG_CHU') || u.includes('BANGCHU')) && !u.includes('LICH');
            });
            if (wordTag) {
              next[wordTag] = autoWords;
            }
          }
          
          if (contractForm.vtLinks[tag]) {
            setContractForm(prevForm => ({
              ...prevForm,
              vtLinks: { ...prevForm.vtLinks, [tag]: null }
            }));
          }
        });
        return next;
      });
      return;
    }

    const tag = tagOrUpdates;
    const upperTag = tag.toUpperCase();
    const tags = contractForm.tags || [];

    const isTableTag = (upperTag.includes('BANG') || upperTag.includes('TABLE')) &&
      !upperTag.includes('BANG_CHU') && !upperTag.includes('BANGCHU');

    const isCurrencyField = !isTableTag && [
      'GIATRI', 'GIA_TRI', 'SO_TIEN', 'TONG_TIEN', 'THANH_TIEN', 'PHI', 'PHIDICHVU', 'GIA_TRI_HD', 'GIATRIHOPDONG'
    ].some(v => upperTag.includes(v));

    let finalVal = val || '';
    let autoWords = '';

    if (isCurrencyField) {
      finalVal = formatThousands(val || '');

      const numericString = (val || '').replace(/\D/g, '');
      if (numericString) {
        const num = parseInt(numericString, 10);
        if (!isNaN(num)) {
          autoWords = numberToVietnameseWords(num);
        }
      }
    }

    setContractFormData((prev: Record<string, string>) => {
      const next = { ...prev, [tag]: finalVal };

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

    // Map selected invoices to structured JSON array of items and save under _invoicesList
    const mappedInvoices: any[] = [];
    const safeParse = (v: any) => {
      if (typeof v === 'number') return v;
      const s = String(v || '0').replace(/[^0-9]/g, '');
      return parseInt(s, 10) || 0;
    };

    selectedDatas.forEach(inv => {
      const data = (inv as any).extractedData || {};
      const number = data.invoice?.number || (inv as any).invoiceNo || (inv as any).invoice_number || '';
      const date = data.invoice?.date || (inv as any).invoiceDate || (inv as any).invoice_date || '';
      const amount = data.totals?.grandTotal || data.totals?.totalAmount || (inv as any).totalAmount || (inv as any).total_amount || 0;
      const note = data.seller?.name || (inv as any).sellerName || (inv as any).seller_name || '';

      const items = data.items || data.lineItems || (inv as any).lineItems || [];
      if (items.length > 0) {
        items.forEach((item: any) => {
          const qty = safeParse(item.quantity || item.SL || 1);
          const price = safeParse(item.unitPrice || item.Don_Gia || 0);
          const totalLine = safeParse(item.total || item.Thanh_Tien || item.amount || (qty * price));
          
          // Exclude if both price and amount are 0/empty
          if (price === 0 && totalLine === 0) {
            return;
          }

          mappedInvoices.push({
            id: Math.random().toString(36).substring(2, 9),
            noidung: item.description || item.name || `Hạng mục từ HĐ số ${number}`,
            donvi: item.unit || item.DVT || '',
            soluong: String(qty),
            dongia: price,
            amount: totalLine
          });
        });
      } else {
        const parsedAmount = safeParse(amount);
        if (parsedAmount > 0) {
          const invoiceTitle = note ? `${note} (HĐ số ${number})` : `Hóa đơn số ${number}`;
          mappedInvoices.push({
            id: inv.id || Math.random().toString(36).substring(2, 9),
            noidung: invoiceTitle,
            donvi: 'Lần',
            soluong: '1',
            dongia: parsedAmount,
            amount: parsedAmount
          });
        }
      }
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

      // Xuat file an toan dung showSaveFilePicker
      executeSecureExport(genDoc.fileName, blob, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
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

            // Xuat file an toan dung showSaveFilePicker
            executeSecureExport(contract.fileName || gasJson.fileName || "Hop_Dong.docx", blob, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            toast("Đã tải hợp đồng từ Google Drive thành công!", "success");
            return;
          }
        }
      }

      // Fallback: local client-side generation
      toast("Đang tự động khởi tạo và tải xuống bản sao hợp đồng cục bộ...", "success");
      const buffer = await fetchTemplateBuffer(contract.templateId);
      const blob = await generateDocxBlobForContract(contract.templateId, contract.formData, buffer);
      // Xuat file an toan dung showSaveFilePicker
      executeSecureExport(contract.fileName, blob, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      toast("Đã tải hợp đồng!", "success");
    } catch (err: any) {
      toast("Lỗi khi tải hợp đồng: " + err.message, "error");
    }
  };

  // Sync state with pathname on mount
  useEffect(() => {
    const handlePathChange = () => {
      const pathSegments = window.location.pathname.split('/').filter(Boolean);
      const firstSegment = pathSegments[0] || '';

      const foundTab = (Object.keys(TAB_CONFIG) as Tab[]).find(
        key => TAB_CONFIG[key].path === firstSegment
      );

      if (foundTab) {
        setActiveTab(foundTab);

        // Handle dashboard sub-tabs
        if (foundTab === 'dashboard') {
          setDashboardSubTab('invoices');
        }

        // Special handling for dashboard detail view
        if (foundTab === 'dashboard' && pathSegments.length > 2) {
          const actualSlug = pathSegments[pathSegments.length - 1];
          if (!['Quan-ly-hoa-don', 'Quan-ly-hop-dong'].includes(actualSlug)) {
            const sParts = actualSlug.split('-');
            const id = sParts[sParts.length - 1];

            if (invoices.length > 0) {
              const inv = invoices.find(i => i.id === id);
              if (inv) {
                setSelectedInvoice(inv);
              }
            }
          } else {
            setSelectedInvoice(null);
          }
        } else if (foundTab === 'dashboard') {
          setSelectedInvoice(null);
        }

        // Special handling for partners edit view
        if (foundTab === 'partners') {
          const sub = pathSegments[1];
          if (sub === 'batch' || sub === 'edit') {
            const isBatch = sub === 'batch';
            const slug = pathSegments[2] || '';
            const subParts = slug.split('-');
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
      } else if (!firstSegment) {
        // Redirect root to dashboard
        window.history.replaceState(null, '', `/${TAB_CONFIG.dashboard.path}/`);
      }
    };

    // Listen to popstate (back/forward navigation)
    window.addEventListener('popstate', handlePathChange);
    handlePathChange(); // Initial check

    return () => window.removeEventListener('popstate', handlePathChange);
  }, [invoices.length, partners.length]); // Re-run when invoices or partners are loaded to catch direct links

  // Sync pathname with Multi-Partner Edit
  useEffect(() => {
    if (multiPartnerEdit?.isOpen) {
      const currentPartner = partners[multiPartnerEdit.currentIndex];
      if (currentPartner) {
        const cleanName = removeTones(currentPartner.name).replace(/\s+/g, '').toUpperCase();
        window.history.replaceState(null, '', `/${TAB_CONFIG.partners.path}/batch/${currentPartner.taxCode}-${cleanName}/`);
      }
    }
  }, [multiPartnerEdit?.currentIndex, multiPartnerEdit?.isOpen, partners]);

  // Update pathname when Tab changes manually
  function handleTabChange(tab: Tab) {
    console.log("DEBUG: handleTabChange click tab =", tab);
    if (tab === 'dashboard') {
      window.history.replaceState(null, '', `/${TAB_CONFIG[tab].path}/Quan-ly-hoa-don/`);
    } else {
      window.history.replaceState(null, '', `/${TAB_CONFIG[tab].path}/`);
    }
    setActiveTab(tab);
    if (tab === 'dashboard') {
      setSelectedInvoice(null);
    }
  }

  const handleDashboardSubTabChange = (subTab: 'invoices') => {
    window.history.replaceState(null, '', `/${TAB_CONFIG.dashboard.path}/Quan-ly-hoa-don/`);
  };

  const handleInvoiceSelect = (inv: Invoice | null) => {
    if (inv) {
      const baseName = inv.fileName.replace(/\.[^/.]+$/, "");
      const cleanFileName = removeTones(baseName);

      window.history.replaceState(null, '', `/${TAB_CONFIG.dashboard.path}/Quan-ly-hoa-don/${cleanFileName}-${inv.id}/`);
      setSelectedInvoice(inv);
    } else {
      window.history.replaceState(null, '', `/${TAB_CONFIG.dashboard.path}/Quan-ly-hoa-don/`);
      setSelectedInvoice(null);
    }
  };

  const handlePartnerEditSelect = (p: Partner | null) => {
    if (p) {
      const cleanName = removeTones(p.name).replace(/\s+/g, '').toUpperCase();
      window.history.replaceState(null, '', `/${TAB_CONFIG.partners.path}/edit/${p.taxCode}-${cleanName}/`);
      setEditingPartner(p);
      setMultiPartnerEdit(null);
    } else {
      window.history.replaceState(null, '', `/${TAB_CONFIG.partners.path}/`);
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
    window.history.replaceState(null, '', `/${TAB_CONFIG.partners.path}/batch/${firstPartner.taxCode}-${cleanName}/`);
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
        updated_at: new Date().toISOString(),
        contract_number: data.formData.contractNumber || '',
        contract_date: formatDbDate(data.formData.contractDate)
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
    if (!confirm("Bạn có chắc chắn muốn xóa hợp đồng này? Tất cả dữ liệu liên quan và tệp tin trên Google Drive sẽ bị xóa sạch.")) return;

    const hopDong = contracts.find(c => c.id === id);
    const toastId = toast("Đang thực hiện xóa hợp đồng và dữ liệu liên quan...", "loading");

    try {
      // 1. Chu dong xoa cac hang muc chi tiet cua hop dong trong bang contract_items
      const { error: itemsError } = await supabase
        .from('contract_items')
        .delete()
        .eq('contract_id', id);
      if (itemsError) {
        console.warn("Lỗi khi xóa contract_items (có thể đã tự động cascade):", itemsError.message);
      }

      // 2. Xoa ban ghi hop dong chinh trong bang contracts
      const { error } = await supabase.from('contracts').delete().eq('id', id);
      if (error) throw error;

      removeToast(toastId);
      toast("Đã xóa dữ liệu hợp đồng thành công!", "success");
      fetchContracts(user.uid);

      // 3. Dong bo xoa sach cac file va thu muc tren Google Drive (khong block UI)
      if (hopDong) {
        const gasUrl = (import.meta as any).env.VITE_GAS_WEB_APP_URL;
        const fileId = hopDong.formData?._driveFileId || '';
        const pdfFileId = hopDong.formData?._pdfFileId || '';
        
        // Ho tro replace ca .pdf va .docx de lay ten folder chinh xac
        const folderName = hopDong.formData?._contractFolder || 
          hopDong.fileName?.replace(/\.(docx|pdf)$/i, '') || '';

        if (gasUrl && (folderName || fileId || pdfFileId)) {
          (async () => {
            try {
              console.log(`[DRIVE-DELETE] Dang gui yeu cau xoa file tren Drive. Folder: ${folderName}, WordId: ${fileId}, PdfId: ${pdfFileId}`);
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
                  console.log("Đã đồng bộ xóa sạch thư mục và các tệp hợp đồng liên quan trên Google Drive thành công.");
                } else {
                  console.warn("GAS Delete Contract Warn:", gasJson.error);
                }
              }
            } catch (driveErr) {
              console.error("Lỗi đồng bộ xóa tệp hợp đồng trên Google Drive:", driveErr);
            }
          })();
        }
      }
    } catch (err: any) {
      removeToast(toastId);
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

    // HÌNH NỀN DESKTOP: Bỏ qua đăng nhập bằng tài khoản Google, tự động xác thực và liên kết Supabase
    if (isIframeMode()) {
      const defaultUser = {
        uid: "u0weCnnlzSNJvbWrsAJe4U1cqzm1",
        email: "huynhbao.desktop@gmail.com",
        displayName: "Huỳnh Bảo Desktop",
        photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Bao"
      };
      console.log("[DEBUG] Wallpaper Mode: Tự động bỏ qua Google Login. Sử dụng tài khoản mặc định:", defaultUser.email);
      
      setUser(defaultUser as any);
      setIsLoadingInvoices(true);
      
      // Cấu hình custom header cho Supabase để vượt PostgreSQL RLS
      try {
        setCustomUserId(defaultUser.uid);
      } catch (e) {
        console.error("Failed to set user header:", e);
      }
      
      // Tải trực tiếp dữ liệu của user từ Supabase
      Promise.all([
        fetchPartners(defaultUser.uid),
        fetchInvoices(defaultUser.uid),
        fetchGeneratedDocs(defaultUser.uid),
        fetchContracts(defaultUser.uid)
      ]).then(() => {
        setIsLoadingInvoices(false);
      }).catch(err => {
        console.error("Failed to fetch data offline:", err);
        setIsLoadingInvoices(false);
      });
      
      // Bỏ qua toàn bộ phần thiết lập onAuthStateChanged của Firebase vì chúng ta đã tự giả lập phiên đăng nhập!
      return;
    }

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

        // Tự động đồng bộ hóa phiên đăng nhập sang Local Node Server nếu chạy ở trình duyệt Chrome chính
        if (window.self === window.top) {
          try {
            const idToken = await u.getIdToken();
            await fetch('/api/auth/save-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uid: u.uid,
                email: u.email,
                displayName: u.displayName,
                photoURL: u.photoURL,
                idToken: idToken
              })
            });
            console.log("[DEBUG] Đồng bộ phiên đăng nhập sang Server thành công!");
          } catch (syncErr) {
            console.error("[DEBUG] Lỗi đồng bộ phiên đăng nhập:", syncErr);
          }
        }

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
          fetchContracts(u.uid),
          fetchVatConfig(u.uid)
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
        setVatConfig([
          { keyword: 'cát', rate: 10 },
          { keyword: 'đá', rate: 10 },
          { keyword: 'bê tông', rate: 8 },
          { keyword: 'xe', rate: 8 },
          { keyword: 'máy', rate: 8 }
        ]);
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

    // Extract note from multiple possible sources
    const extractNote = (src: any): string | undefined => {
      if (!src) return undefined;
      if (typeof src === 'string') {
        const trimmed = src.trim();
        return trimmed && !trimmed.match(/^[.\- ]+$/) ? trimmed : undefined;
      }
      if (typeof src === 'object') {
        // Common fields that may contain note text
        const fields = ['note', 'notes', 'memo', 'description', 'text', 'content', 'value', 'noteText'];
        for (const f of fields) {
          const v = src[f];
          if (typeof v === 'string') {
            const trimmed = v.trim();
            if (trimmed && !trimmed.match(/^[.\- ]+$/)) return trimmed;
          }
        }
      }
      return undefined;
    };

    const noteFromSources = [
      extractNote(newData.invoice),
      extractNote(newData.invoice?.note),
      extractNote(newData.invoice?.notes),
      extractNote(newData.invoice?.memo),
      extractNote(newData.note),
      extractNote(newData.notes),
      extractNote(newData.memo),
      extractNote(data?.invoice?.note),
      extractNote(data?.invoice?.notes),
      extractNote(data?.note),
      extractNote(data?.notes),
    ].filter((v): v is string => Boolean(v));

    const rawNote = noteFromSources[0];

    // Detect adjustment/replacement invoice keywords
    const adjustmentKeywords = /điều chỉnh|thay thế|hóa đơn thay thế|hóa đơn điều chỉnh|điều chỉnh giảm|điều chỉnh tăng|thay thế hóa đơn/i;
    const isAdjustment = adjustmentKeywords.test(rawNote || '') || adjustmentKeywords.test(newData.amountInWords || '') || adjustmentKeywords.test(data.amountInWords || '');

    if (isAdjustment) {
      newData.invoice = newData.invoice || {};
      newData.invoice.isAdjustment = true;
      newData.invoice.note = newData.invoice.note || rawNote || newData.note || 'Hóa đơn điều chỉnh';
    } else if (rawNote && !newData.invoice?.note) {
      newData.invoice = newData.invoice || {};
      newData.invoice.note = rawNote;
    }

    // Ensure totals are numbers and calculate vatRate if missing or using default
    if (newData.totals) {
      const sub = fixNumber(newData.totals.subtotal || newData.totals.Subtotal || newData.totals.sub_total) || 0;
      const vat = fixNumber(newData.totals.vatAmount || newData.totals.VatAmount || newData.totals.vat_amount) || 0;
      const total = fixNumber(newData.totals.grandTotal || newData.totals.GrandTotal || newData.totals.grand_total);

      // Calculate vatRate: (Total - Subtotal) / Subtotal or Vat / Subtotal
      // Use Math.abs to handle negative totals (adjustment invoices)
      const absSub = Math.abs(sub);
      if (absSub > 0) {
        const calculatedVat = (total !== null && total !== 0) ? Math.abs(total - sub) : Math.abs(vat);
        const calculatedRate = Math.round((calculatedVat / absSub) * 100);

        if (!newData.invoice) newData.invoice = {};
        newData.invoice.vatRate = calculatedRate;

        // Ensure vatAmount is also consistent if it was 0
        if (vat === 0 && total !== null) newData.totals.vatAmount = calculatedVat * Math.sign(vat || sub);

        // If total was missing, use sub + vat (preserve sign for adjustment)
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
                const { classifyInvoice } = await import('./services/mistral');
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
                const { classifyInvoice } = await import('./services/mistral');
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
    <div className={cn(
      "flex h-screen w-full font-sans select-none overflow-hidden bg-bg-dark",
      isIframeMode() && "wallpaper-glass-theme"
    )}>
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
        <header className="h-[calc(64px+env(safe-area-inset-top,0px))] md:h-[64px] pt-[env(safe-area-inset-top,0px)] md:pt-0 bg-sidebar-dark border-b border-border-dark flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm">
          <div className="flex items-center gap-2 text-text-dim text-sm italic shrink-0">
            <span className="hidden md:inline">DocuForge AI</span>
            <span className="hidden md:inline text-text-dim/50">/</span>
            <span className="text-white font-black not-italic uppercase text-xs bg-white/5 md:bg-transparent px-3 py-1.5 md:p-0 rounded-xl border border-border-dark md:border-transparent tracking-wider">
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
            <div className="hidden md:block flex-1 max-w-xl mx-8 relative group">
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

          <div className="flex items-center gap-3 md:gap-6 shrink-0">
            <div className="hidden md:flex items-center bg-white/5 rounded-2xl p-1.5 border border-border-dark gap-1">
              <button
                onClick={() => handleTabChange('upload')}
                className="btn-primary py-3"
              >
                <Plus className="size-5" />
                <span>Bắt đầu lượt mới</span>
              </button>
            </div>
            <div className="size-10 md:size-12 rounded-xl md:rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary shadow-inner shrink-0">
              {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : "GA"}
            </div>
          </div>
        </header>

        <div className={cn("flex-1 min-h-0", activeTab === 'transactions' ? "p-0 overflow-hidden flex flex-col" : "p-4 md:p-6 overflow-y-auto pb-24 md:pb-6")}>
          <div className={cn("h-full", activeTab === 'transactions' && "flex flex-col min-h-0")}>
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
                contractUploadMode={contractUploadMode}
                setContractUploadMode={setContractUploadMode}
                showContractUpload={showContractUpload}
                setShowContractUpload={setShowContractUpload}
                onTabChange={handleTabChange}
                onEditOcr={setEditingContractOcr}
                activeTab={activeTab}
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

                          // Xuat file an toan dung showSaveFilePicker
                          const suggestedName = `${tType}_${selectedInvoice.fileName.split('.')[0]}.docx`;
                          await executeSecureExport(
                            suggestedName,
                            blob,
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                          );

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
                vatConfig={vatConfig}
                openVatConfig={() => setIsVatConfigOpen(true)}
              />
            )}
            {activeTab === 'contract_upload' && (
              <div className="mt-6">
                <ContractUploadView
                  onSave={handleContractUploadSave}
                  onBack={() => {
                    handleTabChange('dashboard');
                  }}
                  ocrQueue={ocrQueue}
                  currentOcrIndex={currentOcrIndex}
                  ocrProgress={ocrProgress}
                  onStartBatchOcr={(batchFiles) => {
                    const queueItems = batchFiles.map(f => ({
                      id: `batch_${Math.random().toString(36).slice(2, 7)}_${Date.now()}`,
                      file: f,
                      status: 'pending' as const
                    }));
                    setOcrQueue(queueItems);
                    setBatchOcrCount(batchFiles.length);
                    setCurrentOcrIndex(0);
                    setIsCooldown(false);
                  }}
                />
              </div>
            )}
            {activeTab === 'system' && (
              <SystemMonitorView />
            )}
            {activeTab === 'tax-lookup' && (
              <TaxLookupView />
            )}
            {activeTab === 'transactions' && user && (
              <TransactionsView ownerId={user.uid} />
            )}
            {activeTab === 'agent-hub' && (
              <AgentHubView />
            )}
            {activeTab === 'dossier' && user && (
              <DossierView
                ownerId={user.uid}
                partners={partners}
                onTabChange={(tab) => setActiveTab(tab as Tab)}
                onDownload={downloadContract}
                onEditOcr={(contract) => setEditingContractOcr(contract)}
              />
            )}
          </div>
        </div>

        <footer className="hidden md:flex h-10 bg-sidebar-dark border-t border-border-dark px-6 items-center justify-between text-[10px] uppercase font-bold tracking-widest text-text-dim">
          {ocrProgress ? (
            <div className="flex items-center justify-between w-full h-full">
              <div className="flex items-center gap-4 flex-1">
                <span className="flex items-center gap-2 text-primary animate-pulse whitespace-nowrap">
                  <Sparkles className="size-3.5" />
                  <span>OCR: {ocrProgress.message}</span>
                </span>
                <div className="w-48 bg-stone-850 h-2 rounded-full overflow-hidden border border-border-dark shrink-0">
                  <div 
                    className="bg-primary h-full transition-all duration-300" 
                    style={{ width: `${ocrProgress.percent}%` }}
                  />
                </div>
                <span className="whitespace-nowrap">Tập tin {ocrProgress.stage}/{ocrProgress.totalStages} ({ocrProgress.percent}%)</span>
              </div>
              <div className="flex items-center gap-4">
                {ocrProgress.status === 'error' && (
                  <button 
                    onClick={() => setOcrProgress(null)}
                    className="px-2.5 py-1 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 rounded-lg transition-all text-[9px] uppercase font-bold"
                  >
                    Đóng lỗi
                  </button>
                )}
                {ocrProgress.status === 'done' && (
                  <button 
                    onClick={() => setOcrProgress(null)}
                    className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-all text-[9px] uppercase font-bold"
                  >
                    Đóng
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </footer>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-sidebar-dark/95 backdrop-blur-md border-t border-border-dark flex items-center justify-around z-40 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
        <button
          onClick={() => handleTabChange('dashboard')}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors text-[10px] font-black uppercase tracking-wider",
            activeTab === 'dashboard' ? "text-primary" : "text-text-dim hover:text-white"
          )}
        >
          <LayoutDashboard className="size-5" />
          <span>Tổng quan</span>
        </button>
        <button
          onClick={() => handleTabChange('upload')}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors text-[10px] font-black uppercase tracking-wider",
            activeTab === 'upload' ? "text-primary" : "text-text-dim hover:text-white"
          )}
        >
          <UploadCloud className="size-5" />
          <span>Tải lên</span>
        </button>
        <button
          onClick={() => handleTabChange('partners')}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors text-[10px] font-black uppercase tracking-wider",
            activeTab === 'partners' ? "text-primary" : "text-text-dim hover:text-white"
          )}
        >
          <Users className="size-5" />
          <span>Đối tác</span>
        </button>
        <button
          onClick={() => handleTabChange('contract')}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors text-[10px] font-black uppercase tracking-wider",
            activeTab === 'contract' ? "text-primary" : "text-text-dim hover:text-white"
          )}
        >
          <PlusSquare className="size-5" />
          <span>Hợp đồng</span>
        </button>
        <button
          onClick={() => setShowMoreSheet(true)}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors text-[10px] font-black uppercase tracking-wider",
            showMoreSheet ? "text-primary" : "text-text-dim hover:text-white"
          )}
        >
          <MoreVertical className="size-5" />
          <span>Thêm</span>
        </button>
      </div>

      {/* Mobile More Bottom Sheet Drawer */}
      <AnimatePresence>
        {showMoreSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoreSheet(false)}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            />
            {/* Sheet Content */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="md:hidden fixed bottom-0 left-0 right-0 rounded-t-[32px] bg-sidebar-dark border-t border-border-dark p-6 pb-8 z-[85] max-h-[80vh] overflow-y-auto flex flex-col gap-6 text-white"
            >
              {/* Drag Indicator */}
              <div className="w-12 h-1.5 bg-border-dark rounded-full mx-auto" onClick={() => setShowMoreSheet(false)} />

              {/* User Profile */}
              {user ? (
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-border-dark">
                  <img
                    src={user.photoURL || ''}
                    alt=""
                    className="size-12 rounded-xl border border-border-dark shadow-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black truncate">{user.displayName}</div>
                    <div className="text-[10px] text-text-dim truncate">{user.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowMoreSheet(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-black uppercase tracking-wider transition-colors border border-red-500/20"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    handleLogin();
                    setShowMoreSheet(false);
                  }}
                  className="w-full bg-white/10 text-white p-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-border-dark flex items-center justify-center gap-3 active:scale-95 shadow-lg"
                >
                  <Users className="size-5 shrink-0" />
                  <span>Đăng nhập Google</span>
                </button>
              )}

              {/* Secondary Navigation */}
              <div className="flex flex-col gap-2">
                <div className="text-[10px] text-text-dim uppercase font-bold tracking-widest px-2 mb-1">Mở rộng</div>
                <button
                  onClick={() => {
                    handleTabChange('contract_upload');
                    setShowMoreSheet(false);
                  }}
                  className={cn(
                    "flex items-center gap-3.5 p-4 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all",
                    activeTab === 'contract_upload'
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-white/5 text-white border-border-dark hover:bg-white/10"
                  )}
                >
                  <Upload className="size-5 shrink-0" />
                  <span>Tải lên hợp đồng</span>
                </button>
                <button
                  onClick={() => {
                    handleTabChange('docs');
                    setShowMoreSheet(false);
                  }}
                  className={cn(
                    "flex items-center gap-3.5 p-4 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all",
                    activeTab === 'docs'
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-white/5 text-white border-border-dark hover:bg-white/10"
                  )}
                >
                  <Files className="size-5 shrink-0" />
                  <span>Tài liệu đã tạo</span>
                </button>
                <button
                  onClick={() => {
                    handleTabChange('system');
                    setShowMoreSheet(false);
                  }}
                  className={cn(
                    "flex items-center gap-3.5 p-4 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all",
                    activeTab === 'system'
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-white/5 text-white border-border-dark hover:bg-white/10"
                  )}
                >
                  <Database className="size-5 shrink-0" />
                  <span>Theo dõi hệ thống</span>
                </button>
                <button
                  onClick={() => {
                    handleTabChange('agent-hub');
                    setShowMoreSheet(false);
                  }}
                  className={cn(
                    "flex items-center gap-3.5 p-4 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all",
                    activeTab === 'agent-hub'
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-white/5 text-white border-border-dark hover:bg-white/10"
                  )}
                >
                  <Cpu className="size-5 shrink-0" />
                  <span>Cấu hình Agent Hub</span>
                </button>

                {/* Quản lý văn bản */}
                <div className="pt-4 pb-2">
                  <span className="text-[10px] text-text-dim uppercase font-bold tracking-widest px-2">Quản lý văn bản</span>
                </div>
                <button
                  onClick={() => {
                    handleTabChange('dossier');
                    setShowMoreSheet(false);
                  }}
                  className={cn(
                    "flex items-center gap-3.5 p-4 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all",
                    activeTab === 'dossier'
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-white/5 text-white border-border-dark hover:bg-white/10"
                  )}
                >
                  <FolderArchive className="size-5 shrink-0" />
                  <span>Hồ sơ</span>
                </button>
              </div>

              {/* System Stats Block */}
              <div className="flex flex-col gap-2">
                <div className="text-[10px] text-text-dim uppercase font-bold tracking-widest px-2 mb-1">Trạng thái hệ thống</div>
                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-border-dark text-xs">
                  <div className={cn("size-2.5 rounded-full animate-pulse shadow-md", user ? "bg-green-500 shadow-green-500/50" : "bg-yellow-500 shadow-yellow-500/50")}></div>
                  <span className="font-bold text-stone-200">
                    {user ? "AI Engine: Sẵn sàng hoạt động" : "Đang chờ đăng nhập"}
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="bg-card-dark rounded-t-[32px] md:rounded-[32px] shadow-[0_50px_100px_rgba(0,0,0,0.6)] w-full max-w-4xl overflow-hidden border border-white/10 flex flex-col h-[91vh] md:h-auto md:max-h-[90vh]"
            >
              {/* Modern Header */}
              <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-white/5 relative overflow-hidden shrink-0 select-none">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-orange-400 to-primary/20" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="size-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center border border-primary/30 shadow-lg shrink-0">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">{editingPartner.id === 'new' ? 'Khởi tạo đối tác mới' : 'Cập nhật hồ sơ đối tác'}</h3>
                    <p className="text-text-dim text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5 opacity-60">Chuẩn hóa dữ liệu hệ thống doanh nghiệp</p>
                  </div>
                </div>
                <button type="button" onClick={() => handlePartnerEditSelect(null)} className="size-9 flex items-center justify-center text-text-dim hover:text-white hover:bg-white/10 rounded-xl transition-all shrink-0">
                  <X className="size-5" />
                </button>
              </div>

              <form
                className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-6"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsProcessing(true);
                  try {
                    const updatePayload: Partial<Partner> = {
                      name: partnerFormValues.name,
                      taxCode: partnerFormValues.taxCode,
                      representative: partnerFormValues.representative,
                      position: partnerFormValues.position,
                      gender: partnerFormValues.gender,
                      address: partnerFormValues.address,
                      addressPostMerger: partnerFormValues.addressPostMerger,
                      accountNumber: partnerFormValues.accountNumber,
                      bankName: partnerFormValues.bankName,
                    };

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  {/* LEFT COLUMN: IDENTITY & ADDRESSES */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary border-b border-white/5 pb-2">
                      <Fingerprint className="size-4 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Doanh nghiệp & Địa chỉ</span>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-text-dim uppercase block mb-1.5 ml-1">Tên pháp nhân công ty</label>
                      <input
                        name="name"
                        required
                        placeholder="Ví dụ: CÔNG TY TNHH XÂY DỰNG ABC..."
                        value={partnerFormValues.name}
                        onChange={e => setPartnerFormValues({ ...partnerFormValues, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-text-dim uppercase block mb-1.5 ml-1">Mã số thuế</label>
                      <div className="flex gap-2">
                        <input
                          name="taxCode"
                          required
                          placeholder="Số MST..."
                          value={partnerFormValues.taxCode}
                          onChange={e => setPartnerFormValues({ ...partnerFormValues, taxCode: e.target.value.replace(/[^0-9\-]/g, '') })}
                          className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white"
                        />
                        <button
                          type="button"
                          disabled={isSearchingTaxCode || !partnerFormValues.taxCode}
                          onClick={handleFetchTaxInfoInForm}
                          className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1 shrink-0"
                        >
                          {isSearchingTaxCode ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
                          Tra cứu
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Địa chỉ gốc (Trước 1/7/2025)</label>
                        <button
                          type="button"
                          onClick={() => {
                            const addrInput = partnerFormValues.address;
                            if (!addrInput) return;
                            const result = smartConvertAddress(addrInput);
                            if (result.isConverted) {
                              setPartnerFormValues(prev => ({
                                ...prev,
                                address: result.oldFullAddress || addrInput,
                                addressPostMerger: result.fullAddress
                              }));
                              toast("Đã chuẩn hóa địa chỉ!", "success");
                            } else {
                              toast("Địa chỉ đã chuẩn hoặc không cần sáp nhập", "info");
                            }
                          }}
                          className="text-[9px] font-black text-primary hover:text-white hover:bg-primary px-2 py-0.5 rounded-lg transition-all border border-primary/30 uppercase tracking-wider flex items-center gap-1"
                        >
                          <Zap className="size-2.5" /> Chuẩn hóa
                        </button>
                      </div>
                      <textarea
                        ref={partnerAddressRef}
                        name="address"
                        value={partnerFormValues.address}
                        onChange={e => setPartnerFormValues({ ...partnerFormValues, address: e.target.value })}
                        placeholder="Nhập địa chỉ..."
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm font-medium focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white min-h-[50px] leading-relaxed resize-none overflow-y-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest block mb-1.5 ml-1">Địa chỉ sáp nhập mới (Sau 1/7/2025)</label>
                      <textarea
                        ref={partnerAddressPostMergerRef}
                        name="addressPostMerger"
                        value={partnerFormValues.addressPostMerger}
                        onChange={e => setPartnerFormValues({ ...partnerFormValues, addressPostMerger: e.target.value })}
                        placeholder="Địa chỉ mới sau sáp nhập..."
                        className="w-full px-4 py-2 bg-primary/5 border border-primary/20 rounded-xl text-xs sm:text-sm font-black text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[50px] leading-relaxed resize-none placeholder:text-primary/30 overflow-y-hidden"
                      />
                    </div>
                  </div>

                  {/* RIGHT COLUMN: BANK INFO & LEGAL REPRESENTATIVE */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary border-b border-white/5 pb-2">
                      <CreditCard className="size-4 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Tài chính & Đại diện</span>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-text-dim uppercase block mb-1.5 ml-1">Số tài khoản ngân hàng</label>
                      <input
                        name="accountNumber"
                        value={partnerFormValues.accountNumber}
                        onChange={e => setPartnerFormValues({ ...partnerFormValues, accountNumber: e.target.value })}
                        placeholder="Nhập số tài khoản..."
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-text-dim uppercase block mb-1.5 ml-1">Tên ngân hàng & Chi nhánh</label>
                      <input
                        name="bankName"
                        value={partnerFormValues.bankName}
                        onChange={e => setPartnerFormValues({ ...partnerFormValues, bankName: e.target.value })}
                        placeholder="Ví dụ: VCB - CN Tân Sơn Nhất..."
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-text-dim uppercase block mb-1.5 ml-1">Họ và tên người đại diện pháp luật</label>
                      <input
                        name="representative"
                        value={partnerFormValues.representative}
                        onChange={e => setPartnerFormValues({ ...partnerFormValues, representative: e.target.value })}
                        placeholder="Nhập họ và tên..."
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-text-dim uppercase block mb-1.5 ml-1">Chức vụ</label>
                        <input
                          name="position"
                          value={partnerFormValues.position}
                          onChange={e => setPartnerFormValues({ ...partnerFormValues, position: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-text-dim uppercase block mb-1.5 ml-1">Xưng hô</label>
                        <div className="relative">
                          <select
                            name="gender"
                            value={partnerFormValues.gender}
                            onChange={e => setPartnerFormValues({ ...partnerFormValues, gender: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm font-bold focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-white appearance-none cursor-pointer"
                          >
                            <option value="Ông" className="bg-card-dark text-white">Ông</option>
                            <option value="Bà" className="bg-card-dark text-white">Bà</option>
                          </select>
                          <ChevronDown className="size-4 text-text-dim pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 flex gap-4 border-t border-white/5 shrink-0">
                  <button type="submit" disabled={isProcessing} className="flex-1 py-3.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:translate-y-[-2px] active:scale-95 transition-all flex items-center justify-center gap-2">
                    {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    {editingPartner.id === 'new' ? 'Hoàn tất khởi tạo' : 'Lưu thay đổi hồ sơ'}
                  </button>
                  <button type="button" onClick={() => handlePartnerEditSelect(null)} className="px-8 py-3.5 bg-white/5 text-text-dim hover:text-white border border-white/10 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-white/10 active:scale-95">Hủy bỏ</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Advanced Multi-Partner Edit Modal */}
      <AnimatePresence>
        {multiPartnerEdit && multiPartnerEdit.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="bg-card-dark rounded-t-[32px] md:rounded-[56px] shadow-[0_60px_150px_rgba(0,0,0,0.7)] w-full max-w-6xl overflow-hidden border border-white/10 flex flex-col h-[91vh] md:h-auto md:max-h-[88vh]"
            >
              {/* Premium Batch Header */}
              <div className="p-4 sm:p-5 md:p-10 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center bg-white/5 relative gap-3 sm:gap-4 shrink-0 select-none pt-5 sm:pt-6 md:pt-10">
                <div className="absolute bottom-0 left-0 h-[2px] bg-primary transition-all duration-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]" style={{ width: `${((multiPartnerEdit.currentIndex + 1) / partners.length) * 100}%` }} />

                <div className="flex items-center gap-3 md:gap-6">
                  <div className="size-8 md:size-16 bg-gradient-to-tr from-primary to-orange-400 text-white rounded-xl md:rounded-[24px] flex items-center justify-center shadow-2xl shrink-0">
                    <Layers className="size-4 md:size-8" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-lg md:text-2xl font-black text-white uppercase tracking-widest">Trung tâm chỉnh sửa hàng loạt</h3>
                    <div className="flex items-center gap-3 mt-1 md:mt-2">
                      <span className="px-2 py-0.5 md:px-3 md:py-1 bg-primary/20 text-primary border border-primary/30 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest">
                        Đối tác {multiPartnerEdit.currentIndex + 1} / {partners.length}
                      </span>
                      <div className="h-1 w-16 md:w-32 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${((multiPartnerEdit.currentIndex + 1) / partners.length) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                  <div className="text-left md:text-right mr-0 md:mr-4">
                    <div className="text-[8px] md:text-[10px] font-black text-text-dim uppercase tracking-widest mb-0.5 opacity-60">Tiến độ cập nhật</div>
                    <div className="text-[10px] md:text-sm font-black text-white">{Math.round(((multiPartnerEdit.currentIndex + 1) / partners.length) * 100)}% Hoàn tất</div>
                  </div>
                  <button
                    onClick={() => {
                      if (Object.keys(multiPartnerEdit.drafts).length > 0) {
                        setMultiPartnerEdit(prev => prev ? { ...prev, showExitConfirm: true } : null);
                      } else {
                        window.history.replaceState(null, '', `/${TAB_CONFIG.partners.path}/`);
                        setMultiPartnerEdit(null);
                      }
                    }}
                    className="size-8 md:size-12 flex items-center justify-center text-text-dim hover:text-white hover:bg-white/10 rounded-2xl transition-all shrink-0"
                  >
                    <X className="size-4 md:size-6" />
                  </button>
                </div>
              </div>

              {/* Enhanced Batch Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12 custom-scrollbar pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-12">
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
                      <div className="bg-white/5 p-4 sm:p-8 rounded-[24px] border border-white/5 shadow-inner">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-10">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-12">
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-10">
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

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-10">
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
              <div className="p-4 sm:p-6 md:p-10 bg-white/5 border-t border-white/5 flex flex-col gap-4 sm:gap-6 shrink-0">
                <div className="flex items-center justify-between gap-4 sm:gap-10">
                  <div className="flex gap-2 sm:gap-4">
                    <button
                      onClick={() => setMultiPartnerEdit(prev => prev ? { ...prev, currentIndex: Math.max(0, prev.currentIndex - 1) } : null)}
                      disabled={multiPartnerEdit.currentIndex === 0}
                      className="size-12 sm:size-16 flex items-center justify-center rounded-[20px] sm:rounded-[24px] border border-white/10 bg-white/5 text-text-dim hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-xl shrink-0"
                    >
                      <ChevronLeft className="size-6 sm:size-8" />
                    </button>
                    <button
                      onClick={() => setMultiPartnerEdit(prev => prev ? { ...prev, currentIndex: Math.min(partners.length - 1, prev.currentIndex + 1) } : null)}
                      disabled={multiPartnerEdit.currentIndex === partners.length - 1}
                      className="size-12 sm:size-16 flex items-center justify-center rounded-[20px] sm:rounded-[24px] border border-white/10 bg-white/5 text-text-dim hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-xl shrink-0"
                    >
                      <ChevronRight className="size-6 sm:size-8" />
                    </button>
                  </div>

                  <div className="flex-1 flex justify-end gap-3 sm:gap-6">
                    <button
                      onClick={() => {
                        if (Object.keys(multiPartnerEdit.drafts).length > 0) {
                          setMultiPartnerEdit(prev => prev ? { ...prev, showExitConfirm: true } : null);
                        } else {
                          window.history.replaceState(null, '', `/${TAB_CONFIG.partners.path}/`);
                          setMultiPartnerEdit(null);
                        }
                      }}
                      className="px-4 sm:px-10 py-3 sm:py-5 bg-white/5 text-text-dim hover:text-white border border-white/10 rounded-[20px] sm:rounded-[28px] text-[10px] sm:text-sm font-black uppercase tracking-[0.2em] transition-all hover:bg-white/10"
                    >
                      Thoát
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
                          window.history.replaceState(null, '', `/${TAB_CONFIG.partners.path}/`);
                          setMultiPartnerEdit(null);
                        } catch (err) {
                          toast("Lỗi đồng bộ dữ liệu", "error");
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={Object.keys(multiPartnerEdit.drafts).length === 0 || isProcessing}
                      className={cn(
                        "px-6 sm:px-12 py-3 sm:py-5 rounded-[20px] sm:rounded-[28px] text-[10px] sm:text-sm font-black tracking-[0.2em] uppercase shadow-[0_20px_50px_rgba(249,115,22,0.3)] transition-all active:scale-95 flex items-center gap-2 sm:gap-4 shrink-0",
                        Object.keys(multiPartnerEdit.drafts).length > 0
                          ? "bg-primary text-white hover:translate-y-[-4px]"
                          : "bg-white/5 text-text-dim cursor-not-allowed opacity-40"
                      )}
                    >
                      {isProcessing ? <Loader2 className="size-4 sm:size-5 animate-spin" /> : <Save className="size-4 sm:size-5" />}
                      Lưu tất cả ({Object.keys(multiPartnerEdit.drafts).length})
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
                    window.history.replaceState(null, '', `/${TAB_CONFIG.partners.path}/`);
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
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-8 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setIsInvoiceSelectorOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="bg-card-dark w-full max-w-[1240px] h-[91vh] md:h-[90vh] rounded-t-[32px] md:rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-border-dark"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b border-border-dark flex items-center justify-between bg-white/5 relative z-50 shadow-sm shrink-0 pt-5 sm:pt-6 md:pt-6">
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

      {editingContractOcr && (
        <ContractUploadView
          editMode={true}
          initialData={editingContractOcr.formData}
          initialFileUrl={editingContractOcr.formData?._pdfUrl}
          initialFileName={editingContractOcr.fileName}
          contractId={editingContractOcr.id}
          onBack={() => setEditingContractOcr(null)}
          onSave={async (updatedData) => {
            await handleUpdateContractOCR(editingContractOcr.id, updatedData);
          }}
        />
      )}

      <AnimatePresence>
        {isVatConfigOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setIsVatConfigOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card-dark w-full max-w-[600px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border-dark p-6"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border-dark">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-md">
                    <Settings2 className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white uppercase tracking-wider">Cấu hình VAT theo Từ khóa</h2>
                    <p className="text-[10px] text-text-dim mt-0.5 font-bold uppercase tracking-wider">Tự động hóa mức thuế suất theo nội dung</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsVatConfigOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-text-dim hover:text-white transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="py-4 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar select-text">
                <p className="text-xs text-text-dim leading-relaxed">
                  Thiết lập các từ khóa nhận diện. Khi bạn nhập Nội dung có chứa từ khóa này, hệ thống sẽ tự động tính VAT tương ứng.
                </p>

                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-text-dim uppercase tracking-wider px-2">
                    <div className="col-span-7">Từ khóa</div>
                    <div className="col-span-3 text-right">Thuế suất (%)</div>
                    <div className="col-span-2"></div>
                  </div>

                  <div className="space-y-2">
                    {localVatConfig.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white/5 p-2 rounded-xl border border-white/5">
                        <div className="col-span-7">
                          <input
                            type="text"
                            value={item.keyword}
                            placeholder="Ví dụ: cát, đá, bê tông..."
                            onChange={(e) => handleLocalVatConfigChange(idx, 'keyword', e.target.value)}
                            className="w-full bg-black/20 border border-border-dark/60 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary/50 transition-colors font-bold"
                          />
                        </div>
                        <div className="col-span-3">
                          <select
                            value={item.rate}
                            onChange={(e) => handleLocalVatConfigChange(idx, 'rate', parseInt(e.target.value) || 0)}
                            className="w-full bg-black/20 border border-border-dark/60 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-primary/50 transition-colors font-bold text-right cursor-pointer"
                          >
                            <option value={8}>8%</option>
                            <option value={10}>10%</option>
                            <option value={0}>0%</option>
                          </select>
                        </div>
                        <div className="col-span-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLocalVatConfig(idx)}
                            className="p-1.5 text-text-dim hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all active:scale-90"
                            title="Xóa cấu hình"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddLocalVatConfig}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-dashed border-border-dark hover:border-primary/50 text-text-dim hover:text-primary rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="size-3.5" /> Thêm từ khóa mới
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-border-dark flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsVatConfigOpen(false)}
                  className="px-4 py-2 bg-transparent hover:bg-white/5 border border-border-dark text-text-dim hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSaveVatConfig}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="size-3.5" /> Lưu cấu hình
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Popup hoàn thành OCR hàng loạt */}
      <AnimatePresence>
        {showOcrBatchCompleteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card-dark w-full max-w-[480px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border-dark p-6 text-center select-none"
            >
              <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/5">
                <CheckCircle2 className="size-8 text-emerald-400" />
              </div>
              
              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">
                Hoàn thành trích xuất hàng loạt
              </h3>
              
              <p className="text-xs text-text-dim leading-relaxed mb-6 font-medium">
                Đã tự động bóc tách và lưu thành công {batchOcrCount} hợp đồng vào hệ thống CSDL. Bạn có thể kiểm tra lại danh sách hồ sơ AI.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowOcrBatchCompleteModal(false);
                    handleTabChange('dossier');
                  }}
                  className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Briefcase className="size-4" />
                  Đi tới Quản lý hợp đồng
                </button>
                
                <button
                  onClick={() => {
                    setShowOcrBatchCompleteModal(false);
                    setOcrQueue([]);
                    setBatchOcrCount(0);
                  }}
                  className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-text-dim hover:text-white border border-border-dark rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                >
                  Đóng thông báo
                </button>
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