import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  PlusSquare,
  Settings2,
  Loader2,
  Download,
  FileText,
  Check,
  Users,
  PenTool,
  Layers,
  Calendar,
  DollarSign,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import imageCompression from 'browser-image-compression';
import * as XLSX from 'xlsx';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import type { User } from 'firebase/auth';

import { extractFromContract, convertContractDataToFormData } from '../../services/contractMistral';
import { generateDocxBlob, extractTags } from '../../lib/docxGenerator';
import { smartConvertAddress } from '../../lib/addressConverter';
import { cn, formatVNNumber, executeSecureExport } from '../../lib/utils';
import { useToast } from '../Notifications';
import { loadTemplates, saveTemplate, deleteStoredTemplate, StoredTemplate } from '../../lib/storage';
import { Partner, SmartContract } from '../../types/appTypes';
import { formatThousands, numberToVietnameseWords } from '../../lib/contractUtils';
import { getContractSignDateStandalone } from './ContractManagementView';

﻿const abbreviateCompanyName = (name: string): string => {
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

export const MERGER_DATE = new Date(2025, 6, 1); // 01/07/2025

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

export const getFriendlyLabel = (tag: string | undefined | null): string => {
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

export const toVietnameseTitleCase = (str: string): string => {
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

export const generateGdnDocxTable = (rows: GdnRow[]): string => {
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

export const TagRenderItem = ({
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
export const ContractFormContext = React.createContext<{
  selectedTemplate?: string;
  formData: Record<string, any>;
  handleFieldChange: (tagOrUpdates: string | Record<string, string>, val?: string) => void;
  setActiveInvoiceTag?: (tag: string | null) => void;
  setIsInvoiceSelectorOpen?: (open: boolean) => void;
  tags?: string[];
  vatConfig?: { keyword: string; rate: number }[];
  openVatConfig?: () => void;
} | null>(null);

// Inline Editable Content Span to flow seamlessly like normal text
export const InlineEditableSpan = ({
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
export const InlineField = ({
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

export const parseMarkdownToRows = (md: string, contractType?: string): TableRow[] => {
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

export const serializeRowsToMarkdown = (rows: TableRow[], contractType?: string): string => {
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

export const formatNumberInput = (val: string | number): string => {
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

export const parseFormattedNumber = (val: string): number => {
  if (!val) return 0;
  const clean = val.replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

// Helper component for spacious lined texts/tables in simulated A4 layout
export const InlineTextArea = ({
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
  const { selectedTemplate, formData, handleFieldChange, setActiveInvoiceTag, setIsInvoiceSelectorOpen, tags = [], vatConfig = [], openVatConfig } = context;

  const val = formData[tag] || '';
  const upper = tag.toUpperCase();
  const isTableTag = (upper.includes('BANG') || upper.includes('TABLE')) &&
    !upper.includes('BANG_CHU') &&
    !upper.includes('BANGCHU');

  const contractType = selectedTemplate;
  const [localRows, setLocalRows] = React.useState<TableRow[]>(() => parseMarkdownToRows(val, contractType));

  React.useEffect(() => {
    const parsed = parseMarkdownToRows(val, contractType);
    const currentSerialized = serializeRowsToMarkdown(localRows, contractType);
    if (val !== currentSerialized) {
      setLocalRows(parsed);
    }
  }, [val, contractType, localRows]);

  // --- Visual Table Mode for table tags ---
  if (isTableTag) {
    // Separate data rows from summary rows
    const dataRows = localRows.filter(r => !r.isSummary);
    const summaryRows = localRows.filter(r => r.isSummary);

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
          const matchedConfig = vatConfig.find(cfg => 
            (r.description || '').toLowerCase().includes(cfg.keyword.toLowerCase())
          );
          if (matchedConfig) {
            rowVatPercent = matchedConfig.rate;
          } else if (r.vat10 && r.vat10 !== '-' && r.vat10 !== '—' && r.vat10.trim() !== '') {
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
      setLocalRows(allRows);

      // Construct updates for parent state
      const updates: Record<string, string> = {
        [tag]: serializeRowsToMarkdown(allRows, contractType)
      };

      // Calculate total contract value to auto-update
      let contractTotal = 0;
      if (contractType === 'HDCM') {
        contractTotal = updatedData.reduce((sum, r) => sum + parseFormattedNumber(r.tongCong || '0'), 0);
      } else if (contractType === 'HDNT') {
        contractTotal = updatedData.reduce((sum, r) => sum + parseFormattedNumber(r.tongCong || '0'), 0);
      } else {
        const hasVAT = summaryRows.some(r => r.description.toUpperCase().includes('THUẾ') || r.description.toUpperCase().includes('VAT') || r.description.toUpperCase().includes('THUÊ'));
        if (hasVAT) {
          const vat = Math.round(grandTotal * (vatPercent / 100));
          contractTotal = grandTotal + vat;
        } else {
          contractTotal = grandTotal;
        }
      }

      // Try to find the currency/value tag in the contract tags
      let valueTag = tags.find(t => {
        const u = t.toUpperCase();
        const isTable = (u.includes('BANG') || u.includes('TABLE')) && !u.includes('BANG_CHU') && !u.includes('BANGCHU');
        return !isTable && [
          'GIATRI', 'GIA_TRI', 'SO_TIEN', 'TONG_TIEN', 'THANH_TIEN', 'PHI', 'PHIDICHVU', 'GIA_TRI_HD', 'GIATRIHOPDONG'
        ].some(v => u.includes(v));
      });

      // Fallback: search in keys of formData
      if (!valueTag) {
        valueTag = Object.keys(formData).find(t => {
          const u = t.toUpperCase();
          const isTable = (u.includes('BANG') || u.includes('TABLE')) && !u.includes('BANG_CHU') && !u.includes('BANGCHU');
          return !isTable && [
            'GIATRI', 'GIA_TRI', 'SO_TIEN', 'TONG_TIEN', 'THANH_TIEN', 'PHI', 'PHIDICHVU', 'GIA_TRI_HD', 'GIATRIHOPDONG'
          ].some(v => u.includes(v));
        });
      }

      if (contractTotal > 0) {
        const totalStr = formatThousands(String(contractTotal));
        const wordsStr = numberToVietnameseWords(contractTotal);

        let actualValueTag = valueTag || 'GIATRIHOPDONG';
        let actualVerbalTag = tags.find(t => {
          const u = t.toUpperCase();
          return u.includes('BANGCHU') || u.includes('BANG_CHU');
        }) || 'BANGCHUGIATRI';

        updates[actualValueTag] = totalStr;
        updates[actualVerbalTag] = wordsStr;

        if (actualValueTag !== 'GIATRIHOPDONG') {
          updates['GIATRIHOPDONG'] = totalStr;
        }
        if (actualVerbalTag !== 'BANGCHUGIATRI') {
          updates['BANGCHUGIATRI'] = wordsStr;
        }
      }

      handleFieldChange(updates);
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

export const escapeXml = (unsafe: string): string => {
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

export const formatCurrency = (val: number): string => {
  if (isNaN(val) || val === 0) return '';
  const parts = String(val).split('.');
  const decimalPlaces = parts.length > 1 ? parts[1].length : 0;
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: Math.max(decimalPlaces, 3)
  }).format(val);
};

export const cleanVal = (val: string | null | undefined): string => {
  if (!val) return '';
  const s = val.trim();
  if (s === '0' || s === '-' || s === '---' || s === '0,00' || s === '0.00') return '';
  return s;
};

export const parseMoney = (s: string) => {
  if (!s || s === '-' || s === '—') return 0;
  const clean = s.replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export const makeCell = (text: string, width: string, align: string, bold = false, span = 0, vAlign = '', shade = '') => {
  const escaped = escapeXml(text);
  const bTag = bold ? '<w:b/><w:bCs/>' : '';
  const runTag = escaped ? `<w:r><w:rPr>
    <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
    ${bTag}
    <w:sz w:val="24"/><w:szCs w:val="24"/>
  </w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r>` : '';
  const spanTag = span ? `<w:gridSpan w:val="${span}"/>` : '';
  const vAlignTag = vAlign ? `<w:vAlign w:val="${vAlign}"/>` : '';
  const shadeTag = shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : '';
  return `<w:tc><w:tcPr>${spanTag}<w:tcW w:w="${width}" w:type="dxa"/>${shadeTag}${vAlignTag}</w:tcPr>
    <w:p><w:pPr><w:jc w:val="${align}"/><w:spacing w:before="60" w:after="60"/></w:pPr>${runTag}</w:p>
  </w:tc>`;
};

export const makeSummaryRow = (
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
        <w:sz w:val="24"/><w:szCs w:val="24"/>
      </w:rPr>
      <w:t xml:space="preserve">${escapeXml(label)}</w:t>
    </w:r></w:p>
  </w:tc>`;
  const valueCell = makeCell(value, String(lastColWidth), 'right', true, 0, '', 'F2F2F2');
  return `<w:tr>${labelCell}${valueCell}</w:tr>`;
};

export const generateCaMayTable = (rows: TableRow[]): string => {
  const dataRows = rows.filter(r => !r.isSummary);

  const colWidths = {
    stt: '350',
    noiDung: '1340',
    dvt: '700',
    khoiLuong: '1134',
    donGia: '1800',
    thoiGian: '964',
    thanhTien: '1550',
    vat8: '1100',
    tongCong: '1550'
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

  const spanWidth = 350 + 1340 + 700 + 1134 + 1800 + 964; // = 6288

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
          <w:sz w:val="24"/><w:szCs w:val="24"/>
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

export const generateNguyenTacTable = (rows: TableRow[]): string => {
  const dataRows = rows.filter(r => !r.isSummary);

  const colWidths = {
    stt: '350',
    noiDung: '1204',
    dvt: '700',
    khoiLuong: '1134',
    donGia: '1800',
    thanhTien: '1550',
    vat8: '1100',
    vat10: '1100',
    tongCong: '1550'
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

  const spanWidth = 350 + 1204 + 700 + 1134 + 1800; // = 5188

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
          <w:sz w:val="24"/><w:szCs w:val="24"/>
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

export const generateContractDocxTable = (md: string, contractType?: string): string => {
  if (!md || !md.trim()) return '';

  const rows = parseMarkdownToRows(md, contractType);
  if (rows.length === 0) return '';

  return contractType === 'HDCM'
    ? generateCaMayTable(rows)
    : generateNguyenTacTable(rows);
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
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

export const fetchTemplateBuffer = async (templateId: string): Promise<ArrayBuffer> => {
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

export const buildSplitTagPattern = (tag: string): string => {
  return tag
    .split('')
    .map(char => {
      const escaped = char.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return `${escaped}(?:<[^>]+>)*`;
    })
    .join('');
};

export const generateDocxBlobForContract = async (
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

export const ContractView = ({
  partners,
  user,
  contractForm,
  updateContractForm,
  onContractSaved,
  setIsInvoiceSelectorOpen,
  setActiveInvoiceTag,
  handleFieldChange,
  vatConfig,
  openVatConfig,
  onOpenQuotation
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
  handleFieldChange: (tagOrUpdates: string | Record<string, string>, val?: string) => void,
  vatConfig: { keyword: string; rate: number }[],
  openVatConfig: () => void,
  onOpenQuotation?: () => void
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

      // Also update any numerical value tag if present
      let valueTag = tags.find(t => {
        const u = t.toUpperCase();
        const isTable = (u.includes('BANG') || u.includes('TABLE')) && !u.includes('BANG_CHU') && !u.includes('BANGCHU');
        return !isTable && [
          'GIATRI', 'GIA_TRI', 'SO_TIEN', 'TONG_TIEN', 'THANH_TIEN', 'PHI', 'PHIDICHVU', 'GIA_TRI_HD', 'GIATRIHOPDONG'
        ].some(v => u.includes(v));
      });

      if (!valueTag) {
        valueTag = Object.keys(formData).find(t => {
          const u = t.toUpperCase();
          const isTable = (u.includes('BANG') || u.includes('TABLE')) && !u.includes('BANG_CHU') && !u.includes('BANGCHU');
          return !isTable && [
            'GIATRI', 'GIA_TRI', 'SO_TIEN', 'TONG_TIEN', 'THANH_TIEN', 'PHI', 'PHIDICHVU', 'GIA_TRI_HD', 'GIATRIHOPDONG'
          ].some(v => u.includes(v));
        });
      }

      if (valueTag && totalVal > 0) {
        handleFieldChange(valueTag, String(totalVal));
      }
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

      // Xuat file an toan dung showSaveFilePicker
      executeSecureExport(fileName, out, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

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
    <ContractFormContext.Provider value={{ selectedTemplate, formData, handleFieldChange, setActiveInvoiceTag, setIsInvoiceSelectorOpen, tags, vatConfig, openVatConfig }}>
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
            <button
              onClick={onOpenQuotation}
              className="px-3 py-1.5 text-xs font-bold text-blue-400 bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 rounded-lg transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Zap className="size-3.5 text-blue-400" />
              Tạo báo giá
            </button>
            {selectedTemplate && (
              <>
                <button
                  type="button"
                  onClick={openVatConfig}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white border border-border-dark rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Settings2 className="size-4 text-stone-400" />
                  Cấu hình VAT
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold hover:bg-primary/30 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  {isGenerating ? 'Đang tạo...' : 'Xuất Hợp Đồng (.docx)'}
                </button>
              </>
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

