import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Download,
  ChevronLeft,
  Eye,
  Edit3,
  Move,
  Check,
  Zap,
  FileText
} from 'lucide-react';
import { saveAs } from 'file-saver';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  VerticalAlign
} from 'docx';
import { Partner } from '../../types/appTypes';
import { cn } from '../../lib/utils';
import { useToast } from '../Notifications';

interface ColumnConfig {
  key: string;
  label: string;
  align: 'left' | 'center' | 'right';
  isMandatory: boolean;
}

interface QuotationRow {
  id: string;
  [key: string]: string;
}

interface QuotationCreatorProps {
  partners: Partner[];
  onBack: () => void;
}

// Helper to convert CÔNG TY TNHH XÂY DỰNG PHẠM LIÊM -> Công ty TNHH Xây Dựng Phạm Liêm
const toTitleCaseCompanyName = (str: string) => {
  if (!str) return '';
  const uppercaseWords = ['TNHH', 'CP', 'VLXD', 'PCCC', 'MTV', 'JSC', 'JS', 'E&C', 'GTVT', 'XD', 'TM', 'DV', 'CN', 'SX', 'XNK'];
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      const upperWord = word.toUpperCase();
      if (uppercaseWords.includes(upperWord)) {
        return upperWord;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

// Helper to format dots as thousands separators
const formatNumberWithDots = (val: string) => {
  if (!val) return '';
  const cleanVal = val.replace(/\D/g, '');
  return cleanVal.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export function QuotationCreator({ partners, onBack }: QuotationCreatorProps) {
  const { toast } = useToast();
  const [isFormMode, setIsFormMode] = useState(true);

  // Form Fields State (Customized defaults)
  const [sendingCompany, setSendingCompany] = useState('');
  const [receivingCompany, setReceivingCompany] = useState('');
  const [introText, setIntroText] = useState('');
  const [location, setLocation] = useState('TP. Hồ Chí Minh');
  
  // Date Fields (Separate inputs to let users fill day, month, year numbers)
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // Fixed fields as per requirements
  const [notes, setNotes] = useState('Ghi chú:\n\n- Đơn giá chưa bao gồm thuế VAT\n\nTrân trọng kính chào!');
  const [signerTitle, setSignerTitle] = useState('GIÁM ĐỐC');
  const [signerName, setSignerName] = useState('');

  // Columns Configuration
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'stt', label: 'STT', align: 'center', isMandatory: true },
    { key: 'noidung', label: 'NỘI DUNG', align: 'left', isMandatory: true },
    { key: 'dvt', label: 'ĐVT', align: 'center', isMandatory: false },
    { key: 'dongia', label: 'ĐƠN GIÁ (VNĐ)', align: 'center', isMandatory: false },
    { key: 'ghichu', label: 'GHI CHÚ', align: 'left', isMandatory: false }
  ]);

  // Table Rows Data (Single empty row)
  const [rows, setRows] = useState<QuotationRow[]>([
    {
      id: '1',
      stt: '1',
      noidung: '',
      dvt: '',
      dongia: '',
      ghichu: ''
    }
  ]);

  // State for adding a new column
  const [newColLabel, setNewColLabel] = useState('');
  const [newColAlign, setNewColAlign] = useState<'left' | 'center' | 'right'>('center');
  const [showAddColForm, setShowAddColForm] = useState(false);

  // Drag and Drop State
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);
  const [dragOverColIndex, setDragOverColIndex] = useState<number | null>(null);

  // Automatically update STT when rows or column orders change
  useEffect(() => {
    setRows(prev =>
      prev.map((row, index) => ({
        ...row,
        stt: String(index + 1)
      }))
    );
  }, [rows.length]);

  // Auto-generate introText when sendingCompany changes
  const handleSendingCompanyChange = (val: string) => {
    setSendingCompany(val);
    const titleCase = toTitleCaseCompanyName(val);
    setIntroText(titleCase ? `${titleCase} xin trân trọng báo giá thuê xe như sau:` : '');
  };

  // Handle Partner (Receiver) Select
  const handlePartnerSelect = (partnerId: string) => {
    const partner = partners.find(p => p.id === partnerId);
    if (partner) {
      setReceivingCompany(partner.name.toUpperCase());
    }
  };

  // Handle Sending Partner Select
  const handleSendingPartnerSelect = (partnerId: string) => {
    const partner = partners.find(p => p.id === partnerId);
    if (partner) {
      handleSendingCompanyChange(partner.name.toUpperCase());
      if (partner.representative) {
        setSignerName(partner.representative);
      } else {
        setSignerName('');
      }
      if (partner.position) {
        setSignerTitle(partner.position.toUpperCase());
      } else {
        setSignerTitle('GIÁM ĐỐC');
      }
    }
  };

  // Add a new column
  const handleAddColumn = () => {
    if (!newColLabel.trim()) {
      toast('Tên cột không được để trống', 'error');
      return;
    }
    const key = `col_${Date.now()}`;
    const newCol: ColumnConfig = {
      key,
      label: newColLabel.trim().toUpperCase(),
      align: newColAlign,
      isMandatory: false
    };

    setColumns([...columns, newCol]);
    setRows(prev => prev.map(row => ({ ...row, [key]: '' })));
    setNewColLabel('');
    setShowAddColForm(false);
    toast(`Đã thêm cột "${newCol.label}"`, 'success');
  };

  // Delete a column
  const handleDeleteColumn = (key: string, label: string) => {
    setColumns(columns.filter(col => col.key !== key));
    setRows(prev => {
      return prev.map(row => {
        const newRow = { ...row };
        delete newRow[key];
        return newRow;
      });
    });
    toast(`Đã xóa cột "${label}"`, 'success');
  };

  // Row operations
  const handleAddRow = () => {
    const newRow: QuotationRow = {
      id: String(Date.now()),
      stt: String(rows.length + 1)
    };
    columns.forEach(col => {
      if (col.key !== 'stt') {
        newRow[col.key] = '';
      }
    });
    setRows([...rows, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    if (rows.length <= 1) {
      toast('Bảng báo giá phải có ít nhất 1 dòng dữ liệu', 'error');
      return;
    }
    const updatedRows = rows.filter(row => row.id !== id);
    setRows(updatedRows);
  };

  const handleCellChange = (rowId: string, colKey: string, value: string) => {
    let finalValue = value;
    if (colKey === 'dongia') {
      finalValue = formatNumberWithDots(value);
    }
    setRows(prev =>
      prev.map(row => (row.id === rowId ? { ...row, [colKey]: finalValue } : row))
    );
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColIndex !== null && draggedColIndex !== index) {
      setDragOverColIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) {
      setDraggedColIndex(null);
      setDragOverColIndex(null);
      return;
    }

    const reorderedCols = [...columns];
    const [draggedCol] = reorderedCols.splice(sourceIndex, 1);
    reorderedCols.splice(targetIndex, 0, draggedCol);

    setColumns(reorderedCols);
    setDraggedColIndex(null);
    setDragOverColIndex(null);
    toast('Đã thay đổi vị trí cột thành công', 'success');
  };

  const handleDragEnd = () => {
    setDraggedColIndex(null);
    setDragOverColIndex(null);
  };

  // Download Word (.docx) Document
  const handleDownloadDocx = () => {
    const formattedDate = `${location || '...'}, ngày ${day || '...'} tháng ${month || '...'} năm ${year || '...'}`;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header table (no borders)
          new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new DocxTableRow({
                children: [
                  new DocxTableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: sendingCompany.toUpperCase() || 'TÊN CÔNG TY GỬI', bold: true, font: "Times New Roman", size: 22 })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "⎯⎯⎯⎯⎯⎯⎯⎯", font: "Times New Roman", size: 18 })
                        ]
                      })
                    ]
                  }),
                  new DocxTableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    children: []
                  }),
                  new DocxTableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true, font: "Times New Roman", size: 22 })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "Độc lập - Tự do - Hạnh phúc", bold: true, font: "Times New Roman", size: 24 })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯", font: "Times New Roman", size: 18 })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // Spacing
          new Paragraph({ spacing: { before: 240 } }),

          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 240 },
            children: [
              new TextRun({ text: "THƯ BÁO GIÁ", bold: true, font: "Times New Roman", size: 36 })
            ]
          }),

          // Recipient
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({ text: "Kính gửi: ", bold: true, font: "Times New Roman", size: 26 }),
              new TextRun({ text: receivingCompany.toUpperCase() || 'TÊN ĐƠN VỊ NHẬN', bold: true, font: "Times New Roman", size: 26 })
            ]
          }),

          // Intro
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({ text: introText || '...', font: "Times New Roman", size: 26 })
            ]
          }),

          // Data Table
          new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header row
              new DocxTableRow({
                tableHeader: true,
                children: columns.map(col => new DocxTableCell({
                  shading: { fill: "F2F2F2" },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 120, after: 120 },
                      children: [
                        new TextRun({ text: col.label, bold: true, font: "Times New Roman", size: 22 })
                      ]
                    })
                  ]
                }))
              }),
              // Data rows
              ...rows.map(row => new DocxTableRow({
                children: columns.map(col => {
                  const isSTT = col.key === 'stt';
                  const isAlignRight = col.align === 'right';
                  const isAlignCenter = col.align === 'center';
                  const alignment = isAlignRight ? AlignmentType.RIGHT : isAlignCenter ? AlignmentType.CENTER : AlignmentType.LEFT;
                  
                  const cellText = row[col.key] || "";
                  const textLines = cellText.split('\n');

                  return new DocxTableCell({
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({
                        alignment,
                        spacing: { before: 100, after: 100 },
                        children: textLines.map((line, idx) => new TextRun({
                          text: line,
                          font: "Times New Roman",
                          size: 22,
                          bold: isSTT,
                          break: idx > 0 ? 1 : undefined
                        }))
                      })
                    ]
                  });
                })
              }))
            ]
          }),

          // Spacing
          new Paragraph({ spacing: { before: 240 } }),

          // Notes
          ...notes.split('\n').map(line => new Paragraph({
            children: [
              new TextRun({ text: line, font: "Times New Roman", size: 24 })
            ]
          })),

          // Spacing
          new Paragraph({ spacing: { before: 240 } }),

          // Footer Table (Date and Signer)
          new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new DocxTableRow({
                children: [
                  new DocxTableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: []
                  }),
                  new DocxTableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: formattedDate, italics: true, font: "Times New Roman", size: 22 })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: signerTitle.toUpperCase() || 'GIÁM ĐỐC', bold: true, font: "Times New Roman", size: 22 })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 1000 }, // Signature space
                        children: [
                          new TextRun({ text: signerName || '...', bold: true, font: "Times New Roman", size: 24 })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })

        ]
      }]
    });

    Packer.toBlob(doc).then(blob => {
      const fileName = `Thu_Bao_Gia_${receivingCompany.trim().replace(/[^a-zA-Z0-9ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ\s]/g, '').replace(/\s+/g, '_') || 'Khach_Hang'}.docx`;
      saveAs(blob, fileName);
      toast('Đã tải thư báo giá (.docx) thành công!', 'success');
    });
  };

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden relative" id="quotation-print-area-wrapper">
      
      {/* Top Navbar / Toolbar */}
      <div className="no-print bg-card-dark border border-border-dark px-4 py-3 rounded-2xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Zap size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight">Tạo Thư Báo Giá Chuyên Nghiệp</h2>
            <p className="text-xs text-text-dim">Tự thiết kế bảng báo giá chuẩn Nghị định 30</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Form / Preview */}
          <button
            onClick={() => setIsFormMode(!isFormMode)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95",
              isFormMode 
                ? "bg-primary text-white shadow-md hover:bg-primary-hover"
                : "bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white border border-border-dark"
            )}
          >
            {isFormMode ? (
              <>
                <Eye className="size-4" />
                Xem trước văn bản
              </>
            ) : (
              <>
                <Edit3 className="size-4" />
                Sửa đổi biểu mẫu
              </>
            )}
          </button>

          {!isFormMode && (
            <button
              onClick={handleDownloadDocx}
              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Download className="size-4" />
              Tải file Word (.doc)
            </button>
          )}

          {onBack && (
            <button
              onClick={onBack}
              className="px-3.5 py-1.5 bg-white/5 border border-border-dark text-text-dim hover:text-white rounded-xl text-xs font-bold transition-all hover:bg-white/10 flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="size-4" />
              Quay lại
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0 bg-stone-955/40 rounded-2xl border border-border-dark">
        
        {/* 1. FORM MODE */}
        {isFormMode ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar no-print">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: General details */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-sidebar-dark/40 border border-border-dark rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-border-dark/60 pb-2">Thông tin công văn</h3>
                  
                  {/* Sending Company */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-wider">Tên đơn vị gửi</label>
                    <textarea
                      rows={2}
                      value={sendingCompany}
                      onChange={(e) => handleSendingCompanyChange(e.target.value)}
                      className="w-full bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all resize-none"
                      placeholder="Nhập tên công ty gửi..."
                    />
                  </div>

                  {/* Sending Company Selection Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-wider block">Chọn đơn vị gửi từ danh sách</label>
                    <select
                      onChange={(e) => handleSendingPartnerSelect(e.target.value)}
                      className="w-full bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all cursor-pointer"
                      defaultValue=""
                    >
                      <option value="">-- Chọn đơn vị gửi từ danh sách --</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Partner suggest / Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-wider block">Chọn công ty đối tác từ danh sách</label>
                    <select
                      onChange={(e) => handlePartnerSelect(e.target.value)}
                      className="w-full bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all cursor-pointer"
                      defaultValue=""
                    >
                      <option value="">-- Chọn từ Khách hàng/Đối tác --</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Recipient */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-wider">Kính gửi (Đơn vị nhận)</label>
                    <input
                      type="text"
                      value={receivingCompany}
                      onChange={(e) => setReceivingCompany(e.target.value)}
                      className="w-full bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all"
                      placeholder="Nhập đơn vị kính gửi..."
                    />
                  </div>

                  {/* Introduction text */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-wider">Nội dung dẫn nhập</label>
                    <textarea
                      rows={3}
                      value={introText}
                      onChange={(e) => setIntroText(e.target.value)}
                      className="w-full bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all"
                      placeholder="Nhập câu dẫn nhập báo giá..."
                    />
                  </div>

                  {/* Date details */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-wider">Địa danh ký</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all"
                        placeholder="Địa danh"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-wider block">Ngày tháng năm (Số)</label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={day}
                          onChange={(e) => setDay(e.target.value.replace(/\D/g, ''))}
                          placeholder="Ngày"
                          className="w-full text-center bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                        />
                        <input
                          type="text"
                          value={month}
                          onChange={(e) => setMonth(e.target.value.replace(/\D/g, ''))}
                          placeholder="Tháng"
                          className="w-full text-center bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                        />
                        <input
                          type="text"
                          value={year}
                          onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
                          placeholder="Năm"
                          className="w-full text-center bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-sidebar-dark/40 border border-border-dark rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-border-dark/60 pb-2">Người ký & Ghi chú</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-wider">Chức danh</label>
                      <input
                        type="text"
                        value={signerTitle}
                        onChange={(e) => setSignerTitle(e.target.value)}
                        className="w-full bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all"
                        placeholder="Ví dụ: GIÁM ĐỐC"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-wider">Họ và tên</label>
                      <input
                        type="text"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        className="w-full bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all"
                        placeholder="Nhập tên người ký..."
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-wider">Ghi chú chân trang</label>
                    <textarea
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-sidebar-dark border border-border-dark focus:border-primary rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all font-mono"
                      placeholder="Nhập các điều khoản ghi chú thêm..."
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Columns Configurator & Table Data */}
              <div className="lg:col-span-2 space-y-4 flex flex-col h-full min-h-0">
                
                {/* Columns Manager */}
                <div className="bg-sidebar-dark/40 border border-border-dark rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Cấu hình cột bảng dữ liệu</h3>
                    <button
                      onClick={() => setShowAddColForm(!showAddColForm)}
                      className="px-2.5 py-1 bg-primary/20 text-primary border border-primary/30 rounded-lg text-[10px] font-bold hover:bg-primary/30 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Plus className="size-3" />
                      Thêm cột mới
                    </button>
                  </div>

                  <p className="text-[10px] text-text-dim">Kéo và thả giữa các cột bên dưới để sắp xếp lại thứ tự hiển thị cột trong bảng dữ liệu.</p>

                  {/* Add column form */}
                  {showAddColForm && (
                    <div className="bg-card-dark p-3.5 rounded-xl border border-border-dark space-y-3 animate-fadeIn">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-stone-400">Tên cột (Ví dụ: Thành Tiền, Bảo Hành...)</label>
                          <input
                            type="text"
                            value={newColLabel}
                            onChange={(e) => setNewColLabel(e.target.value)}
                            className="w-full bg-sidebar-dark border border-border-dark focus:border-primary rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                            placeholder="NHẬP TÊN CỘT"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-stone-400">Căn lề dữ liệu</label>
                          <select
                            value={newColAlign}
                            onChange={(e) => setNewColAlign(e.target.value as any)}
                            className="w-full bg-sidebar-dark border border-border-dark focus:border-primary rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                          >
                            <option value="left">Căn lề trái (Văn bản)</option>
                            <option value="center">Căn giữa (Mã số, Đơn vị)</option>
                            <option value="right">Căn lề phải (Số tiền)</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setShowAddColForm(false);
                            setNewColLabel('');
                          }}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 text-stone-300 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleAddColumn}
                          className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-hover cursor-pointer"
                        >
                          Thêm
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Displaying columns as badges */}
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    {columns.map((col, idx) => (
                      <div
                        key={col.key}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-grab active:cursor-grabbing transition-all select-none",
                          col.isMandatory
                            ? "bg-primary/10 border-primary/20 text-primary"
                            : "bg-white/5 border-border-dark text-stone-300 hover:border-stone-400",
                          dragOverColIndex === idx && "border-primary border-dashed scale-105 bg-primary/5"
                        )}
                      >
                        <Move className="size-3 text-stone-400 pointer-events-none" />
                        <span>{col.label}</span>
                        {!col.isMandatory && (
                          <button
                            onClick={() => handleDeleteColumn(col.key, col.label)}
                            className="text-stone-400 hover:text-red-400 transition-colors p-0.5 rounded cursor-pointer"
                          >
                            <X className="size-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Table Data Entry Grid */}
                <div className="flex-1 bg-sidebar-dark/40 border border-border-dark rounded-2xl p-5 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-3 border-b border-border-dark/60 pb-2">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Nội dung bảng báo giá</h3>
                    <button
                      onClick={handleAddRow}
                      className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Plus className="size-4" />
                      Thêm dòng mới
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto custom-scrollbar border border-border-dark rounded-xl bg-sidebar-dark/50">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-card-dark sticky top-0 text-stone-300 font-bold border-b border-border-dark uppercase tracking-wider text-[10px]">
                        <tr>
                          {columns.map((col) => (
                            <th key={col.key} className="px-3 py-2 text-center border-r border-border-dark last:border-0">
                              {col.label}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center w-12">Xóa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, rIdx) => (
                          <tr key={row.id} className="border-b border-border-dark hover:bg-white/5 last:border-0">
                            {columns.map((col) => {
                              const isSTT = col.key === 'stt';
                              const isAlignRight = col.align === 'right';
                              const isAlignCenter = col.align === 'center';

                              return (
                                <td key={col.key} className="p-1 border-r border-border-dark last:border-0 min-w-[80px]">
                                  {isSTT ? (
                                    <div className="text-center font-bold text-stone-400 py-1">{row[col.key]}</div>
                                  ) : col.key === 'noidung' || col.key === 'ghichu' ? (
                                    <textarea
                                      value={row[col.key] || ''}
                                      onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                      rows={1}
                                      className="w-full bg-transparent border-none focus:bg-white/5 focus:outline-none px-2 py-1 text-white resize-y rounded text-xs font-medium"
                                      placeholder="..."
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={row[col.key] || ''}
                                      onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                      className={cn(
                                        "w-full bg-transparent border-none focus:bg-white/5 focus:outline-none px-2 py-1 rounded text-xs",
                                        isAlignRight && "text-right",
                                        isAlignCenter && "text-center"
                                      )}
                                      placeholder="..."
                                    />
                                  )}
                                </td>
                              );
                            })}
                            <td className="p-1 text-center">
                              <button
                                onClick={() => handleDeleteRow(row.id)}
                                className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          </div>
        ) : (
          
          /* 2. PREVIEW MODE (Visual A4 sheet) */
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-stone-950/60 custom-scrollbar flex flex-col justify-start min-h-0 select-text">
            <div
              id="quotation-print-area"
              className="w-full max-w-[800px] mx-auto bg-white text-stone-900 shadow-[0_10px_35px_rgba(0,0,0,0.5)] border border-stone-200 rounded-lg p-8 md:p-14 font-serif text-[14px] leading-relaxed relative flex flex-col"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              {/* Decorative tag for drafting */}
              <div className="absolute right-8 top-8 text-[9px] font-sans font-bold text-stone-400 border border-stone-300 px-2 py-0.5 rounded uppercase tracking-widest select-none pointer-events-none no-print">
                Khổ A4 • Xem trước
              </div>

              {/* Header section (Decree 30) */}
              <div className="grid grid-cols-12 gap-2 text-center mb-6">
                {/* Left: Company Sending */}
                <div className="col-span-5 flex flex-col items-center justify-start">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleSendingCompanyChange(e.target.innerText)}
                    className="w-full text-center font-bold text-[13px] outline-none focus:bg-stone-100 p-0.5 rounded uppercase leading-snug whitespace-pre-line"
                  >
                    {sendingCompany || 'CÔNG TY GỬI BÁO GIÁ'}
                  </div>
                  <div className="w-24 h-[1px] bg-stone-900 mt-1" />
                </div>

                {/* Right: National slogan */}
                <div className="col-span-7 flex flex-col items-center justify-start">
                  <span className="font-bold text-[13px] uppercase tracking-tighter">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span>
                  <span className="font-bold text-[14px] mt-0.5">Độc lập - Tự do - Hạnh phúc</span>
                  <div className="w-32 h-[1px] bg-stone-900 mt-1" />
                </div>
              </div>

              {/* Title */}
              <div className="text-center my-8">
                <span className="font-bold text-[20px] uppercase tracking-wide">THƯ BÁO GIÁ</span>
              </div>

              {/* Recipient ("Kính gửi") */}
              <div className="mb-4 flex items-baseline gap-1">
                <span className="font-bold whitespace-nowrap">Kính gửi:</span>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setReceivingCompany(e.target.innerText.toUpperCase())}
                  className="flex-1 font-bold outline-none focus:bg-stone-100 p-0.5 rounded uppercase min-h-[20px] inline-block"
                >
                  {receivingCompany || 'ĐƠN VỊ ĐỐI TÁC'}
                </div>
              </div>

              {/* Introduction text */}
              <div className="mb-4">
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setIntroText(e.target.innerText)}
                  className="w-full outline-none focus:bg-stone-100 p-0.5 rounded leading-relaxed min-h-[30px]"
                >
                  {introText || '...'}
                </div>
              </div>

              {/* Table area (Compact padding and contentEditable) */}
              <div className="mb-6">
                <table className="w-full border-collapse border border-stone-800 text-[13px]">
                  <thead>
                    <tr className="border-b border-stone-800 bg-stone-50">
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className="border border-stone-800 px-2 py-1.5 font-bold text-center uppercase text-[12px]"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rIdx) => (
                      <tr key={row.id} className="border-b border-stone-800">
                        {columns.map((col) => {
                          const isSTT = col.key === 'stt';
                          const isAlignRight = col.align === 'right';
                          const isAlignCenter = col.align === 'center';

                          return (
                            <td
                              key={col.key}
                              contentEditable={!isSTT}
                              suppressContentEditableWarning={true}
                              onBlur={(e) => handleCellChange(row.id, col.key, e.target.innerText)}
                              className={cn(
                                "border border-stone-800 px-2 py-1 text-[13px] outline-none focus:bg-stone-50 min-h-[25px]",
                                isAlignRight && "text-right",
                                isAlignCenter && "text-center",
                                col.key === 'noidung' && "whitespace-pre-line text-left"
                              )}
                            >
                              {row[col.key]}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Notes & Greetings */}
              <div className="mb-8">
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setNotes(e.target.innerText)}
                  className="w-full outline-none focus:bg-stone-100 p-0.5 rounded font-serif leading-relaxed whitespace-pre-wrap min-h-[60px]"
                >
                  {notes}
                </div>
              </div>

              {/* Signature Area (Decree 30) */}
              <div className="ml-auto w-80 text-center flex flex-col items-center justify-start mt-auto">
                
                {/* Location, Date */}
                <div className="italic text-[13px] mb-1 flex items-baseline justify-center gap-1 w-full flex-wrap">
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setLocation(e.target.innerText)}
                    className="outline-none focus:bg-stone-100 px-1 rounded min-w-[50px] text-right inline-block"
                  >
                    {location}
                  </span>
                  <span>, ngày</span>
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setDay(e.target.innerText)}
                    className="outline-none focus:bg-stone-100 px-1 rounded min-w-[20px] text-center inline-block"
                  >
                    {day || '...'}
                  </span>
                  <span>tháng</span>
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setMonth(e.target.innerText)}
                    className="outline-none focus:bg-stone-100 px-1 rounded min-w-[20px] text-center inline-block"
                  >
                    {month || '...'}
                  </span>
                  <span>năm</span>
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setYear(e.target.innerText)}
                    className="outline-none focus:bg-stone-100 px-1 rounded min-w-[40px] text-center inline-block"
                  >
                    {year || '...'}
                  </span>
                </div>

                {/* Signer Title */}
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setSignerTitle(e.target.innerText.toUpperCase())}
                  className="w-full text-center font-bold text-[13px] outline-none focus:bg-stone-100 p-0.5 rounded uppercase"
                >
                  {signerTitle}
                </div>
                
                {/* Visual Sign Spacing */}
                <div className="h-24 no-print text-[11px] text-stone-400 italic flex items-center justify-center select-none pointer-events-none">
                  (Chữ ký, dấu)
                </div>
                <div className="h-20 hidden print:block" />

                {/* Signer Name */}
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setSignerName(e.target.innerText)}
                  className="w-full text-center font-bold text-[14px] outline-none focus:bg-stone-100 p-0.5 rounded"
                >
                  {signerName || 'Họ và tên người ký'}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Inline Edit Help Badge */}
      {!isFormMode && (
        <div className="no-print absolute bottom-4 left-4 bg-emerald-500/90 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg border border-emerald-400 flex items-center gap-2 animate-bounce">
          <Check className="size-4 animate-pulse" />
          Bạn có thể click trực tiếp vào văn bản A4 ở trên để chỉnh sửa!
        </div>
      )}
    </div>
  );
}
