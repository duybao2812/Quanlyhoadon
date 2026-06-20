import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  DollarSign,
  PenTool,
  Trash2,
  Download,
  ExternalLink,
  Edit2,
  Plus,
  Search,
  Building,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Save,
  Briefcase,
  MoreVertical,
  AlertCircle,
  Clock,
  Cog,
  Sparkles,
  Construction,
  Box,
  Printer,
  Share2,
  Globe,
  Upload,
  UploadCloud,
  Settings2,
  X,
  List,
  Loader2,
  CheckCircle2,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatVNNumber } from '../../lib/utils';
import { useToast } from '../Notifications';
import { Partner, SmartContract } from '../../types/appTypes';
import { formatThousands, numberToVietnameseWords } from '../../lib/contractUtils';

﻿const extractValueFromTable = (markdownStr: string): string => {
  if (!markdownStr) return '';
  const lines = markdownStr.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line.includes('|')) continue;
    const upperLine = line.toUpperCase();
    if (
      upperLine.includes('TỔNG CỘNG') ||
      upperLine.includes('TONG CONG') ||
      upperLine.includes('CỘNG') ||
      upperLine.includes('CONG') ||
      upperLine.includes('TOTAL') ||
      upperLine.includes('THANH TOÁN') ||
      upperLine.includes('THANH TOAN')
    ) {
      const cells = line.split('|').map(c => c.trim());
      for (let j = cells.length - 1; j >= 0; j--) {
        const cell = cells[j];
        if (!cell) continue;
        const cleaned = cell.replace(/[^0-9]/g, '');
        if (cleaned.length > 0) {
          const valNum = parseInt(cleaned, 10);
          if (valNum > 0) {
            return cell;
          }
        }
      }
    }
  }
  return '';
};

const getContractValueStandalone = (data: Record<string, string>) => {
  if (!data) return '';
  
  // Kiem tra key camelCase tu OCR Mistral truoc
  if ((data as any).value !== undefined && (data as any).value !== null) {
    const v = (data as any).value;
    if (typeof v === 'number') {
      if (v > 0) return v.toLocaleString('de-DE');
    } else {
      const clean = String(v).replace(/\D/g, '');
      if (clean && clean !== '0') {
        return parseInt(clean, 10).toLocaleString('de-DE');
      }
    }
  }

  const searchTerms = ['GIATRI', 'GIATRIHOPDONG', 'GIA_TRI', 'SOTIEN', 'SO_TIEN', 'TONG_TIEN', 'THANH_TIEN', 'PHI', 'GIA_TRI_HD', 'PHI_DICH_VU'];
  const cleanData: Record<string, string> = {};
  for (const [key, val] of Object.entries(data)) {
    const cleanKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
    cleanData[cleanKey] = val;
  }

  // Helper to check if a value looks like a table/markdown/list instead of a numeric/text value
  const isTableOrList = (val: string) => {
    if (!val) return true;
    const trimmed = val.trim();
    return trimmed.includes('|') || trimmed.includes('\n') || trimmed.includes('<w:tbl');
  };

  for (const term of searchTerms) {
    const cleanTerm = term.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const val = cleanData[cleanTerm];
    if (val && val.trim() && !isTableOrList(val)) {
      return val.trim();
    }
  }

  for (const [k, val] of Object.entries(cleanData)) {
    if ((k.includes('GIATRI') || k.includes('SOTIEN') || k.includes('THANHTIEN')) && val && val.trim() && !isTableOrList(val)) {
      return val.trim();
    }
  }

  // Fallback: search for any fields that might contain a table and extract the total value
  for (const [k, val] of Object.entries(cleanData)) {
    if ((k.includes('BANG') || k.includes('GIATRI') || k.includes('SOTIEN') || k.includes('THANHTIEN')) && val && val.trim()) {
      const extracted = extractValueFromTable(val);
      if (extracted) {
        return extracted;
      }
    }
  }

  return '';
};

export const getContractSignDateStandalone = (data: Record<string, string>, createdAt?: any) => {
  if (!data) return '';

  // Kiểm tra key camelCase từ OCR Mistral trước
  if ((data as any).contractDate && String((data as any).contractDate).trim()) {
    const v = String((data as any).contractDate).trim();
    if (v.match(/^\d{4}-\d{2}-\d{2}/)) {
      const parts = v.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return v;
  }

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

  // Fallback về ngày tạo hợp đồng nếu ngày ký trống
  if (createdAt) {
    try {
      const dateObj = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
      return dateObj.toLocaleDateString('vi-VN');
    } catch (_) {}
  }

  // Fallback cuối: ngày hiện tại
  return new Date().toLocaleDateString('vi-VN');
};

const getContractNumberStandalone = (data: Record<string, string>) => {
  if (!data) return '';
  // Kiểm tra trực tiếp key camelCase từ OCR Mistral trước
  if ((data as any).contractNumber && String((data as any).contractNumber).trim()) {
    return String((data as any).contractNumber).trim();
  }
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
  // Kiem tra truc tiep key projectName truoc (vi du tu hop dong AI)
  if (data.projectName && data.projectName.trim()) {
    return data.projectName.trim();
  }
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
  if (valStr.includes('|') || valStr.includes('\n')) {
    const extracted = extractValueFromTable(valStr);
    if (extracted) {
      const cleaned = extracted.replace(/[^0-9]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  }
  const cleaned = valStr.replace(/[^0-9]/g, '');
  return parseFloat(cleaned) || 0;
};

const formatCurrencyStandalone = (val: number) => {
  return val.toLocaleString('vi-VN') + ' đ';
};

// --- View: Contract Management ---
export const ContractManagementCard = ({
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
  formatCurrency,
  onEditOcr
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

      // Neu chua co invoices, tu dong tao tu values (cac loai gia tri hop dong)
      if (!loadedInvoices || loadedInvoices.length === 0) {
        const defaultItems = [];
        if (contract.formData.value) {
          defaultItems.push({
            id: `ocr_val_${Math.random().toString(36).slice(2, 7)}`,
            noidung: 'Giá trị hợp đồng',
            donvi: 'Gói',
            soluong: '1',
            dongia: Number(contract.formData.value),
            amount: Number(contract.formData.value)
          });
        }
        if (Array.isArray(contract.formData.values)) {
          contract.formData.values.forEach((v: any, i: number) => {
            if (v.type && v.value) {
              if (/tổng giá trị|giá trị hợp đồng/i.test(v.type)) return;
              defaultItems.push({
                id: `ocr_sub_${i}_${Math.random().toString(36).slice(2, 7)}`,
                noidung: v.type,
                donvi: 'Lần',
                soluong: '1',
                dongia: Number(v.value),
                amount: Number(v.value)
              });
            }
          });
        }
        if (defaultItems.length > 0) {
          loadedInvoices = defaultItems;
        }
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
    if (contract.contractType === 'ocr_pdf') return 0;
    return Math.round(subtotalSum * 0.08);
  }, [contract.contractType, subtotalSum]);

  const totalInvoiceSum = useMemo(() => {
    if (contract.contractType === 'ocr_pdf') {
      const ocrContractValueRow = invoices.find(inv => /giá trị hợp đồng/i.test(inv.noidung || ''));
      if (ocrContractValueRow) {
        return Number(ocrContractValueRow.amount) || Number(ocrContractValueRow.dongia) || 0;
      }
      return Number(contract.formData.value) || 0;
    }
    return subtotalSum + vatSum;
  }, [contract.contractType, contract.formData.value, invoices, subtotalSum, vatSum]);

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

    // --- Regenerate table markdown string based on current valid invoices list ---
    const template = contract.templateId;
    let markdownTable = '';
    const validInvoices = invoices.filter(inv => {
      const dongia = inv.dongia !== undefined ? Number(inv.dongia) : (Number(inv.amount) || 0);
      const amount = inv.amount !== undefined ? Number(inv.amount) : 0;
      return dongia > 0 || amount > 0;
    });

    const cleanSubtotalSum = validInvoices.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const cleanVatSum = Math.round(cleanSubtotalSum * 0.08);
    const cleanTotalInvoiceSum = cleanSubtotalSum + cleanVatSum;

    if (template === 'HDCM') {
      markdownTable = "| STT | NỘI DUNG | ĐVT | KHỐI LƯỢNG | ĐƠN GIÁ VNĐ | THỜI GIAN THUÊ (tháng) | THÀNH TIỀN | VAT 8% | TỔNG CỘNG |\n";
      markdownTable += "|:---:|:---|:---:|---:|---:|---:|---:|---:|---:|\n";
      let count = 1;
      validInvoices.forEach(inv => {
        const noidung = inv.noidung !== undefined ? inv.noidung : (inv.number || inv.note || '');
        const donvi = inv.donvi !== undefined ? inv.donvi : '';
        const soluong = inv.soluong !== undefined ? inv.soluong : '1';
        const dongia = inv.dongia !== undefined ? inv.dongia : (inv.amount || 0);
        const amount = inv.amount !== undefined ? inv.amount : 0;
        const vat8 = Math.round(amount * 0.08);
        const tongCong = amount + vat8;
        markdownTable += `| ${count++} | ${noidung} | ${donvi} | ${soluong} | ${formatThousands(String(dongia))} | 1 | ${formatThousands(String(amount))} | ${formatThousands(String(vat8))} | ${formatThousands(String(tongCong))} |\n`;
      });
      markdownTable += `| | Tổng cộng | | | | | ${formatThousands(String(cleanSubtotalSum))} | ${formatThousands(String(cleanVatSum))} | ${formatThousands(String(cleanTotalInvoiceSum))} |`;
    } else if (template === 'HDNT') {
      markdownTable = "| STT | Nội dung | ĐVT | Khối lượng | Đơn giá (VNĐ) | Thành tiền | VAT 8% | VAT 10% | Tổng cộng |\n";
      markdownTable += "|:---:|:---|:---:|---:|---:|---:|---:|---:|---:|\n";
      let count = 1;
      validInvoices.forEach(inv => {
        const noidung = inv.noidung !== undefined ? inv.noidung : (inv.number || inv.note || '');
        const donvi = inv.donvi !== undefined ? inv.donvi : '';
        const soluong = inv.soluong !== undefined ? inv.soluong : '1';
        const dongia = inv.dongia !== undefined ? inv.dongia : (inv.amount || 0);
        const amount = inv.amount !== undefined ? inv.amount : 0;
        const vat8 = Math.round(amount * 0.08);
        const tongCong = amount + vat8;
        markdownTable += `| ${count++} | ${noidung} | ${donvi} | ${soluong} | ${formatThousands(String(dongia))} | ${formatThousands(String(amount))} | ${formatThousands(String(vat8))} | - | ${formatThousands(String(tongCong))} |\n`;
      });
      markdownTable += `| | Tổng cộng | | | | ${formatThousands(String(cleanSubtotalSum))} | ${formatThousands(String(cleanVatSum))} | - | ${formatThousands(String(cleanTotalInvoiceSum))} |`;
    } else {
      markdownTable = "| STT | Nội dung hàng hóa, dịch vụ | ĐVT | Số lượng | Đơn giá | Thành tiền |\n";
      markdownTable += "|:---:|:---|:---:|---:|---:|---:|\n";
      let count = 1;
      validInvoices.forEach(inv => {
        const noidung = inv.noidung !== undefined ? inv.noidung : (inv.number || inv.note || '');
        const donvi = inv.donvi !== undefined ? inv.donvi : '';
        const soluong = inv.soluong !== undefined ? inv.soluong : '1';
        const dongia = inv.dongia !== undefined ? inv.dongia : (inv.amount || 0);
        const amount = inv.amount !== undefined ? inv.amount : 0;
        markdownTable += `| ${count++} | ${noidung} | ${donvi} | ${soluong} | ${formatThousands(String(dongia))} | ${formatThousands(String(amount))} |\n`;
      });
      markdownTable += `| | TỔNG CỘNG TIỀN HÀNG | | | | ${formatThousands(String(cleanSubtotalSum))} |\n`;
      markdownTable += `| | THUẾ GIÁ TRỊ GIA TĂNG (8%) | | | | ${formatThousands(String(cleanVatSum))} |\n`;
      markdownTable += `| | TỔNG CỘNG TIỀN THANH TOÁN | | | | ${formatThousands(String(cleanTotalInvoiceSum))} |`;
    }

    const tableTag = Object.keys(contract.formData).find(t => {
      const u = t.toUpperCase();
      return (u.includes('BANG') || u.includes('TABLE')) && !u.includes('BANG_CHU') && !u.includes('BANGCHU');
    });
    if (tableTag) {
      nextData[tableTag] = markdownTable;
      // Re-trigger update to include the updated table tag
      if (onUpdateFormData) {
        await onUpdateFormData(contract.id, nextData);
      }
    }
    // ----------------------------------------------------------------------

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

  // Tìm đối tác từ partyId; nếu chưa liên kết thì lấy từ formData OCR
  const partnerA = partners.find(p => p.id === contract.partyAId) || {
    name: contract.formData?.partyA?.name || contract.formData?.BENA || 'Chưa cập nhật',
    address: contract.formData?.partyA?.address || '---',
    taxCode: contract.formData?.partyA?.taxCode || '---',
    representative: contract.formData?.partyA?.representative || '---'
  };
  const partnerB = partners.find(p => p.id === contract.partyBId) || {
    name: contract.formData?.partyB?.name || contract.formData?.BENB || 'Chưa cập nhật',
    address: contract.formData?.partyB?.address || '---',
    taxCode: contract.formData?.partyB?.taxCode || '---',
    representative: contract.formData?.partyB?.representative || '---'
  };

  const contractValue = getContractValue(contract.formData);
  const contractNumber = getContractNumber(contract.formData);
  const signDate = getContractSignDate(contract.formData, contract.createdAt);
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

  const getContractIcon = (templateId: string, contractType?: string) => {
    const isAi = contractType === 'ocr_pdf';
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
      onClick={(e) => {
        if (contract.contractType === 'ocr_pdf') {
          onEditOcr?.(contract);
        } else {
          toggleExpand();
        }
      }}
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
          {getContractIcon(contract.templateId, contract.contractType)}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-white whitespace-normal break-words leading-tight hover:text-primary transition-colors">
              {contract.fileName}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[10px] text-text-dim font-bold whitespace-nowrap">ID: {contract.id.slice(-6).toUpperCase()}</span>
              {getContractTag(contract.templateId)}
              {contract.contractType === 'ocr_pdf' && (
                <span className="text-[9px] font-black bg-purple-500/20 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded-lg uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
                  <Sparkles className="size-2.5 text-purple-400 animate-pulse" />
                  Hồ sơ AI
                </span>
              )}
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
                      <span className="text-text-dim block font-bold">
                        {contract.contractType === 'ocr_pdf' ? 'Tài liệu lưu trữ (PDF):' : 'Tài liệu lưu trữ (.docx):'}
                      </span>
                      {contract.contractType === 'ocr_pdf' ? (
                        contract.formData?._pdfUrl ? (
                          <div className="flex items-center justify-between bg-purple-500/5 border border-purple-500/20 hover:border-purple-500/40 rounded-xl p-2.5 transition-all group/drive">
                            <div
                              className="flex items-center gap-3 min-w-0 cursor-pointer"
                              onClick={() => onEditOcr?.(contract)}
                            >
                              <div className="size-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 shrink-0 shadow-lg group-hover/drive:bg-purple-500 group-hover/drive:text-white transition-all duration-300">
                                <FileText className="size-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-white whitespace-normal break-words text-xs block leading-tight group-hover/drive:text-purple-400 transition-colors" title={contract.fileName}>
                                  {contract.fileName}
                                </span>
                                <span className="text-[9px] font-black text-purple-400/80 uppercase tracking-widest block mt-1">
                                  HỒ SƠ AI PDF
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <a
                                href={contract.formData._pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-purple-400 hover:text-white bg-purple-500/10 hover:bg-purple-500 rounded-xl border border-purple-500/20 transition-all duration-300 shrink-0 flex items-center justify-center"
                                title="Mở bản quét PDF trên Google Drive"
                              >
                                <ExternalLink className="size-4" />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-text-dim/60 italic p-3 bg-black/20 rounded-xl border border-border-dark/60">
                            Khong tim thay file PDF
                          </div>
                        )
                      ) : contract.formData?._driveUrl ? (
                        <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl p-2.5 transition-all group/drive">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0 shadow-lg group-hover/drive:bg-emerald-500 group-hover/drive:text-white transition-all duration-300">
                              <Globe className="size-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-white whitespace-normal break-words text-xs block leading-tight group-hover/drive:text-emerald-400 transition-colors" title={contract.fileName}>
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
                            <span className="font-bold text-white whitespace-normal break-words text-xs" title={contract.fileName}>
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
                          <div
                            className="flex items-center gap-3 min-w-0 cursor-pointer"
                            onClick={() => {
                              if (contract.contractType === 'ocr_pdf') {
                                onEditOcr?.(contract);
                              } else {
                                window.open(contract.formData._pdfUrl, '_blank');
                              }
                            }}
                          >
                            <div className="size-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-400 shrink-0 shadow-lg group-hover/pdf:bg-red-500 group-hover/pdf:text-white transition-all duration-300">
                              <FileText className="size-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-white whitespace-normal break-words text-xs block leading-tight group-hover/pdf:text-red-400 transition-colors">
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
              className="bg-card-dark rounded-[32px] shadow-[0_50px_100px_rgba(0,0,0,0.6)] w-full max-w-8xl overflow-hidden border border-white/10 flex flex-col h-[95vh] max-h-[95vh]"
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
                    <span className="text-white font-extrabold whitespace-normal break-words line-clamp-2" title={partnerA.name}>
                      {partnerA.name || '---'}
                    </span>
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1 border-l border-white/5 pl-4 md:pl-6">
                    <span className="text-[9px] font-black uppercase tracking-wider text-text-dim/50 block">Bên B (Đại Diện)</span>
                    <span className="text-white font-extrabold whitespace-normal break-words line-clamp-2" title={partnerB.name}>
                      {partnerB.name || '---'}
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
                            <tr className="border-b border-border-dark bg-white/5 font-black text-[10px] uppercase tracking-wider text-text-dim whitespace-nowrap">
                              <th className="p-3 w-12 text-center">STT</th>
                              <th className="p-3 min-w-[250px]">Nội dung hàng hóa, dịch vụ</th>
                              <th className="p-3 w-20 text-center">ĐVT</th>
                              <th className="p-3 w-24 text-center">Số lượng</th>
                              <th className="p-3 w-36 text-right">Đơn giá (đ)</th>
                              <th className="p-3 w-40 text-right">Thành tiền (đ)</th>
                              <th className="p-3 w-16 text-center">Xóa</th>
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
                            {contract.contractType !== 'ocr_pdf' && (
                              <>
                                <tr className="border-b border-border-dark/60 bg-white/5 font-black text-xs">
                                  <td className="p-3 text-center"></td>
                                  <td className="p-3 uppercase tracking-wider text-text-dim font-bold" colSpan={4}>TỔNG CỘNG TIỀN HÀNG</td>
                                  <td className="p-3 text-right text-white font-black whitespace-nowrap">{formatCurrency(subtotalSum)}</td>
                                  <td className="p-3"></td>
                                </tr>
                                <tr className="border-b border-border-dark/60 bg-white/5 font-black text-xs">
                                  <td className="p-3 text-center"></td>
                                  <td className="p-3 uppercase tracking-wider text-text-dim font-bold" colSpan={4}>THUẾ GIÁ TRỊ GIA TĂNG (8%)</td>
                                  <td className="p-3 text-right text-white font-black whitespace-nowrap">{formatCurrency(vatSum)}</td>
                                  <td className="p-3"></td>
                                </tr>
                                <tr className="border-b border-border-dark bg-white/10 font-black text-xs text-[#FF7A00]">
                                  <td className="p-3 text-center"></td>
                                  <td className="p-3 uppercase tracking-widest font-black" colSpan={4}>TỔNG CỘNG TIỀN THANH TOÁN</td>
                                  <td className="p-3 text-right font-black text-sm whitespace-nowrap">{formatCurrency(totalInvoiceSum)}</td>
                                  <td className="p-3"></td>
                                </tr>
                              </>
                            )}
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

export const ContractManagementView = ({
  contracts,
  partners,
  onDelete,
  onBulkDelete,
  searchTerm,
  onSearchChange,
  onDownload,
  onUpdateFormData,
  onEditOcr
}: {
  contracts: SmartContract[],
  partners: Partner[],
  onDelete: (id: string) => void,
  onBulkDelete: (ids: string[]) => void,
  searchTerm: string,
  onSearchChange: (val: string) => void,
  onDownload: (contract: SmartContract) => void,
  onUpdateFormData?: (id: string, updatedFormData: Record<string, string>) => void,
  onEditOcr?: (contract: SmartContract) => void
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
  const getContractSignDate = (data: Record<string, string>, createdAt?: any) => getContractSignDateStandalone(data, createdAt);
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
                onEditOcr={onEditOcr}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
