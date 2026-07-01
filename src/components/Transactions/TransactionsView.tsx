import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Landmark,
  RefreshCw,
  Link2,
  Link2Off,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Info,
  Check,
  Search,
  FileSpreadsheet,
  Hash,
  TrendingUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useToast } from '../Notifications';

interface BankAccount {
  id: string;
  owner_id: string;
  bank_name: string;
  account_number: string;
  created_at: string;
}

interface BankTransaction {
  id: string;
  owner_id: string | null;
  gateway: string;
  transaction_date: string;
  account_number: string;
  sub_account: string | null;
  amount_in: number;
  amount_out: number;
  accumulated: number;
  code: string | null;
  content: string;
  reference_number: string;
  body: string | null;
  matched_invoice_id: string | null;
  match_status: 'matched' | 'unmatched';
  created_at: string;
}

interface TransactionsViewProps {
  ownerId: string;
}

// Định dạng số tiền VND
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

// Định dạng ngày hiển thị
function formatDisplayDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function formatDisplayDateOnly(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

// Định dạng badge màu sắc khác biệt cho từng tài khoản ngân hàng nhận tiền
function getAccountBadgeStyle(gateway: string, accountNumber: string): string {
  const gLower = (gateway || '').toLowerCase();
  
  if (gLower.includes('acb')) {
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  }
  if (gLower.includes('vcb') || gLower.includes('vietcom')) {
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  }
  if (gLower.includes('tcb') || gLower.includes('techcom')) {
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  }
  if (gLower.includes('mb') || gLower.includes('mbbank')) {
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  }
  if (gLower.includes('vtb') || gLower.includes('vietin')) {
    return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
  }
  if (gLower.includes('bidv')) {
    return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
  }
  if (gLower.includes('tpb') || gLower.includes('tpbank')) {
    return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  }
  
  // Tạo màu sắc ngẫu nhiên nhưng cố định dựa trên số tài khoản
  const hash = accountNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'bg-pink-500/10 text-pink-400 border-pink-500/20',
    'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    'bg-teal-500/10 text-teal-400 border-teal-500/20'
  ];
  return colors[hash % colors.length];
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ ownerId }) => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // States cho Form liên kết tài khoản mới
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterQuarter, setFilterQuarter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lấy danh sách các năm xuất hiện trong các giao dịch
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach(tx => {
      if (tx.transaction_date) {
        const year = new Date(tx.transaction_date).getFullYear();
        if (!isNaN(year)) {
          years.add(year);
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Danh sách ngân hàng phổ biến
  const popularBanks = [
    'Vietcombank', 'MBBank', 'Techcombank', 'VietinBank', 
    'BIDV', 'ACB', 'VPBank', 'Sacombank', 'TPBank', 'VIB'
  ];

  // Tải dữ liệu từ backend
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/transactions/status?ownerId=${ownerId}`);
      if (!res.ok) {
        let errMsg = 'Không thể kết nối đến máy chủ.';
        try {
          const errData = await res.json();
          if (errData && (errData.details || errData.error)) {
            errMsg = errData.details || errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      setAccounts(data.accounts || []);
      setTransactions(data.transactions || []);
    } catch (err: any) {
      console.error('[TRANSACTIONS] Lỗi tải dữ liệu:', err);
      toast('Lỗi khi tải lịch sử giao dịch: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [ownerId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Làm mới giao dịch thủ công (tải lại DB local)
  const handleRefresh = async () => {
    setIsSyncing(true);
    await fetchData();
    setIsSyncing(false);
    toast('Đã làm mới dữ liệu giao dịch.', 'success');
  };

  // Đăng ký liên kết tài khoản ngân hàng mới
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName || !newAccountNumber.trim()) {
      toast('Vui lòng nhập đầy đủ thông tin tài khoản.', 'error');
      return;
    }

    try {
      setIsSubmittingAccount(true);
      const res = await fetch('/api/bank-accounts/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId,
          bankName: newBankName,
          accountNumber: newAccountNumber.trim()
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.details || result.error || 'Đăng ký tài khoản thất bại.');

      toast('Liên kết tài khoản ngân hàng thành công!', 'success');
      setNewAccountNumber('');
      setNewBankName('');
      setShowAddForm(false);
      fetchData();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  // Hủy liên kết tài khoản ngân hàng
  const handleRemoveAccount = async (accountNumber: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn ngắt liên kết số tài khoản ${accountNumber}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/bank-accounts/unregister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId,
          accountNumber
        })
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.details || result.error || 'Hủy liên kết thất bại.');
      }

      toast('Đã ngắt liên kết tài khoản ngân hàng.', 'info');
      fetchData();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  // Tinh toan so du luy ke thuc te tren giao dien (running balance) cho tung so tai khoan doc lap
  const transactionsWithBalance = useMemo(() => {
    if (transactions.length === 0) return [];
    
    // Phan nhom giao dich theo so tai khoan nhan
    const groups: Record<string, BankTransaction[]> = {};
    transactions.forEach(tx => {
      const acc = tx.account_number || 'unknown';
      if (!groups[acc]) {
        groups[acc] = [];
      }
      groups[acc].push(tx);
    });

    const processedTxs: (BankTransaction & { computedAccumulated: number })[] = [];

    // Tinh toan doc lap cho tung nhom tai khoan
    Object.keys(groups).forEach(acc => {
      const group = groups[acc];
      
      // Sap xep tu cu nhat den moi nhat (ngay tang dan)
      const sorted = [...group].sort((a, b) => 
        new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
      );
      
      const n = sorted.length;
      const balances = new Array(n).fill(null);
      
      // Tim cac diem moc so du thuc te (accumulated > 0) tu database
      for (let i = 0; i < n; i++) {
        const tx = sorted[i];
        if (tx.accumulated && Number(tx.accumulated) > 0) {
          balances[i] = Number(tx.accumulated);
        }
      }
      
      const firstAnchorIdx = balances.findIndex(b => b !== null);
      
      if (firstAnchorIdx !== -1) {
        // 1. Loang nguoc ve phia truoc (tu anchor dau tien tro ve cu nhat)
        let currentBal = balances[firstAnchorIdx];
        for (let i = firstAnchorIdx - 1; i >= 0; i--) {
          const nextTx = sorted[i + 1];
          const isCredit = Number(nextTx.amount_in) > 0;
          const amount = isCredit ? Number(nextTx.amount_in) : Number(nextTx.amount_out);
          if (isCredit) {
            currentBal -= amount;
          } else {
            currentBal += amount;
          }
          balances[i] = currentBal;
        }
        
        // 2. Loang xuoi ve phia sau (tu anchor dau tien tro ve moi nhat)
        currentBal = balances[firstAnchorIdx];
        for (let i = firstAnchorIdx + 1; i < n; i++) {
          if (balances[i] !== null) {
            currentBal = balances[i];
          } else {
            const tx = sorted[i];
            const isCredit = Number(tx.amount_in) > 0;
            const amount = isCredit ? Number(tx.amount_in) : Number(tx.amount_out);
            if (isCredit) {
              currentBal += amount;
            } else {
              currentBal -= amount;
            }
            balances[i] = currentBal;
          }
        }
      } else {
        // Neu khong co diem moc nao khac 0, mac dinh loang tu 0 di len
        let currentBal = 0;
        for (let i = 0; i < n; i++) {
          const tx = sorted[i];
          const isCredit = Number(tx.amount_in) > 0;
          const amount = isCredit ? Number(tx.amount_in) : Number(tx.amount_out);
          if (isCredit) {
            currentBal += amount;
          } else {
            currentBal -= amount;
          }
          balances[i] = currentBal;
        }
      }
      
      // Gan lai gia tri
      for (let i = 0; i < n; i++) {
        processedTxs.push({
          ...sorted[i],
          computedAccumulated: balances[i]
        });
      }
    });

    // Sap xep giam dan theo thoi gian de hien thi giao dich moi nhat len dau
    return processedTxs.sort((a, b) => 
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
  }, [transactions]);

  const filteredTransactions = transactionsWithBalance.filter(tx => {
    // 1. Lọc theo tài khoản đã chọn
    if (filterAccount !== 'all' && tx.account_number !== filterAccount) {
      return false;
    }
    
    // 2. Lọc theo loại giao dịch
    if (filterType === 'credit' && Number(tx.amount_in) === 0) {
      return false;
    }
    if (filterType === 'debit' && Number(tx.amount_out) === 0) {
      return false;
    }
    
    // 3. Lọc theo trạng thái đối soát
    if (filterStatus !== 'all' && tx.match_status !== filterStatus) {
      return false;
    }
    
    // 4. Lọc theo Năm
    if (filterYear !== 'all') {
      const txYear = new Date(tx.transaction_date).getFullYear();
      if (txYear !== Number(filterYear)) {
        return false;
      }
    }

    // 5. Lọc theo Quý
    if (filterQuarter !== 'all') {
      const txMonth = new Date(tx.transaction_date).getMonth();
      const txQuarter = Math.floor(txMonth / 3) + 1;
      if (txQuarter !== Number(filterQuarter)) {
        return false;
      }
    }

    // 6. Lọc theo Khoảng ngày (Từ ngày -> Đến ngày)
    if (startDate) {
      const txTime = new Date(tx.transaction_date).getTime();
      const startTime = new Date(startDate).setHours(0, 0, 0, 0);
      if (txTime < startTime) {
        return false;
      }
    }
    if (endDate) {
      const txTime = new Date(tx.transaction_date).getTime();
      const endTime = new Date(endDate).setHours(23, 59, 59, 999);
      if (txTime > endTime) {
        return false;
      }
    }

    // 7. Lọc theo nội dung tìm kiếm
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const contentMatch = (tx.content || '').toLowerCase().includes(q);
      const amountInMatch = String(tx.amount_in || '').includes(q);
      const amountOutMatch = String(tx.amount_out || '').includes(q);
      const refMatch = (tx.reference_number || '').toLowerCase().includes(q);
      const gatewayMatch = (tx.gateway || '').toLowerCase().includes(q);
      const codeMatch = (tx.code || '').toLowerCase().includes(q);
      
      return contentMatch || amountInMatch || amountOutMatch || refMatch || gatewayMatch || codeMatch;
    }
    
    return true;
  });

  // Thống kê dựa trên dữ liệu lọc
  const totalIn = filteredTransactions.reduce((sum, tx) => sum + Number(tx.amount_in), 0);
  const totalOut = filteredTransactions.reduce((sum, tx) => sum + Number(tx.amount_out), 0);
  const matchedCount = filteredTransactions.filter(tx => tx.match_status === 'matched').length;
  const diffAmount = totalIn - totalOut;

  // Xuất file Excel lịch sử giao dịch chuyên nghiệp bằng ExcelJS
  const handleExportExcel = async () => {
    try {
      const sortedTxs = [...filteredTransactions].sort((a, b) => 
        new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
      );

      // Tính tổng thu, tổng chi, chênh lệch
      const totalInExcel = sortedTxs.reduce((sum, tx) => sum + Number(tx.amount_in), 0);
      const totalOutExcel = sortedTxs.reduce((sum, tx) => sum + Number(tx.amount_out), 0);
      const diffExcel = totalInExcel - totalOutExcel;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Nhật ký giao dịch');
      
      // Đảm bảo bật hiển thị đường lưới trong Excel
      worksheet.views = [{ showGridLines: true }];

      // 1. Tiêu đề Báo cáo (Dòng 1)
      worksheet.mergeCells('A1:K1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'BÁO CÁO CHI TIẾT BIẾN ĐỘNG SỐ DƯ TÀI KHOẢN';
      titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F2937' } // Gray-800 sang trọng
      };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 40;

      // 2. Metadata (Dòng 2)
      worksheet.mergeCells('A2:K2');
      const metaCell = worksheet.getCell('A2');
      metaCell.value = `Thời gian xuất: ${formatDisplayDate(new Date().toISOString())} | Tài khoản lọc: ${
        filterAccount === 'all' ? 'TẤT CẢ TÀI KHOẢN' : filterAccount
      }`;
      metaCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } };
      metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(2).height = 20;

      // 3. Khối thẻ Tổng quan (Dòng 3 & 4)
      worksheet.getRow(3).height = 18;
      worksheet.getRow(4).height = 25;

      const borderStyle = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } };

      // Thiết lập ô thẻ
      const setupSummaryCard = (
        headerCells: string,
        valueCells: string,
        headerCellRef: string,
        valueCellRef: string,
        title: string,
        value: number,
        bgColor: string,
        textColor: string
      ) => {
        worksheet.mergeCells(headerCells);
        worksheet.mergeCells(valueCells);

        const hCell = worksheet.getCell(headerCellRef);
        hCell.value = title;
        hCell.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FF4B5563' } };
        hCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        hCell.alignment = { horizontal: 'center', vertical: 'middle' };
        hCell.border = { top: borderStyle, left: borderStyle, right: borderStyle };

        const vCell = worksheet.getCell(valueCellRef);
        vCell.value = value;
        vCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: textColor } };
        vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        vCell.alignment = { horizontal: 'center', vertical: 'middle' };
        vCell.numFmt = '#,##0" đ"';
        vCell.border = { bottom: borderStyle, left: borderStyle, right: borderStyle };
      };

      // Card Tổng Thu (Cột B & C)
      setupSummaryCard('B3:C3', 'B4:C4', 'B3', 'B4', 'TỔNG THU (GHI CÓ)', totalInExcel, 'FFE2F0D9', 'FF2E7D32');

      // Card Tổng Chi (Cột E & F)
      setupSummaryCard('E3:F3', 'E4:F4', 'E3', 'E4', 'TỔNG CHI (GHI NỢ)', totalOutExcel, 'FFFCE4D6', 'FFC62828');

      // Card Chênh Lệch (Cột H & I)
      setupSummaryCard(
        'H3:I3', 
        'H4:I4', 
        'H3', 
        'H4', 
        'CHÊNH LỆCH THU CHI', 
        diffExcel, 
        diffExcel >= 0 ? 'FFE2F0D9' : 'FFFCE4D6', 
        diffExcel >= 0 ? 'FF2E7D32' : 'FFC62828'
      );

      // 4. Bảng Dữ liệu giao dịch (Excel Table chính thống bắt đầu từ Dòng 6)
      const headers = [
        "STT",
        "Thời Gian",
        "Ngân Hàng",
        "Số Tài Khoản",
        "Nội Dung Chuyển Khoản",
        "Số Tiền Ghi Có (Thu)",
        "Số Tiền Ghi Nợ (Chi)",
        "Số Dư Lũy Kế",
        "Mã Giao Dịch",
        "Mã Tham Chiếu",
        "Trạng Thái"
      ];

      // Tạo danh sách các dòng dữ liệu
      const rows = sortedTxs.map((tx, idx) => {
        const isCredit = Number(tx.amount_in) > 0;
        return [
          idx + 1,
          formatDisplayDate(tx.transaction_date),
          tx.gateway,
          tx.account_number,
          tx.content,
          isCredit ? Number(tx.amount_in) : 0,
          !isCredit ? Number(tx.amount_out) : 0,
          Number(tx.computedAccumulated),
          tx.code || '',
          tx.reference_number || '',
          tx.match_status === 'matched' ? 'Đã khớp' : 'Chưa khớp'
        ];
      });

      // Khởi tạo bảng dữ liệu Table (đáp ứng tính năng PivotTable)
      worksheet.addTable({
        name: 'TransactionsTable',
        ref: 'A6',
        headerRow: true,
        totalsRow: false,
        style: {
          theme: 'TableStyleMedium9', // Giao diện bảng hiện đại, chuyên nghiệp
          showRowStripes: true,
        },
        columns: headers.map(h => ({ name: h, filterButton: true })),
        rows: rows
      });

      // Thiết lập độ rộng cột cho từng cột trong worksheet
      worksheet.columns = [
        { key: 'stt', width: 6 },
        { key: 'time', width: 22 },
        { key: 'bank', width: 14 },
        { key: 'acc', width: 18 },
        { key: 'content', width: 50 },
        { key: 'credit', width: 20 },
        { key: 'debit', width: 20 },
        { key: 'balance', width: 20 },
        { key: 'tx_code', width: 16 },
        { key: 'ref', width: 16 },
        { key: 'status', width: 16 }
      ];

      // Cấu hình định dạng căn lề và số tiền cho các ô trong bảng
      const startRow = 7;
      const endRow = 6 + sortedTxs.length;

      for (let r = startRow; r <= endRow; r++) {
        const row = worksheet.getRow(r);
        
        // Định dạng hiển thị tiền tệ
        row.getCell(6).numFmt = '#,##0" đ"';
        row.getCell(7).numFmt = '#,##0" đ"';
        row.getCell(8).numFmt = '#,##0" đ"';

        // Căn lề các ô
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }; // STT
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }; // Thời Gian
        row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }; // Ngân Hàng
        row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' }; // Số Tài Khoản
        row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }; // Nội Dung
        row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' }; // Ghi Có
        row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' }; // Ghi Nợ
        row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' }; // Số Dư Lũy Kế
        row.getCell(9).alignment = { horizontal: 'left', vertical: 'middle' }; // Mã GD
        row.getCell(10).alignment = { horizontal: 'left', vertical: 'middle' }; // Mã Ref
        row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' }; // Trạng Thái
      }

      // Tạo file và lưu trữ
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Lich_su_giao_dich_ngan_hang_${new Date().getTime()}.xlsx`);
      toast("Đã xuất lịch sử giao dịch ra Excel thành công!", "success");
    } catch (err: any) {
      console.error("Excel export error:", err);
      toast("Lỗi khi xuất file Excel: " + err.message, "error");
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-4 space-y-4 max-w-none overflow-hidden">
      
      {/* HEADER SECTION */}
      <div className="flex shrink-0 flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border-dark pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-3 shrink-0">
            <div className="size-10 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary">
              <Landmark size={20} />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white uppercase tracking-wider">Giao dịch ngân hàng</h1>
              <p className="text-xs text-text-dim">Nhận biến động số dư tự động từ Gmail</p>
            </div>
          </div>
          
          {/* SEARCH INPUT */}
          <div className="relative flex-1 max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-dim">
              <Search size={14} />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm nội dung chuyển khoản, số tiền, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-border-dark rounded-xl text-xs focus:outline-none focus:border-primary/45 focus:ring-4 focus:ring-primary/5 text-white placeholder:text-text-dim"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportExcel}
            className="btn-secondary flex items-center gap-1.5 text-xs bg-emerald-600/10 border-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20"
          >
            <FileSpreadsheet size={13} />
            XUẤT EXCEL
          </button>

          <button
            onClick={handleRefresh}
            disabled={isLoading || isSyncing}
            className="btn-secondary flex items-center gap-2 text-xs"
          >
            {isSyncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            LÀM MỚI DỮ LIỆU
          </button>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center gap-1.5 text-xs"
          >
            <Plus size={14} />
            LIÊN KẾT TÀI KHẢN
          </button>
        </div>
      </div>

      {/* 2-COLUMN GRID CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: NHẬT KÝ BIẾN ĐỘNG SỐ DƯ */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 bg-sidebar-dark/30 border border-border-dark rounded-3xl overflow-hidden shadow-2xl">
          <div className="px-5 py-4 border-b border-border-dark flex items-center justify-between bg-card-dark/30 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse" />
              <h3 className="text-xs font-black uppercase text-white tracking-widest">
                Nhật ký biến động số dư
              </h3>
            </div>
            
            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Lọc theo tài khoản */}
              {accounts.length > 0 && (
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="px-2.5 py-1.5 bg-black/40 border border-border-dark rounded-xl text-[10px] font-bold text-white focus:outline-none focus:border-primary/40 cursor-pointer"
                >
                  <option value="all" className="bg-[#1E1E1E]">TẤT CẢ TÀI KHOẢN</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.account_number} className="bg-[#1E1E1E]">
                      {acc.bank_name} - {acc.account_number}
                    </option>
                  ))}
                </select>
              )}

              {/* Lọc theo loại giao dịch */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-2.5 py-1.5 bg-black/40 border border-border-dark rounded-xl text-[10px] font-bold text-white focus:outline-none focus:border-primary/40 cursor-pointer"
              >
                <option value="all" className="bg-[#1E1E1E]">TẤT CẢ PHÁT SINH</option>
                <option value="credit" className="bg-[#1E1E1E]">GHI CÓ (THU)</option>
                <option value="debit" className="bg-[#1E1E1E]">GHI NỢ (CHI)</option>
              </select>

              {/* Lọc theo trạng thái đối soát */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-2.5 py-1.5 bg-black/40 border border-border-dark rounded-xl text-[10px] font-bold text-white focus:outline-none focus:border-primary/40 cursor-pointer"
              >
                <option value="all" className="bg-[#1E1E1E]">TẤT CẢ ĐỐI SOÁT</option>
                <option value="matched" className="bg-[#1E1E1E]">ĐÃ KHỚP</option>
                <option value="unmatched" className="bg-[#1E1E1E]">CHƯA KHỚP</option>
              </select>

              {/* Lọc theo Năm */}
              <select
                value={filterYear}
                onChange={(e) => {
                  setFilterYear(e.target.value);
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-2.5 py-1.5 bg-black/40 border border-border-dark rounded-xl text-[10px] font-bold text-white focus:outline-none focus:border-primary/40 cursor-pointer"
              >
                <option value="all" className="bg-[#1E1E1E]">TẤT CẢ NĂM</option>
                {availableYears.map(year => (
                  <option key={year} value={year} className="bg-[#1E1E1E]">NĂM {year}</option>
                ))}
              </select>

              {/* Lọc theo Quý */}
              <select
                value={filterQuarter}
                onChange={(e) => {
                  setFilterQuarter(e.target.value);
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-2.5 py-1.5 bg-black/40 border border-border-dark rounded-xl text-[10px] font-bold text-white focus:outline-none focus:border-primary/40 cursor-pointer"
              >
                <option value="all" className="bg-[#1E1E1E]">TẤT CẢ QUÝ</option>
                <option value="1" className="bg-[#1E1E1E]">QUÝ 1</option>
                <option value="2" className="bg-[#1E1E1E]">QUÝ 2</option>
                <option value="3" className="bg-[#1E1E1E]">QUÝ 3</option>
                <option value="4" className="bg-[#1E1E1E]">QUÝ 4</option>
              </select>

              {/* Lọc theo Khoảng ngày */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`px-2.5 py-1.5 border rounded-xl text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                    startDate || endDate
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-black/40 border-border-dark text-white hover:border-white/20'
                  }`}
                >
                  <span>📅</span>
                  <span>
                    {startDate || endDate
                      ? `${startDate ? formatDisplayDateOnly(startDate) : '...'} - ${endDate ? formatDisplayDateOnly(endDate) : '...'}`
                      : 'KHOẢNG NGÀY'}
                  </span>
                </button>
                
                {showDatePicker && (
                  <div className="absolute right-0 mt-2 p-4 bg-stone-900 border border-border-dark rounded-2xl shadow-2xl z-50 w-64 space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-white tracking-wider">Chọn khoảng ngày</h4>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-text-dim uppercase">Từ ngày</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            setFilterYear('all');
                            setFilterQuarter('all');
                          }}
                          className="w-full px-3 py-1.5 bg-black/40 border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-primary/45"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-text-dim uppercase">Đến ngày</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value);
                            setFilterYear('all');
                            setFilterQuarter('all');
                          }}
                          className="w-full px-3 py-1.5 bg-black/40 border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-primary/45"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setStartDate('');
                          setEndDate('');
                          setShowDatePicker(false);
                        }}
                        className="px-2.5 py-1.5 bg-white/5 border border-border-dark text-white rounded-lg text-[9px] font-bold hover:bg-white/10"
                      >
                        Đặt lại
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(false)}
                        className="px-2.5 py-1.5 bg-primary text-white rounded-lg text-[9px] font-bold hover:bg-primary-hover"
                      >
                        Áp dụng
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-xs text-text-dim gap-2.5 py-12">
                <Loader2 className="animate-spin text-primary" size={20} />
                <span>Đang tải lịch sử giao dịch...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-xs text-text-dim italic uppercase tracking-wider py-20 text-center">
                {searchQuery.trim() !== '' ? 'Không tìm thấy giao dịch nào phù hợp.' : 'Chưa phát sinh giao dịch nào được ghi nhận.'}
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-black/20 text-text-dim font-black uppercase text-[9px] tracking-wider border-b border-border-dark/60 sticky top-0 backdrop-blur z-10">
                    <th className="px-5 py-3">Thời gian</th>
                    <th className="px-5 py-3">Tài khoản nhận</th>
                    <th className="px-5 py-3">Nội dung chuyển khoản</th>
                    <th className="px-5 py-3 text-right">Số tiền</th>
                    <th className="px-5 py-3 text-center">Đối soát</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark/30 font-medium">
                  {filteredTransactions.map((tx) => {
                    const isCredit = Number(tx.amount_in) > 0;
                    const displayAmount = isCredit ? tx.amount_in : tx.amount_out;
                    const badgeStyle = getAccountBadgeStyle(tx.gateway, tx.account_number);
                    
                    return (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                        {/* THỜI GIAN */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <p className="text-xs text-white font-bold">{formatDisplayDate(tx.transaction_date)}</p>
                          <p className="text-[9px] text-text-dim font-mono mt-0.5">Ref: {tx.reference_number || '---'}</p>
                        </td>
                        
                        {/* NGÂN HÀNG & SỐ TÀI KHOẢN */}
                        <td className="px-5 py-3.5">
                          <div className="inline-flex flex-col items-start gap-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase border leading-none ${badgeStyle}`}>
                              {tx.gateway}
                            </span>
                            <span className="text-[10px] text-text-dim font-mono tracking-wider">{tx.account_number}</span>
                          </div>
                        </td>
                        
                        {/* NỘI DUNG CHUYỂN KHOẢN */}
                        <td className="px-5 py-3.5 max-w-xs xl:max-w-sm break-words">
                          <p className="text-xs text-white leading-relaxed whitespace-pre-wrap break-words">
                            {tx.content}
                          </p>
                          {tx.code && (
                            <span className="inline-flex mt-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase tracking-wider rounded">
                              Mã: {tx.code}
                            </span>
                          )}
                        </td>
                        
                        {/* SỐ TIỀN */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <span className={`text-xs font-extrabold ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isCredit ? '+' : '-'}{formatCurrency(displayAmount)}
                          </span>
                          <p className="text-[9px] text-text-dim font-mono mt-0.5">Dư: {formatCurrency(tx.computedAccumulated)}</p>
                        </td>
                        
                        {/* TRẠNG THÁI ĐỐI SOÁT */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          {tx.match_status === 'matched' ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-bold">
                              <CheckCircle2 size={11} />
                              Đã khớp
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-border-dark text-text-dim rounded-full text-[10px] font-bold">
                              <Clock size={11} />
                              Chưa khớp
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: STATS, ACTIONS, ACCOUNTS LIST (FIXED/STATIC) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 min-h-0">
          
          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-2 gap-3 bg-white/[0.01] border border-border-dark/45 p-4 rounded-3xl shadow-lg backdrop-blur-md shrink-0">
            {[
              { label: 'Tài khoản liên kết', value: accounts.length, unit: 'TK', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: Landmark },
              { label: 'Số lượng giao dịch', value: filteredTransactions.length, unit: 'GD', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: Hash },
              { label: 'Doanh thu nhận (CÓ)', value: formatCurrency(totalIn), unit: '', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: ArrowDownLeft },
              { label: 'Chi phí trả (NỢ)', value: formatCurrency(totalOut), unit: '', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', icon: ArrowUpRight },
              { label: 'Giao dịch đối soát', value: matchedCount, unit: 'GD', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', icon: CheckCircle2 },
              { 
                label: 'Chênh lệch thu chi', 
                value: formatCurrency(diffAmount), 
                unit: '', 
                color: diffAmount >= 0 
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                  : 'text-rose-400 bg-rose-500/10 border-rose-500/20', 
                icon: TrendingUp 
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-sidebar-dark/45 border border-border-dark hover:border-primary/25 transition-all duration-300 group min-w-0"
                >
                  <div className={`p-2 rounded-xl shrink-0 border flex items-center justify-center ${stat.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8px] font-black uppercase tracking-wider text-text-dim leading-none truncate">{stat.label}</span>
                    <div className="flex items-baseline gap-1 mt-1 truncate">
                      <span className="text-xs font-extrabold tracking-tight text-white truncate">{stat.value}</span>
                      {stat.unit && <span className="text-[8px] font-bold text-text-dim/60 uppercase shrink-0">{stat.unit}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ADD ACCOUNT FORM */}
          {showAddForm && (
            <form onSubmit={handleAddAccount} className="bg-sidebar-dark/40 border border-border-dark p-5 rounded-3xl space-y-4 shadow-xl shrink-0">
              <h3 className="text-xs font-black uppercase text-white tracking-widest">Liên kết tài khoản mới</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-dim uppercase">Ngân hàng</label>
                  <select
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/40 border border-border-dark rounded-xl text-xs focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 text-white"
                    required
                  >
                    <option value="" className="bg-[#1E1E1E]">-- Chọn ngân hàng --</option>
                    {popularBanks.map(bank => (
                      <option key={bank} value={bank} className="bg-[#1E1E1E]">{bank}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-dim uppercase">Số tài khoản</label>
                  <input
                    type="text"
                    placeholder="Nhập số tài khoản..."
                    value={newAccountNumber}
                    onChange={(e) => setNewAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-4 py-2.5 bg-black/40 border border-border-dark rounded-xl text-xs focus:outline-none focus:border-primary/45 focus:ring-4 focus:ring-primary/5 text-white placeholder:text-text-dim font-mono"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3.5 py-2 bg-white/5 border border-border-dark text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAccount}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center gap-1.5"
                >
                  {isSubmittingAccount ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Lưu liên kết
                </button>
              </div>
            </form>
          )}

          {/* LINKED ACCOUNTS LIST */}
          <div className="bg-sidebar-dark/30 border border-border-dark rounded-3xl p-5 space-y-4 flex-1 min-h-0 flex flex-col">
            <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2 shrink-0">
              <span className="size-2 rounded-full bg-blue-500 shadow-md shadow-blue-500/50" />
              Tài khoản đã liên kết
            </h3>
            
            {accounts.length === 0 ? (
              <div className="text-center py-6 text-xs text-text-dim italic shrink-0">
                Chưa có tài khoản ngân hàng nào được liên kết.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 min-h-0">
                {accounts.map(acc => {
                  const badgeStyle = getAccountBadgeStyle(acc.bank_name, acc.account_number);
                  return (
                    <div key={acc.id} className="flex items-center justify-between p-3 bg-black/30 border border-border-dark rounded-2xl hover:border-primary/20 transition-all shrink-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                          <Landmark size={14} />
                        </div>
                        <div className="min-w-0">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase border leading-none mb-1 ${badgeStyle}`}>
                            {acc.bank_name}
                          </span>
                          <p className="text-[11px] font-bold text-white font-mono tracking-wider leading-none">{acc.account_number}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleRemoveAccount(acc.account_number)}
                        className="p-1.5 bg-white/5 border border-border-dark text-text-dim hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all shrink-0"
                        title="Ngắt liên kết"
                      >
                        <Link2Off size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FOOTER INFO */}
          <div className="flex items-start gap-3 p-4 bg-blue-900/10 border border-blue-800/20 text-blue-400 rounded-2xl text-xs font-semibold shrink-0">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed text-[11px]">
              Hệ thống sẽ tự động đối soát giao dịch nhận được từ Gmail theo hai bước: (1) tìm theo Mã thanh toán trùng khớp + Số tiền tương ứng, (2) tìm kiếm mã Hóa đơn/Mã Hợp đồng chứa trong nội dung chuyển khoản + Số tiền tương ứng.
            </span>
          </div>
          
        </div>

      </div>

    </div>
  );
};

export default TransactionsView;
