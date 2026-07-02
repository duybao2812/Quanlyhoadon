import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Clock,
  Users,
  FileText,
  ShieldCheck,
  Loader2,
  Library,
  RefreshCw,
  Package,
  Download,
  Search,
  Filter,
  X,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  History,
  Edit3,
  Zap,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import { parseInvoiceXml } from '../../lib/xmlParser';
import { generateDocxBlob } from '../../lib/docxGenerator';
import { cn, formatVNNumber, executeSecureExport, getTemplateBuffer, mapInvoiceToSupabase } from '../../lib/utils';
import { classifyInvoice } from '../../services/mistral';
import { useToast } from '../Notifications';
import { Skeleton, getEnrichedInvoice, parseInvoiceDate } from '../Invoice/ReviewModal';
import { GeneratedDoc, SmartContract, Invoice, Partner, Tab } from '../../types/appTypes';
import { DashboardInvoiceList } from './DashboardInvoiceList';
import { ExtendedInvoiceItem } from './demoData';

﻿export const DashboardView = ({
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
  setFileSearchTerm,
  contractUploadMode,
  setContractUploadMode,
  showContractUpload,
  setShowContractUpload,
  onTabChange,
  onEditOcr,
  activeTab
}: {
  stats: any,
  user: any,
  onSelectInvoice: (inv: any) => void,
  onDeleteInvoice: (id: string) => void,
  onExportExcel: () => void,
  onBulkExport: () => void,
  isExportingExcel: boolean,
  isLoadingData: boolean,
  subTab: 'invoices',
  onSubTabChange: (tab: 'invoices') => void,
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
  setFileSearchTerm: (term: string) => void,
  contractUploadMode?: 'ocr' | 'editor',
  setContractUploadMode?: (mode: 'ocr' | 'editor') => void,
  showContractUpload?: boolean,
  setShowContractUpload?: (show: boolean) => void,
  onTabChange?: (tab: any) => void,
  onEditOcr?: (contract: SmartContract) => void,
  activeTab: Tab
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

      // Xuat file an toan dung showSaveFilePicker
      executeSecureExport(`${tType}_${inv.fileName.split('.')[0]}.docx`, blob, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

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
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pb-20">
            {/* Left/Main Column - Invoices */}
            <div className="xl:col-span-2 space-y-6">
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

                {/* Mobile-Only Search Input */}
                <div className="md:hidden w-full relative group">
                  <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm hóa đơn (PDF & XML)..."
                    value={fileSearchTerm}
                    onChange={(e) => setFileSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-black/40 border border-border-dark rounded-2xl text-xs focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all font-bold text-white placeholder:text-text-dim shadow-inner"
                  />
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
                        className="fixed inset-x-4 bottom-20 md:absolute md:top-[calc(100%+12px)] md:right-0 md:inset-x-auto md:w-[450px] md:bottom-auto max-h-[70vh] md:max-h-[620px] bg-[#1E1E1E] border border-border-dark rounded-[32px] shadow-2xl p-5 md:p-6 z-[99] space-y-4 md:space-y-6 text-left overflow-y-auto custom-scrollbar flex flex-col pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] md:pb-6"
                      >
                        {/* Mobile Header Close */}
                        <div className="flex md:hidden justify-between items-center pb-3 border-b border-white/5 shrink-0 select-none">
                          <span className="text-[10px] font-black uppercase text-white tracking-widest">Bộ lọc thông minh</span>
                          <button 
                            type="button" 
                            onClick={() => setIsFilterOpen(false)} 
                            className="size-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-text-dim hover:text-white transition-all"
                          >
                            <X className="size-4" />
                          </button>
                        </div>

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

            {/* Right/Side Column - Bento Extra Widgets */}
            <div className="xl:col-span-1 space-y-6">
              {/* Contract Panel */}
              <div className="bg-sidebar-dark/40 p-6 rounded-3xl border border-border-dark shadow-xl space-y-4 hover:border-violet-500/20 transition-all duration-300">
                 <h4 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                   <Zap size={14} className="text-violet-400 animate-pulse" />
                   Hợp đồng gần đây
                 </h4>
                 {contracts.length === 0 ? (
                   <div className="text-xs text-text-dim italic">Chưa có hợp đồng nào</div>
                 ) : (
                   <div className="space-y-3">
                     {contracts.slice(0, 4).map(c => (
                       <div key={c.id} className="p-3 bg-white/5 border border-border-dark/60 rounded-xl flex flex-col gap-1 hover:border-violet-500/30 transition-all cursor-pointer">
                         <div className="flex justify-between items-center">
                           <span className="text-xs font-bold text-white truncate max-w-[180px]">{c.fileName || 'Hợp đồng không tên'}</span>
                           <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0">{c.contractType === 'ocr_pdf' ? 'PDF OCR' : 'Word Docx'}</span>
                         </div>
                         <div className="text-[10px] text-text-dim flex justify-between">
                           <span>Mã bên A: {c.partyAId || 'N/A'}</span>
                           <span>Phân loại: {c.documentType === 'incoming' ? 'Đầu vào' : c.documentType === 'outgoing' ? 'Đầu ra' : 'Hợp đồng'}</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>

              {/* Partner Panel */}
              <div className="bg-sidebar-dark/40 p-6 rounded-3xl border border-border-dark shadow-xl space-y-4 hover:border-amber-500/20 transition-all duration-300">
                 <h4 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                   <Users size={14} className="text-amber-400" />
                   Đối tác nổi bật
                 </h4>
                 {partners.length === 0 ? (
                   <div className="text-xs text-text-dim italic">Chưa có đối tác nào</div>
                 ) : (
                   <div className="space-y-3">
                     {partners.slice(0, 4).map(p => (
                       <div key={p.id} className="p-3 bg-white/5 border border-border-dark/60 rounded-xl flex flex-col gap-1 hover:border-amber-500/30 transition-all cursor-pointer">
                         <span className="text-xs font-bold text-white truncate">{p.name}</span>
                         <div className="text-[10px] text-text-dim flex justify-between">
                           <span>MST: {p.taxCode}</span>
                           <span>Đại diện: {p.representative || '---'}</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>

              {/* Quick AI & Storage Widget */}
              <div className="bg-sidebar-dark/40 p-6 rounded-3xl border border-border-dark shadow-xl space-y-4 hover:border-rose-500/20 transition-all duration-300">
                 <h4 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                   <Cpu size={14} className="text-rose-400" />
                   Xử lý thông minh AI
                 </h4>
                 <div className="space-y-3">
                   <div className="p-3 bg-white/5 border border-border-dark/60 rounded-xl flex items-center justify-between">
                     <span className="text-xs font-bold text-text-dim">Mô hình AI trích xuất</span>
                     <span className="text-[10px] font-black uppercase tracking-wider text-white bg-rose-500/15 border border-rose-500/20 px-2 py-0.5 rounded-lg">Mistral Large</span>
                   </div>
                   <div className="p-3 bg-white/5 border border-border-dark/60 rounded-xl flex items-center justify-between">
                     <span className="text-xs font-bold text-text-dim">Hồ sơ đã tự động hóa</span>
                     <span className="text-[10px] font-black text-white bg-green-500/15 border border-green-500/20 px-2 py-0.5 rounded-lg">{generatedDocs.length} tệp</span>
                   </div>
                 </div>
              </div>
            </div>
          </div>
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
