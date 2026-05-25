import React, { useState, useEffect } from 'react';
import { FileText, FileCode, Trash2, ChevronDown, Paperclip, Download, Loader2, Zap } from 'lucide-react';
import { ExtendedInvoiceItem } from './demoData';
import './DashboardInvoice.css';

export const formatVietnameseDate = (dateStr: string): string => {
  if (!dateStr || dateStr === '---' || dateStr === '') return '---';
  
  // Clean string
  let cleanStr = dateStr.trim().replace(/\./g, '-').replace(/\//g, '-');

  // 1. Check if it's already in DD-MM-YYYY format
  const ddmmyyyyMatch = cleanStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyMatch) {
    const d = parseInt(ddmmyyyyMatch[1], 10);
    const m = parseInt(ddmmyyyyMatch[2], 10);
    const y = ddmmyyyyMatch[3];
    return `${d}/${m}/${y}`;
  }

  // 2. Check YYYY-MM-DD
  const yyyymmddMatch = cleanStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmddMatch) {
    const y = yyyymmddMatch[1];
    const m = parseInt(yyyymmddMatch[2], 10);
    const d = parseInt(yyyymmddMatch[3], 10);
    return `${d}/${m}/${y}`;
  }

  // 3. Check Vietnamese OCR formats like "Ngày 20 tháng 12 năm 2023"
  if (cleanStr.toLowerCase().includes('ngày') || cleanStr.toLowerCase().includes('tháng')) {
    const numbers = cleanStr.match(/\d+/g);
    if (numbers && numbers.length >= 3) {
      const d = parseInt(numbers[0], 10);
      const m = parseInt(numbers[1], 10);
      const y = numbers[2].length === 2 ? `20${numbers[2]}` : numbers[2];
      return `${d}/${m}/${y}`;
    }
  }

  // 4. Fallback parsing
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // 5. Regex match fallback
  const anyDateMatch = cleanStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (anyDateMatch) {
    const day = parseInt(anyDateMatch[1], 10);
    const month = parseInt(anyDateMatch[2], 10);
    const year = anyDateMatch[3];
    return `${day}/${month}/${year}`;
  }

  return dateStr;
};

interface Props {
  index: number;
  invoice: ExtendedInvoiceItem;
  isOpen: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onGenerateDoc?: (invoice: ExtendedInvoiceItem) => void;
  onUpdate?: (id: string, data: any) => void;
  onExtractDraft?: (id: string) => Promise<void>;
  displayName?: string;
  lazyRender?: boolean;
}

export const DashboardInvoiceRow: React.FC<Props> = ({
  index,
  invoice,
  isOpen,
  onToggle,
  onDelete,
  onGenerateDoc,
  onUpdate,
  onExtractDraft,
  displayName,
  lazyRender = true
}) => {
  const [localNotes, setLocalNotes] = useState(invoice.notes || '');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const initialDate = invoice.date ? formatVietnameseDate(invoice.date) : '';
  const initialContractDate = invoice.contractDate ? formatVietnameseDate(invoice.contractDate) : '';

  const [tempDate, setTempDate] = useState(initialDate);
  const [tempContractNumber, setTempContractNumber] = useState(invoice.contractNumber || '');
  const [tempContractDate, setTempContractDate] = useState(initialContractDate);
  const [isSavingFields, setIsSavingFields] = useState(false);

  // States for Column 2 (Project & Content editable details)
  const [tempPackage, setTempPackage] = useState(invoice.extractedData?.project?.packageName || invoice.extractedData?.project?.package || 'Xây lắp.');
  const [tempProject, setTempProject] = useState(invoice.extractedData?.project?.projectName || invoice.extractedData?.project?.name || 'Kênh cặp đường kênh 1 ấp 5, xã Phạm Văn Hai.');
  const [tempContent, setTempContent] = useState(invoice.extractedData?.content || (invoice.items && invoice.items.map((it: any) => `- ${it.description}`).join('\n')) || '');
  const [isSavingProject, setIsSavingProject] = useState(false);

  // Sync state if invoice notes or other fields change from parent
  useEffect(() => {
    setLocalNotes(invoice.notes || '');
    setTempDate(invoice.date ? formatVietnameseDate(invoice.date) : '');
    setTempContractNumber(invoice.contractNumber || '');
    setTempContractDate(invoice.contractDate ? formatVietnameseDate(invoice.contractDate) : '');
    setTempPackage(invoice.extractedData?.project?.packageName || invoice.extractedData?.project?.package || 'Xây lắp.');
    setTempProject(invoice.extractedData?.project?.projectName || invoice.extractedData?.project?.name || 'Kênh cặp đường kênh 1 ấp 5, xã Phạm Văn Hai.');
    setTempContent(invoice.extractedData?.content || (invoice.items && invoice.items.map((it: any) => `- ${it.description}`).join('\n')) || '');
  }, [invoice.notes, invoice.date, invoice.contractNumber, invoice.contractDate, invoice.extractedData, invoice.items]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  const handleSaveNotes = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdate) return;
    
    setIsSavingNote(true);
    setTimeout(() => {
      onUpdate(invoice.id, { notes: localNotes });
      setIsSavingNote(false);
    }, 400);
  };

  const handleSaveInvoiceFields = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdate) return;

    setIsSavingFields(true);
    setTimeout(() => {
      const convertToDbDate = (vietDateStr: string): string => {
        if (!vietDateStr) return '';
        const match = vietDateStr.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (match) {
          const d = match[1].padStart(2, '0');
          const m = match[2].padStart(2, '0');
          const y = match[3];
          return `${y}-${m}-${d}`;
        }
        return vietDateStr;
      };

      onUpdate(invoice.id, {
        date: convertToDbDate(tempDate),
        contractNumber: tempContractNumber,
        contractDate: convertToDbDate(tempContractDate)
      });
      setIsSavingFields(false);
    }, 400);
  };

  const handleSaveProjectAndContent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdate) return;

    setIsSavingProject(true);
    setTimeout(() => {
      onUpdate(invoice.id, {
        extractedData: {
          ...invoice.extractedData,
          project: {
            ...invoice.extractedData?.project,
            packageName: tempPackage,
            package: tempPackage,
            projectName: tempProject,
            name: tempProject
          },
          content: tempContent
        }
      });
      setIsSavingProject(false);
    }, 400);
  };

  const [isSavingVTCMAdmin, setIsSavingVTCMAdmin] = useState(false);

  const handleSaveVTCMAdmin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdate) return;

    setIsSavingVTCMAdmin(true);
    setTimeout(() => {
      const convertToDbDate = (vietDateStr: string): string => {
        if (!vietDateStr) return '';
        const match = vietDateStr.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (match) {
          const d = match[1].padStart(2, '0');
          const m = match[2].padStart(2, '0');
          const y = match[3];
          return `${y}-${m}-${d}`;
        }
        return vietDateStr;
      };

      onUpdate(invoice.id, {
        contractNumber: tempContractNumber,
        contractDate: convertToDbDate(tempContractDate),
        extractedData: {
          ...invoice.extractedData,
          project: {
            ...invoice.extractedData?.project,
            projectName: tempProject,
            name: tempProject
          }
        }
      });
      setIsSavingVTCMAdmin(false);
    }, 400);
  };

  const getClassificationName = () => {
    switch (invoice.classification) {
      case 'BB_TC': return 'Thi công';
      case 'BB_CM': return 'Ca máy';
      case 'BB_VT': return 'Vật tư';
      default: return invoice.classification || 'Vật tư';
    }
  };

  const getClassificationClass = () => {
    switch (invoice.classification) {
      case 'BB_TC': return 'status-thi-cong';
      case 'BB_VT': return 'status-vat-tu';
      case 'BB_CM': return 'status-ca-may';
      default: return 'status-vat-tu';
    }
  };

  const vatPercent = invoice.total > 0 && invoice.vat ? Math.round((invoice.vat / (invoice.total - invoice.vat)) * 100) : 8;

  const isThiCong = invoice.classification === 'BB_TC';

  const panelId = `panel-${invoice.id}`;
  const rowId = `row-${invoice.id}`;

  return (
    <div 
      className={`border rounded-2xl border-border-dark overflow-hidden transition-all duration-300 bg-sidebar-dark/20 ${
        isOpen ? 'row-expanded-highlight shadow-2xl' : 'hover:border-white/10'
      }`}
    >
      {/* 1. Summary Collapsed Grid Trigger */}
      <div
        ref={null as any}
        id={rowId}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className="invoice-row-grid p-5 cursor-pointer select-none focus:outline-none transition-colors border-none hover:bg-white/[0.01]"
      >
        {/* Column 1: STT */}
        <div className="text-xs font-bold text-text-dim/80">{index + 1}</div>

        {/* Column 2: Số hóa đơn & Symbol */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-extrabold text-white tracking-tight truncate">
            {invoice.invoiceNumber || '---'}
          </span>
          {invoice.invoiceSymbol && (
            <span className="text-[9px] text-text-dim font-bold mt-0.5 tracking-wide">
              {invoice.invoiceSymbol}
            </span>
          )}
        </div>

        {/* Column 3: Ngày xuất */}
        <div className="invoice-col-date text-center text-xs font-semibold text-white">
          {formatVietnameseDate(invoice.date)}
        </div>

        {/* Column 4: Bên Bán */}
        <div className="text-xs font-bold text-white break-words whitespace-normal leading-tight pr-1.5" title={invoice.companyName}>
          {invoice.companyName || '---'}
        </div>

        {/* Column 5: Bên Mua */}
        <div className="invoice-col-buyer text-xs font-bold text-text-dim break-words whitespace-normal leading-tight pr-1.5" title={invoice.buyerName}>
          {invoice.buyerName || '---'}
        </div>

        {/* Column 6: Số hợp đồng */}
        <div className="invoice-col-contract text-xs font-semibold text-text-dim break-words whitespace-normal leading-tight pr-1.5" title={invoice.contractNumber}>
          {invoice.contractNumber || '---'}
        </div>

        {/* Column 7: Ngày ký HĐ */}
        <div className="invoice-col-contract-date text-xs font-semibold text-text-dim/80 break-words whitespace-normal leading-tight pr-1.5">
          {invoice.contractDate ? formatVietnameseDate(invoice.contractDate) : '---'}
        </div>

        {/* Column 8: Tổng giá trị */}
        <div className="text-xs font-extrabold text-[#FF7A00]">
          {Number(invoice.total || 0).toLocaleString('vi-VN')} đ
        </div>

        {/* Column 9: Trạng thái */}
        <div>
          <span className={`badge-status ${getClassificationClass()}`}>
            {getClassificationName()}
          </span>
        </div>

        {/* Column 10: Nguồn */}
        <div>
          <span className={`badge-file-type ${invoice.type?.toLowerCase() === 'pdf' ? 'pdf' : 'xml'}`}>
            {invoice.type || 'PDF'}
          </span>
        </div>

        {/* Column 11: Expander Arrow */}
        <div className="p-1 text-text-dim flex justify-end">
          <ChevronDown 
            size={14} 
            className={`dashboard-chevron ${isOpen ? 'rotated text-[#FF7A00]' : ''}`}
          />
        </div>
      </div>

      {/* 2. Expanded Details Panel */}
      <div 
        id={panelId}
        role="region"
        aria-labelledby={rowId}
        aria-hidden={!isOpen}
        className={`dashboard-details-panel ${isOpen ? 'open' : ''}`}
      >
        <div className="dashboard-details-panel-inner">
          {(!lazyRender || isOpen) && (
            <div className="space-y-0">
              
              {/* Header inside Expanded row */}
              <div className="flex items-center justify-between p-4 bg-white/[0.02] border-b border-border-dark">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    invoice.type === 'PDF' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {invoice.type === 'PDF' ? <FileText size={20} /> : <FileCode size={20} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{displayName || 'Hóa đơn'}</h4>
                    <p className="text-[10px] text-text-dim font-bold mt-0.5 uppercase tracking-wider">
                      {formatVietnameseDate(invoice.date)} • {invoice.companyName}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`badge-status ${getClassificationClass()}`}>{getClassificationName()}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(invoice.id); }}
                    className="p-2 text-text-dim hover:text-red-400 rounded-lg hover:bg-red-500/10 hover-scale-btn shrink-0"
                    title="Xóa hóa đơn"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={onToggle}
                    className="p-2 text-text-dim hover:text-white rounded-lg hover-scale-btn shrink-0"
                  >
                    <ChevronDown size={18} className="dashboard-chevron rotated text-[#FF7A00]" />
                  </button>
                </div>
              </div>

              {/* 3-Column Content Grid */}
              <div className="expanded-grid-3cols border-t border-border-dark">
                
                {isThiCong ? (
                  <>
                    {/* Column 1: Partner & Contract Info */}
                    <div className="space-y-4">
                      {/* Contractor Box */}
                      <div className="detail-info-box">
                        <h5 className="text-[10px] font-black tracking-widest text-text-dim uppercase">Bên nhận thầu:</h5>
                        <div className="space-y-1">
                          <p className="text-xs font-extrabold text-white leading-tight">{invoice.companyName}</p>
                          <p className="text-[10px] text-text-dim font-bold">MST: {invoice.taxCode}</p>
                        </div>
                      </div>

                      {/* Client Box */}
                      <div className="detail-info-box">
                        <h5 className="text-[10px] font-black tracking-widest text-text-dim uppercase">Bên giao thầu:</h5>
                        <div className="space-y-1">
                          <p className="text-xs font-extrabold text-white leading-tight">{invoice.buyerName}</p>
                          {invoice.buyerTaxCode && (
                            <p className="text-[10px] text-text-dim font-bold">MST: {invoice.buyerTaxCode}</p>
                          )}
                        </div>
                      </div>

                      {/* Contract Info Box (Editable) */}
                      <div className="detail-info-box">
                        <h5 className="text-[10px] font-black tracking-widest text-text-dim uppercase">Thông tin hợp đồng</h5>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-text-dim uppercase">Số HĐ:</label>
                            <input 
                              type="text"
                              value={tempContractNumber}
                              onChange={(e) => setTempContractNumber(e.target.value)}
                              className="editable-input-field"
                              placeholder="Chưa có thông tin số HĐ"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-text-dim uppercase">Ngày ký:</label>
                            <input 
                              type="text"
                              value={tempContractDate}
                              onChange={(e) => setTempContractDate(e.target.value)}
                              className="editable-input-field"
                              placeholder="Chưa có thông tin ngày ký"
                            />
                          </div>
                          <button 
                            onClick={handleSaveInvoiceFields}
                            disabled={isSavingFields || (tempContractNumber === (invoice.contractNumber || '') && tempContractDate === initialContractDate && tempDate === initialDate)}
                            className="w-full py-2 mt-1 rounded-xl bg-[#FF7A00]/10 hover:bg-[#FF7A00] text-[#FF7A00] hover:text-white border border-[#FF7A00]/25 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed hover-scale-btn"
                          >
                            {isSavingFields ? 'Đang lưu...' : 'LƯU HỢP ĐỒNG'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Project & Content Details */}
                    <div className="space-y-4">
                      {/* Project & Package Box (Editable) */}
                      <div className="detail-info-box">
                        <h5 className="text-[10px] font-black tracking-widest text-text-dim uppercase">Thông tin dự án & gói thầu</h5>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-text-dim uppercase">Gói thầu:</label>
                            <input 
                              type="text"
                              value={tempPackage}
                              onChange={(e) => setTempPackage(e.target.value)}
                              className="editable-input-field"
                              placeholder="Chưa có thông tin gói thầu"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-text-dim uppercase">Dự án:</label>
                            <input 
                              type="text"
                              value={tempProject}
                              onChange={(e) => setTempProject(e.target.value)}
                              className="editable-input-field"
                              placeholder="Chưa có thông tin dự án"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Construction Content Box (Editable) */}
                      <div className="detail-info-box">
                        <h5 className="text-[10px] font-black tracking-widest text-text-dim uppercase">Nội dung thi công</h5>
                        <p className="text-[9px] text-text-dim font-bold italic -mt-1 leading-normal">Tách đoạn text dài thành các dòng để căn chỉnh</p>
                        <div className="space-y-3">
                          <textarea 
                            value={tempContent}
                            onChange={(e) => setTempContent(e.target.value)}
                            className="editable-textarea-field h-[110px]"
                            placeholder="Nhập nội dung thi công chi tiết..."
                          />
                          <button 
                            onClick={handleSaveProjectAndContent}
                            disabled={isSavingProject || (tempPackage === (invoice.extractedData?.project?.packageName || invoice.extractedData?.project?.package || 'Xây lắp.') && tempProject === (invoice.extractedData?.project?.projectName || invoice.extractedData?.project?.name || 'Kênh cặp đường kênh 1 ấp 5, xã Phạm Văn Hai.') && tempContent === (invoice.extractedData?.content || ''))}
                            className="w-full py-2 rounded-xl bg-[#FF7A00]/10 hover:bg-[#FF7A00] text-[#FF7A00] hover:text-white border border-[#FF7A00]/25 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed hover-scale-btn"
                          >
                            {isSavingProject ? 'Đang lưu...' : 'Lưu dự án & nội dung'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Column 1 & 2 merged: Vật tư & Ca máy layout */
                  <div className="material-detail-container">
                    {/* Administrative & Work editing area */}
                    <div className="detail-info-box">
                      <h5 className="text-[10px] font-black tracking-widest text-text-dim uppercase">Hiệu chỉnh thông tin hành chính & công trình</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-text-dim uppercase">Số hợp đồng:</label>
                          <input 
                            type="text"
                            value={tempContractNumber}
                            onChange={(e) => setTempContractNumber(e.target.value)}
                            className="editable-input-field"
                            placeholder="Chưa có thông tin số HĐ"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-text-dim uppercase">Ngày ký hợp đồng:</label>
                          <input 
                            type="text"
                            value={tempContractDate}
                            onChange={(e) => setTempContractDate(e.target.value)}
                            className="editable-input-field"
                            placeholder="Chưa có thông tin ngày ký"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-text-dim uppercase">Tên công trình:</label>
                          <input 
                            type="text"
                            value={tempProject}
                            onChange={(e) => setTempProject(e.target.value)}
                            className="editable-input-field"
                            placeholder="Chưa có thông tin công trình"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end mt-2">
                        <button 
                          onClick={handleSaveVTCMAdmin}
                          disabled={isSavingVTCMAdmin || (tempContractNumber === (invoice.contractNumber || '') && tempContractDate === initialContractDate && tempProject === (invoice.extractedData?.project?.projectName || invoice.extractedData?.project?.name || ''))}
                          className="px-6 py-2 rounded-xl bg-[#FF7A00]/10 hover:bg-[#FF7A00] text-[#FF7A00] hover:text-white border border-[#FF7A00]/25 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed hover-scale-btn"
                        >
                          {isSavingVTCMAdmin ? 'Đang lưu...' : 'Lưu hành chính'}
                        </button>
                      </div>
                    </div>

                    {/* Detailed Materials/Ca máy Table */}
                    <div className="overflow-x-auto rounded-xl border border-border-dark bg-black/20">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border-dark text-[9px] font-black text-text-dim uppercase tracking-wider bg-white/[0.02]">
                            <th className="py-2.5 px-3">TÊN</th>
                            <th className="py-2.5 px-3 text-center">ĐVT</th>
                            <th className="py-2.5 px-3 text-right">SL</th>
                            <th className="py-2.5 px-3 text-right">GIÁ</th>
                            <th className="py-2.5 px-3 text-right">THÀNH TIỀN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-dark/40 text-[10px] font-semibold text-white">
                          {invoice.items && invoice.items.length > 0 ? (
                            invoice.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-white/[0.01]">
                                <td className="py-2.5 px-3 leading-tight">{item.description}</td>
                                <td className="py-2.5 px-3 text-center text-text-dim font-bold">{item.unit || '-'}</td>
                                <td className="py-2.5 px-3 text-right">{Number(item.quantity || 0).toLocaleString('vi-VN')}</td>
                                <td className="py-2.5 px-3 text-right">{Number(item.price || 0).toLocaleString('vi-VN')} đ</td>
                                <td className="py-2.5 px-3 text-right text-white font-bold">{Number(item.total || 0).toLocaleString('vi-VN')} đ</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-text-dim/60 italic">Không có chi tiết vật tư</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Financial summary underneath the table */}
                    <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.01] border border-border-dark max-w-sm ml-auto w-full">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-text-muted">Tạm tính:</span>
                        <span className="font-bold text-white">{(invoice.total - invoice.vat).toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-text-muted">Thuế VAT ({vatPercent}%):</span>
                        <span className="font-bold text-white">{invoice.vat.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="h-px bg-border-dark my-1" />
                      <div className="flex justify-between items-center text-[13px] font-black text-[#FF7A00]">
                        <span>Tổng cộng:</span>
                        <span>{invoice.total.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Column 3: Value Summary & Actions */}
                <div className="space-y-4">
                  {/* Financial Summary Box */}
                  <div className="detail-info-box">
                    <h5 className="text-[10px] font-black tracking-widest text-text-dim uppercase">Tổng hợp giá trị</h5>
                    <div className="space-y-3 mt-1">
                      <div className="financial-row">
                        <span className="text-text-muted">Tạm tính:</span>
                        <span className="font-bold text-white">{(invoice.total - invoice.vat).toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="financial-row">
                        <span className="text-text-muted">VAT ({vatPercent}%):</span>
                        <span className="font-bold text-white">{invoice.vat.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="h-px bg-border-dark my-1" />
                      <div className="financial-row financial-row-total">
                        <span>Tổng cộng:</span>
                        <span>{invoice.total.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes & Attachments Box */}
                  <div className="detail-info-box">
                    <h5 className="text-[10px] font-black tracking-widest text-text-dim uppercase">Ghi chú & Tệp đính kèm</h5>
                    <div className="space-y-3">
                      
                      {/* Notes text area */}
                      <div className="relative group">
                        <textarea 
                          value={localNotes}
                          onChange={(e) => setLocalNotes(e.target.value)}
                          placeholder="Nhập ghi chú hoặc biên bản phụ cho hóa đơn này..."
                          className="editable-textarea-field h-[70px] pr-16"
                        />
                        <button 
                          onClick={handleSaveNotes}
                          disabled={isSavingNote || localNotes === invoice.notes}
                          className="absolute right-2 bottom-2 bg-[#FF7A00] hover:bg-[#E06C00] text-white text-[9px] font-black uppercase tracking-wider py-1 px-2.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover-scale-btn"
                        >
                          Lưu lại
                        </button>
                      </div>

                      {/* Attachments Box */}
                      {invoice.attachments && invoice.attachments.length > 0 ? (
                        <div className="space-y-1.5">
                          {invoice.attachments.map((file, i) => (
                            <div key={i} className="flex items-center justify-between p-2.5 bg-black/40 border border-border-dark rounded-xl">
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip size={12} className="text-[#FF7A00] shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-white truncate max-w-[140px]" title={file.name}>{file.name}</p>
                                  <p className="text-[9px] text-text-dim font-bold uppercase tracking-wider mt-0.5">Xem tệp gốc + {file.type.toUpperCase()}</p>
                                </div>
                              </div>
                              <a 
                                href={file.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  if (!file.url || file.url === '#') {
                                    e.preventDefault();
                                    alert(`Mô phỏng tải xuống tệp: ${file.name}`);
                                  }
                                }}
                                className="p-1.5 text-text-dim hover:text-white bg-white/5 hover:bg-white/10 rounded-lg hover-scale-btn"
                              >
                                <Download size={11} />
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-text-dim/50 italic text-center py-2 border border-dashed border-border-dark rounded-xl">
                          Không có tệp đính kèm nào
                        </p>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Generate Document Trigger inside details */}
              {onGenerateDoc && invoice.status !== 'draft' && (
                <div className="p-6 border-t border-border-dark flex justify-center bg-white/[0.01]">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onGenerateDoc(invoice); }}
                    className="action-btn-primary max-w-lg"
                  >
                    <FileText size={16} />
                    Tạo Biên bản đối chiếu ngay
                  </button>
                </div>
              )}

              {/* Extraction fallback for drafts */}
              {invoice.status === 'draft' && onExtractDraft && (
                <div className="p-6 border-t border-border-dark flex justify-center bg-white/[0.01]">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsExtracting(true); onExtractDraft(invoice.id).finally(() => setIsExtracting(false)); }}
                    disabled={isExtracting}
                    className="px-6 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-2 hover-scale-btn disabled:opacity-50"
                  >
                    {isExtracting ? <Loader2 className="size-4 animate-spin" /> : <Zap size={14} />}
                    Trích xuất AI từ Drive
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
