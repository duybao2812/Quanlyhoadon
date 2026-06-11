import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud, FileText, X, Loader2, CheckCircle2, AlertCircle,
  Eye, Save, RefreshCw, List, LayoutGrid, Plus, Trash2
} from 'lucide-react';
import { extractFromContract, convertContractDataToFormData } from '../../services/contractMistral';
import { ExtractedContractData } from '../../types/contractData';
import { useToast } from '../Notifications';
import { cn } from '../../lib/utils';

interface ContractUploadViewProps {
  onSave?: (data: any) => void;
  onBack?: () => void;
  editMode?: boolean;
  initialData?: any;
  initialFileUrl?: string;
  contractId?: string;
  initialFileName?: string;
}

// ─── Markdown Block Types ─────────────────────────────────────────────────────
type BlockType = 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'table' | 'list';

interface ContractBlock {
  id: string;
  type: BlockType;
  heading?: string;
  content: string;
  tableHeaders?: string[];
  tableRows?: string[][];
  listItems?: string[];
  level?: number;
}

// ─── Parse Markdown → Blocks ──────────────────────────────────────────────────
function parseMarkdownToBlocks(markdown: string): ContractBlock[] {
  if (!markdown || markdown.trim() === '') return [];
  const lines = markdown.split('\n');
  const blocks: ContractBlock[] = [];
  let idx = 0;
  let blockId = 0;

  while (idx < lines.length) {
    const idxBanDau = idx; // Luu lai index ban dau de kiem tra fail-safe
    const line = lines[idx];
    const trimmed = line.trim();

    if (trimmed === '') { idx++; continue; }

    // Heading 1
    if (trimmed.startsWith('# ')) {
      blocks.push({ id: `block_${blockId++}`, type: 'heading1', heading: trimmed.slice(2).trim(), content: trimmed.slice(2).trim(), level: 1 });
      idx++;
      continue;
    }

    // Heading 2
    if (trimmed.startsWith('## ')) {
      const heading = trimmed.slice(3).trim();
      // Thu thap noi dung tiep theo cho den khi gap heading moi hoac table
      idx++;
      const contentLines: string[] = [];
      while (idx < lines.length) {
        const next = lines[idx].trim();
        if (next.startsWith('#') || (next.startsWith('|') && next.endsWith('|'))) break;
        contentLines.push(lines[idx]);
        idx++;
      }
      blocks.push({ id: `block_${blockId++}`, type: 'heading2', heading, content: contentLines.join('\n').trim(), level: 2 });
      continue;
    }

    // Heading 3
    if (trimmed.startsWith('### ')) {
      const heading = trimmed.slice(4).trim();
      idx++;
      const contentLines: string[] = [];
      while (idx < lines.length) {
        const next = lines[idx].trim();
        if (next.startsWith('#') || (next.startsWith('|') && next.endsWith('|'))) break;
        contentLines.push(lines[idx]);
        idx++;
      }
      blocks.push({ id: `block_${blockId++}`, type: 'heading3', heading, content: contentLines.join('\n').trim(), level: 3 });
      continue;
    }

    // Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (idx < lines.length && lines[idx].trim().startsWith('|')) {
        tableLines.push(lines[idx].trim());
        idx++;
      }
      // Loc cac dong phan cach kieu (---|---)
      const validRows = tableLines.filter(l => !l.match(/^\|[\s\-|:]+\|$/));
      if (validRows.length > 0) {
        const parseRow = (row: string) =>
          row.split('|').slice(1, -1).map(c => c.trim());
        const [headerRow, ...dataRows] = validRows;
        blocks.push({
          id: `block_${blockId++}`,
          type: 'table',
          content: '',
          tableHeaders: parseRow(headerRow),
          tableRows: dataRows.map(parseRow)
        });
      }
      continue;
    }

    // List
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.match(/^\d+\.\s/)) {
      const listItems: string[] = [];
      while (idx < lines.length) {
        const l = lines[idx].trim();
        if (!l.startsWith('- ') && !l.startsWith('* ') && !l.match(/^\d+\.\s/) && l !== '') break;
        if (l !== '') listItems.push(l.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''));
        idx++;
      }
      blocks.push({ id: `block_${blockId++}`, type: 'list', content: '', listItems });
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (idx < lines.length) {
      const l = lines[idx].trim();
      
      // Dong bo dieu kien dung Paragraph voi cac dieu kien cua khoi khac o vong lap cha
      const laHeading = l.startsWith('# ') || l.startsWith('## ') || l.startsWith('### ');
      const laTable = l.startsWith('|') && l.endsWith('|');
      const laList = l.startsWith('- ') || l.startsWith('* ') || /^\d+\.\s/.test(l);
      const laDongTrong = l === '';
      
      if (laHeading || laTable || laList || laDongTrong) break;
      
      paraLines.push(lines[idx]);
      idx++;
    }
    if (paraLines.join('').trim()) {
      blocks.push({ id: `block_${blockId++}`, type: 'paragraph', content: paraLines.join('\n').trim() });
    }

    // Fail-safe bao ve de ngan chan vong lap vo han tuyet doi
    if (idx === idxBanDau) {
      idx++;
    }
  }

  return blocks;
}

// ─── Number formatting helpers ────────────────────────────────────────────────
const MONEY_KEYWORDS = ['đơn giá', 'thành tiền', 'vat', 'thuế', 'tổng cộng', 'tổng tiền', 'giá trị', 'chi phí', 'tiền'];
const isMoneyColumn = (header: string) =>
  MONEY_KEYWORDS.some(k => header.toLowerCase().includes(k));

const formatMoney = (val: string) => {
  const clean = val.replace(/[^0-9]/g, '');
  if (!clean) return val;
  return parseInt(clean, 10).toLocaleString('de-DE');
};

const unformatMoney = (val: string) => val.replace(/\./g, '');

// Chuyen doi link Drive sang dang preview de nhung iframe khong bi chan
const getEmbedUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    let embedUrl = url;
    if (embedUrl.includes('/view')) {
      embedUrl = embedUrl.replace(/\/view.*/, '/preview');
    } else if (!embedUrl.includes('/preview')) {
      const match = embedUrl.match(/[?&]id=([^&]+)/);
      if (match) {
        embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    return embedUrl;
  }
  return url;
};

// ─── Component tu dong co gian chieu cao cho textarea de tranh cuon doc ────────
interface AutoHeightTextareaProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

const AutoHeightTextarea: React.FC<AutoHeightTextareaProps> = ({
  value,
  onChange,
  placeholder = '',
  className = '',
  style = {}
}) => {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  React.useEffect(() => {
    adjustHeight();
  }, [value]);

  // Su dung ResizeObserver de tu dong tinh toan va cap nhat chieu cao khi element duoc bat tat hoac lay out thay doi
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      adjustHeight();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={adjustHeight}
      placeholder={placeholder}
      className={className}
      style={{
        ...style,
        resize: 'none',
        overflow: 'hidden'
      }}
      rows={1}
    />
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const ContractUploadView: React.FC<ContractUploadViewProps> = ({ 
  onSave, onBack, editMode = false, initialData, initialFileUrl, contractId, initialFileName 
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedContractData | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [contractBlocks, setContractBlocks] = useState<ContractBlock[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmptyFields, setShowEmptyFields] = useState(false);
  const [activeTab, setActiveTab] = useState<'standard' | 'structure'>('standard');
  const [progressMessage, setProgressMessage] = useState<string>('');

  // Nap du lieu ban dau khi o che do Edit Mode
  React.useEffect(() => {
    if (editMode && initialData) {
      setFormData(initialData);
      setPreviewUrl(initialFileUrl || initialData._pdfUrl || '');
      setExtractedData({
        contract: {
          templateId: initialData.templateId || '',
          number: initialData.contractNumber || '',
          date: initialData.contractDate || '',
          effectiveDate: initialData.effectiveDate || '',
          expiredDate: initialData.expiredDate || ''
        },
        parties: {
          partyA: initialData.partyA || {},
          partyB: initialData.partyB || {}
        },
        project: {
          name: initialData.projectName || '',
          address: initialData.projectAddress || '',
          value: initialData.value || 0,
          valueInWords: initialData.valueInWords || ''
        },
        work: {
          description: initialData.workDescription || '',
          startDate: initialData.startDate || '',
          endDate: initialData.endDate || '',
          items: initialData.items || []
        },
        payment: {
          method: initialData.paymentMethod || '',
          term: initialData.paymentTerm || '',
          advancePercentage: initialData.advancePercentage || 0,
          vatRate: initialData.vatRate || 10,
          values: initialData.values || []
        },
        terms: {
          warranty: initialData.warrantyPeriod || '',
          penalty: initialData.penaltyClause || '',
          termination: initialData.terminationClause || '',
          disputeResolution: initialData.disputeResolution || '',
          other: initialData.otherTerms || ''
        },
        markdownContent: initialData.markdownContent || ''
      });
      if (initialData.markdownContent) {
        setContractBlocks(parseMarkdownToBlocks(initialData.markdownContent));
      }
    }
  }, [editMode, initialData, initialFileUrl]);

  // ── Field visibility helpers ──
  const shouldRenderField = (value: any) => {
    if (showEmptyFields) return true;
    if (value === undefined || value === null) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'number' && value === 0) return false;
    return true;
  };

  const hasVisibleFields = (fields: any[]) => {
    if (showEmptyFields) return true;
    return fields.some(f => {
      if (f === undefined || f === null) return false;
      if (typeof f === 'string' && f.trim() !== '') return true;
      if (typeof f === 'number' && f !== 0) return true;
      return false;
    });
  };

  // ── FormField component ──
  const FormField = ({
    label, value, onChange, type = 'text', placeholder = '',
    isTextArea = false, className = '', rows = 2
  }: {
    label: string; value: any; onChange: (val: any) => void;
    type?: string; placeholder?: string; isTextArea?: boolean;
    className?: string; rows?: number;
  }) => {
    if (!shouldRenderField(value)) return null;
    return (
      <div className={className}>
        <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider">{label}</label>
        {type === 'money' ? (
          <input
            type="text"
            value={value !== undefined && value !== null ? formatMoney(String(value)) : ''}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '');
              onChange(parseInt(raw) || 0);
            }}
            placeholder={placeholder}
            className="mt-1 w-full px-3 py-2 bg-sidebar-dark border border-border-dark rounded-xl text-xs text-amber-300 focus:border-primary focus:outline-none transition-colors text-right font-bold"
          />
        ) : type === 'number' ? (
          <input
            type="number"
            value={value !== undefined && value !== null ? value : ''}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            placeholder={placeholder}
            className="mt-1 w-full px-3 py-2 bg-sidebar-dark border border-border-dark rounded-xl text-xs text-white focus:border-primary focus:outline-none transition-colors"
          />
        ) : (
          <AutoHeightTextarea
            value={value !== undefined && value !== null ? String(value) : ''}
            onChange={onChange}
            placeholder={placeholder}
            className="mt-1 w-full px-3 py-2 bg-sidebar-dark border border-border-dark rounded-xl text-xs text-white focus:border-primary focus:outline-none transition-colors leading-relaxed"
          />
        )}
      </div>
    );
  };

  // ── Dropzone ──
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(f =>
      ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(f.type)
    );
    if (validFiles.length !== acceptedFiles.length) {
      toast('Tệp không hợp lệ: Chỉ chấp nhận file PDF, PNG, JPG', 'error');
    }
    setFiles(prev => [...prev, ...validFiles]);
    setError(null);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
    maxFiles: 5,
    disabled: isProcessing
  });

  // ── Process ──
  const handleProcess = async () => {
    if (files.length === 0) { toast('Vui lòng tải lên ít nhất 1 tệp hợp đồng', 'error'); return; }
    setIsProcessing(true);
    setError(null);
    setExtractedData(null);
    setFormData(null);
    setContractBlocks([]);
    setProgressMessage('Đang chuẩn bị tệp tin...');

    try {
      const file = files[0];
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }

      console.log(`[CONTRACT-UPLOAD] Dang xu ly: ${file.name}`);
      const result = await extractFromContract(file, (progress) => {
        setProgressMessage(progress);
      });
      setExtractedData(result);

      const converted = convertContractDataToFormData(result);
      setFormData(converted);

      // Parse Markdown → Blocks for "Cấu trúc tài liệu" tab
      if (converted.markdownContent) {
        const blocks = parseMarkdownToBlocks(converted.markdownContent);
        setContractBlocks(blocks);
      }

      toast(`Trích xuất thành công! Đã đọc xong: ${file.name}`, 'success');
    } catch (err: any) {
      const msg = err.message || 'Không thể xử lý tệp hợp đồng';
      setError(msg);
      toast(`Lỗi xử lý: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Field change handlers ──
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const updated = { ...prev, [field]: value };
      
      // Dong bo tu dong "Tong gia tri hop dong" trong bang values sang gia tri formData.value
      if (field === 'values' && Array.isArray(value)) {
        const mainValRow = value.find((v: any) => 
          v.type && /tổng giá trị|giá trị hợp đồng/i.test(v.type)
        );
        if (mainValRow) {
          updated.value = parseInt(mainValRow.value) || 0;
        }
      }
      return updated;
    });
  };

  const handlePartyChange = (party: 'partyA' | 'partyB', field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [party]: { ...prev[party], [field]: value } }));
  };

  const handleBlockChange = (blockId: string, newContent: string) => {
    setContractBlocks(prev => prev.map(b => b.id === blockId ? { ...b, content: newContent } : b));
  };

  const handleBlockTableCellChange = (blockId: string, rowIdx: number, colIdx: number, value: string) => {
    setContractBlocks(prev => prev.map(b => {
      if (b.id !== blockId || !b.tableRows) return b;
      const newRows = b.tableRows.map((row, ri) =>
        ri === rowIdx ? row.map((cell, ci) => ci === colIdx ? value : cell) : row
      );
      return { ...b, tableRows: newRows };
    }));
  };

  const handleBlockListItemChange = (blockId: string, itemIdx: number, value: string) => {
    setContractBlocks(prev => prev.map(b => {
      if (b.id !== blockId || !b.listItems) return b;
      const newItems = [...b.listItems];
      newItems[itemIdx] = value;
      return { ...b, listItems: newItems };
    }));
  };

  // ── Save ──
  const handleSave = () => {
    if (!formData) return;
    // Reconstruct markdownContent from edited blocks
    const updatedMarkdown = contractBlocks.map(b => {
      if (b.type === 'heading1') return `# ${b.content}`;
      if (b.type === 'heading2') return `## ${b.heading}\n${b.content}`;
      if (b.type === 'heading3') return `### ${b.heading}\n${b.content}`;
      if (b.type === 'table' && b.tableHeaders) {
        const header = `| ${b.tableHeaders.join(' | ')} |`;
        const sep = `| ${b.tableHeaders.map(() => '---').join(' | ')} |`;
        const rows = (b.tableRows || []).map(r => `| ${r.join(' | ')} |`).join('\n');
        return `${header}\n${sep}\n${rows}`;
      }
      if (b.type === 'list' && b.listItems) {
        return b.listItems.map(item => `- ${item}`).join('\n');
      }
      return b.content;
    }).join('\n\n');

    const contractData = {
      formData: { ...formData, markdownContent: updatedMarkdown },
      fileName: files[0]?.name || initialFileName || 'hop-dong.pdf',
      extractedData,
      previewUrl,
      file: files[0] || null   // Truyen File goc de upload Drive
    };
    onSave?.(contractData);
    toast('Thông tin hợp đồng đã được lưu thành công!', 'success');
  };

  const handleReset = () => {
    setFiles([]);
    setExtractedData(null);
    setFormData(null);
    setContractBlocks([]);
    setPreviewUrl(null);
    setError(null);
  };

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

  // ─── Render "Cấu trúc tài liệu" blocks ──────────────────────────────────────
  const renderDocumentBlocks = () => {
    if (contractBlocks.length === 0) {
      return (
        <div className="text-center py-10 text-text-dim text-xs">
          <FileText className="size-10 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">Chưa có dữ liệu cấu trúc tài liệu.</p>
          <p className="mt-1 opacity-70">AI sẽ tự động phân tích và hiển thị ở đây sau khi trích xuất.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {contractBlocks.map((block) => {
          if (block.type === 'heading1') {
            return (
              <div key={block.id} className="text-center pb-2 border-b border-border-dark/50">
                <h3 className="font-black text-sm text-amber-400 uppercase tracking-wider leading-tight">
                  {block.content}
                </h3>
              </div>
            );
          }

          if (block.type === 'heading2') {
            return (
              <div key={block.id} className="bg-sidebar-dark/30 border border-border-dark/60 rounded-xl overflow-hidden">
                <div className="bg-primary/10 border-b border-primary/20 px-3 py-2">
                  <span className="text-[11px] font-black text-primary uppercase tracking-wider">
                    {block.heading}
                  </span>
                </div>
                <div className="p-3">
                  <textarea
                    value={block.content}
                    onChange={(e) => handleBlockChange(block.id, e.target.value)}
                    rows={Math.max(3, (block.content.match(/\n/g) || []).length + 2)}
                    className="w-full px-3 py-2 bg-sidebar-dark border border-border-dark rounded-lg text-xs text-white/90 focus:border-primary focus:outline-none transition-colors resize-none leading-relaxed"
                  />
                </div>
              </div>
            );
          }

          if (block.type === 'heading3') {
            return (
              <div key={block.id} className="ml-3 border-l-2 border-primary/30 pl-3">
                <div className="mb-1">
                  <span className="text-[10px] font-bold text-primary/80 uppercase tracking-wider">
                    {block.heading}
                  </span>
                </div>
                <textarea
                  value={block.content}
                  onChange={(e) => handleBlockChange(block.id, e.target.value)}
                  rows={Math.max(2, (block.content.match(/\n/g) || []).length + 2)}
                  className="w-full px-3 py-2 bg-sidebar-dark border border-border-dark rounded-lg text-xs text-white/80 focus:border-primary focus:outline-none transition-colors resize-none leading-relaxed"
                />
              </div>
            );
          }

          if (block.type === 'paragraph') {
            return (
              <div key={block.id}>
                <textarea
                  value={block.content}
                  onChange={(e) => handleBlockChange(block.id, e.target.value)}
                  rows={Math.max(2, (block.content.match(/\n/g) || []).length + 2)}
                  className="w-full px-3 py-2 bg-sidebar-dark/50 border border-border-dark/60 rounded-lg text-xs text-white/70 focus:border-primary focus:outline-none transition-colors resize-none leading-relaxed"
                />
              </div>
            );
          }

          if (block.type === 'table' && block.tableHeaders) {
            return (
              <div key={block.id} className="overflow-x-auto rounded-xl border border-border-dark bg-sidebar-dark/20">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-dark">
                      {block.tableHeaders.map((h, ci) => (
                        <th key={ci} className="p-2 font-bold text-text-dim uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark/50">
                    {(block.tableRows || []).map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => {
                          const header = block.tableHeaders![ci] || '';
                          const isMoney = isMoneyColumn(header);
                          return (
                            <td key={ci} className="p-1">
                              {isMoney ? (
                                <input
                                  type="text"
                                  value={cell !== '' ? formatMoney(cell) : ''}
                                  onChange={(e) => handleBlockTableCellChange(block.id, ri, ci, unformatMoney(e.target.value))}
                                  className="w-full min-w-[100px] px-2 py-1 bg-sidebar-dark border border-border-dark rounded-lg text-xs text-amber-300 focus:border-primary focus:outline-none transition-colors text-right"
                                />
                              ) : (
                                <textarea
                                  value={cell}
                                  onChange={(e) => handleBlockTableCellChange(block.id, ri, ci, e.target.value)}
                                  rows={1}
                                  className="w-full min-w-[80px] px-2 py-1 bg-sidebar-dark border border-border-dark rounded-lg text-xs text-white focus:border-primary focus:outline-none transition-colors resize-none"
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setContractBlocks(prev => prev.map(b => {
                        if (b.id !== block.id || !b.tableHeaders) return b;
                        const emptyRow = b.tableHeaders.map(() => '');
                        return { ...b, tableRows: [...(b.tableRows || []), emptyRow] };
                      }));
                    }}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 text-text-dim hover:text-white border border-border-dark rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                  >
                    <Plus className="size-3" /> Thêm dòng
                  </button>
                </div>
              </div>
            );
          }

          if (block.type === 'list' && block.listItems) {
            return (
              <div key={block.id} className="space-y-1.5">
                {block.listItems.map((item, ii) => (
                  <div key={ii} className="flex items-start gap-2">
                    <span className="text-primary/60 mt-2 text-xs shrink-0">•</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleBlockListItemChange(block.id, ii, e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-sidebar-dark border border-border-dark rounded-lg text-xs text-white focus:border-primary focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setContractBlocks(prev => prev.map(b => {
                          if (b.id !== block.id || !b.listItems) return b;
                          return { ...b, listItems: b.listItems!.filter((_, i) => i !== ii) };
                        }));
                      }}
                      className="p-1 text-red-400/60 hover:text-red-400 transition-colors mt-0.5"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setContractBlocks(prev => prev.map(b => {
                      if (b.id !== block.id || !b.listItems) return b;
                      return { ...b, listItems: [...b.listItems!, ''] };
                    }));
                  }}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 text-text-dim hover:text-white border border-border-dark rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 mt-1"
                >
                  <Plus className="size-3" /> Thêm mục
                </button>
              </div>
            );
          }

          return null;
        })}
      </div>
    );
  };

  // ─── Render "Cac loai gia tri hop dong" table ──────────────────────────────
  const renderContractValuesTable = () => {
    const values = formData.values || [];

    return (
      <div className="space-y-2">
        <div className="overflow-x-auto rounded-xl border border-border-dark bg-sidebar-dark/20 p-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-dark">
                <th className="p-2 font-bold text-text-dim uppercase tracking-wider w-[25%] min-w-[120px]">Loại giá trị</th>
                <th className="p-2 font-bold text-text-dim uppercase tracking-wider w-[25%] min-w-[120px]">Số tiền (VND)</th>
                <th className="p-2 font-bold text-text-dim uppercase tracking-wider">Mô tả / Điều khoản</th>
                <th className="p-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/50">
              {/* Dong gia tri hop dong co dinh de dong bo voi value va valueInWords */}
              <tr className="h-auto bg-primary/[0.02] border-b border-border-dark/70 font-bold">
                <td className="p-1 w-[25%]">
                  <div className="w-full px-2 py-1.5 text-xs text-amber-400 font-bold">
                    Giá trị hợp đồng
                  </div>
                </td>
                <td className="p-1 w-[25%]">
                  <input
                    type="text"
                    value={formData.value !== undefined && formData.value !== null && formData.value !== 0 ? formatMoney(String(formData.value)) : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      handleFieldChange('value', parseInt(raw) || 0);
                    }}
                    className="w-full px-2 py-1 bg-sidebar-dark border border-border-dark rounded-lg text-xs text-amber-300 focus:border-primary focus:outline-none transition-colors text-right font-bold"
                    placeholder="0"
                  />
                </td>
                <td className="p-1">
                  <AutoHeightTextarea
                    value={formData.valueInWords || ''}
                    onChange={(v) => {
                      handleFieldChange('valueInWords', v);
                    }}
                    className="w-full px-2 py-1 bg-sidebar-dark border border-border-dark rounded-lg text-xs text-white focus:border-primary focus:outline-none transition-colors resize-none overflow-hidden whitespace-normal break-words h-auto"
                    placeholder="Giá trị hợp đồng bằng chữ..."
                  />
                </td>
                <td className="p-1 text-center w-8">
                  <span className="text-text-dim/30 select-none">-</span>
                </td>
              </tr>

              {/* Cac dong gia tri phu (tam ung, bao hanh...) */}
              {values.map((val: any, idx: number) => (
                <tr key={idx} className="h-auto">
                  <td className="p-1 w-[25%]">
                    {/* O nhap loai gia tri voi tinh nang tu dong co gian chieu cao */}
                    <AutoHeightTextarea
                      value={val.type || ''}
                      onChange={(v) => {
                        const nextVals = [...values];
                        nextVals[idx] = { ...nextVals[idx], type: v };
                        handleFieldChange('values', nextVals);
                      }}
                      className="w-full px-2 py-1 bg-sidebar-dark border border-border-dark rounded-lg text-xs text-white focus:border-primary focus:outline-none transition-colors resize-none overflow-hidden whitespace-normal break-words h-auto"
                      placeholder="VD: Tạm ứng, Bảo hành..."
                    />
                  </td>
                  <td className="p-1 w-[25%]">
                    <input
                      type="text"
                      value={val.value !== undefined && val.value !== null && val.value !== 0 ? formatMoney(String(val.value)) : ''}
                      onChange={(e) => {
                        const nextVals = [...values];
                        const raw = e.target.value.replace(/\D/g, '');
                        nextVals[idx] = { ...nextVals[idx], value: parseInt(raw) || 0 };
                        handleFieldChange('values', nextVals);
                      }}
                      className="w-full px-2 py-1 bg-sidebar-dark border border-border-dark rounded-lg text-xs text-amber-300 focus:border-primary focus:outline-none transition-colors text-right"
                      placeholder="0"
                    />
                  </td>
                  <td className="p-1">
                    <AutoHeightTextarea
                      value={val.description || ''}
                      onChange={(v) => {
                        const nextVals = [...values];
                        nextVals[idx] = { ...nextVals[idx], description: v };
                        handleFieldChange('values', nextVals);
                      }}
                      className="w-full px-2 py-1 bg-sidebar-dark border border-border-dark rounded-lg text-xs text-white focus:border-primary focus:outline-none transition-colors resize-none overflow-hidden whitespace-normal break-words h-auto"
                      placeholder="Mô tả điều khoản liên quan..."
                    />
                  </td>
                  <td className="p-1 text-center w-8">
                    <button
                      type="button"
                      onClick={() => {
                        const nextVals = values.filter((_: any, i: number) => i !== idx);
                        handleFieldChange('values', nextVals);
                      }}
                      className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                    >
                      <X className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 p-1">
            <button
              type="button"
              onClick={() => {
                const newValue = { type: '', value: 0, valueInWords: '', description: '' };
                handleFieldChange('values', [...values, newValue]);
              }}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white border border-border-dark rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <Plus className="size-3" /> Thêm giá trị mới
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render "Trường chuẩn" items table ───────────────────────────────────────
  const renderStandardItemsTable = () => {
    // An hoan toan khoi bang gia tri rong
    if (!formData?.items || formData.items.length === 0) {
      return null;
    }

    const headers = Object.keys(formData.items[0]);
    return (
      <div className="overflow-x-auto rounded-xl border border-border-dark bg-sidebar-dark/20 p-2">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-dark">
              {headers.map((h) => (
                <th key={h} className="p-2 font-bold text-text-dim uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
              <th className="p-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dark/50">
            {formData.items.map((item: any, rowIdx: number) => (
              <tr key={rowIdx}>
                {headers.map((h) => {
                  const isMoney = isMoneyColumn(h);
                  const cellVal = item[h] !== undefined && item[h] !== null ? String(item[h]) : '';
                  return (
                    <td key={h} className="p-1">
                      {isMoney ? (
                        <input
                          type="text"
                          value={cellVal !== '' ? formatMoney(cellVal) : ''}
                          onChange={(e) => {
                            const nextItems = [...formData.items];
                            nextItems[rowIdx] = { ...nextItems[rowIdx], [h]: unformatMoney(e.target.value) };
                            handleFieldChange('items', nextItems);
                          }}
                          className="w-full min-w-[110px] px-2 py-1 bg-sidebar-dark border border-border-dark rounded-lg text-xs text-amber-300 focus:border-primary focus:outline-none transition-colors text-right"
                        />
                      ) : (
                        /* Su dung AutoHeightTextarea cho cac o nhap text thuong de tu dong co gian chieu cao */
                        <AutoHeightTextarea
                          value={cellVal}
                          onChange={(v) => {
                            const nextItems = [...formData.items];
                            nextItems[rowIdx] = { ...nextItems[rowIdx], [h]: v };
                            handleFieldChange('items', nextItems);
                          }}
                          className="w-full min-w-[80px] px-2 py-1 bg-sidebar-dark border border-border-dark rounded-lg text-xs text-white focus:border-primary focus:outline-none transition-colors resize-none overflow-hidden whitespace-normal break-words h-auto"
                          style={{ minHeight: '30px' }}
                        />
                      )}
                    </td>
                  );
                })}
                <td className="p-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      const nextItems = formData.items.filter((_: any, i: number) => i !== rowIdx);
                      handleFieldChange('items', nextItems);
                    }}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 p-1">
          <button
            type="button"
            onClick={() => {
              const templateItem = { ...formData.items[0] };
              Object.keys(templateItem).forEach(k => { templateItem[k] = ''; });
              handleFieldChange('items', [...formData.items, templateItem]);
            }}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white border border-border-dark rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
          >
            <Plus className="size-3" /> Thêm dòng mới
          </button>
        </div>
      </div>
    );
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      {!editMode && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              Đọc và bóc tách Hợp đồng / Văn bản
            </h3>
            <p className="text-xs text-text-dim mt-1">
              Tải lên tệp hợp đồng (PDF, ảnh) để AI Mistral tự động trích xuất dữ liệu
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-sidebar-dark border border-border-dark rounded-xl text-xs font-bold text-text-dim hover:text-white transition-colors"
            >
              ← Quay lại
            </button>
          )}
        </div>
      )}

      {/* Upload Zone */}
      {!editMode && !extractedData && (
        <div {...(getRootProps() as any)}>
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={cn(
              "border-2 border-dashed rounded-3xl p-8 transition-all duration-300 cursor-pointer",
              isDragActive ? "border-primary bg-primary/10" : "border-border-dark hover:border-primary/50 hover:bg-white/[0.02]"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center py-8">
              <UploadCloud className={cn("size-16 mb-4 transition-colors", isDragActive ? "text-primary" : "text-text-dim")} />
              <p className="text-sm font-bold text-white mb-2">
                {isDragActive ? 'Thả tệp vào đây...' : 'Kéo thả tệp hợp đồng vào đây'}
              </p>
              <p className="text-xs text-text-dim">Hoặc click để chọn tệp (PDF, PNG, JPG - Tối đa 5 tệp)</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* File List */}
      {!editMode && files.length > 0 && !extractedData && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-sidebar-dark/40 border border-border-dark rounded-2xl">
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-bold text-white">{file.name}</p>
                  <p className="text-xs text-text-dim">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              {!isProcessing && (
                <button onClick={() => removeFile(index)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors">
                  <X className="size-4 text-red-400" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleProcess} disabled={isProcessing}
            className={cn(
              "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300",
              isProcessing ? "bg-sidebar-dark text-text-dim cursor-not-allowed" : "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 active:scale-[0.98]"
            )}
          >
            {isProcessing ? (
              <span className="flex flex-col items-center justify-center gap-1.5 py-1">
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Đang xử lý tệp hợp đồng...
                </span>
                {progressMessage && (
                  <span className="text-[10px] text-text-dim/80 lowercase font-medium italic">
                    ({progressMessage})
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Eye className="size-4" />
                Đọc và trích xuất dữ liệu
              </span>
            )}
          </button>
        </motion.div>
      )}

      {/* Error */}
      {!editMode && error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3">
          <AlertCircle className="size-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-400">Lỗi xử lý</p>
            <p className="text-xs text-red-300/80 mt-1">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Success */}
      {!editMode && extractedData && !error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="size-5 text-emerald-400" />
          <div>
            <p className="text-sm font-bold text-emerald-400">Trích xuất thành công</p>
            <p className="text-xs text-emerald-300/80 mt-1">
              Hợp đồng đã được AI đọc và điền dữ liệu. Kiểm tra và chỉnh sửa trong 2 tab bên dưới.
            </p>
          </div>
        </motion.div>
      )}

      {/* Result Modal */}
      <AnimatePresence>
        {extractedData && formData && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm"
              onClick={editMode ? onBack : handleReset}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-0 z-[111] flex items-center justify-center p-4 md:p-6"
            >
              <div
                className="w-full max-w-[95vw] lg:max-w-[90vw] max-h-[92vh] overflow-hidden rounded-[28px] border border-border-dark bg-[#111111] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-6">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-400" />
                      {editMode ? 'Chỉnh sửa dữ liệu hợp đồng' : 'Kết quả trích xuất hợp đồng'}
                    </h4>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-text-dim">
                      {editMode ? 'Chỉnh sửa thông tin hợp đồng và các hạng mục chi tiết' : 'AI Mistral đã điền dữ liệu, bạn có thể kiểm tra và chỉnh sửa trước khi lưu'}
                    </p>
                  </div>
                  <button
                    type="button" onClick={editMode ? onBack : handleReset}
                    className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-text-dim transition-colors hover:text-white"
                    aria-label="Đóng cửa sổ kết quả"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="grid h-auto lg:h-[calc(92vh-81px)] max-h-[calc(92vh-81px)] grid-cols-1 gap-0 overflow-y-auto lg:overflow-hidden lg:grid-cols-12">

                  {/* Left: PDF Preview */}
                  <div className="space-y-4 overflow-y-auto border-b border-white/10 p-5 custom-scrollbar lg:border-b-0 lg:border-r lg:border-white/10 md:p-6 lg:h-full lg:col-span-7">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Eye className="size-4 text-primary" />
                      Tài liệu gốc
                    </h4>
                    <div className="bg-sidebar-dark/40 border border-border-dark rounded-2xl p-4 min-h-[400px] flex items-center justify-center">
                      {/* Them hash view=FitH de trinh duyet tu dong hien thi vua khit chieu rong (Fit to Width) */}
                      {previewUrl ? (
                        (files[0]?.type === 'application/pdf' || previewUrl.toLowerCase().includes('.pdf') || previewUrl.includes('drive.google.com') || previewUrl.includes('docs.google.com')) ? (
                          <iframe
                            src={
                              previewUrl && !previewUrl.includes('drive.google.com') && !previewUrl.includes('docs.google.com')
                                ? (previewUrl.includes('#') ? previewUrl : `${previewUrl}#view=FitH`)
                                : getEmbedUrl(previewUrl)
                            }
                            title="Xem trước PDF"
                            className="w-full h-[500px] lg:h-[calc(92vh-180px)] rounded-lg border border-border-dark bg-[#1a1a1a]"
                          />
                        ) : (
                          <img src={previewUrl} alt="Xem trước" className="max-w-full max-h-[600px] object-contain rounded-lg" />
                        )
                      ) : (
                        <div className="text-center py-12">
                          <FileText className="size-16 text-text-dim mx-auto mb-4" />
                          <p className="text-sm text-text-dim">{files[0]?.name || 'Tài liệu PDF'}</p>
                          <p className="text-xs text-text-dim/60 mt-2">Không thể xem trước PDF</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Editable Data */}
                  <div className="flex flex-col lg:h-full lg:col-span-5 overflow-hidden">
                    {/* Tab Bar */}
                    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 md:px-6 shrink-0 border-b border-white/10">
                      <div className="flex gap-1 bg-black/30 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => setActiveTab('standard')}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                            activeTab === 'standard' ? "bg-primary text-white shadow" : "text-text-dim hover:text-white"
                          )}
                        >
                          <LayoutGrid className="size-3" /> Trường chuẩn
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('structure')}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                            activeTab === 'structure' ? "bg-primary text-white shadow" : "text-text-dim hover:text-white"
                          )}
                        >
                          <List className="size-3" /> Cấu trúc tài liệu
                          {contractBlocks.length > 0 && (
                            <span className="ml-1 bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md text-[9px]">
                              {contractBlocks.length}
                            </span>
                          )}
                        </button>
                      </div>
                      {activeTab === 'standard' && (
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox" checked={showEmptyFields}
                            onChange={(e) => setShowEmptyFields(e.target.checked)}
                            className="rounded border-border-dark bg-sidebar-dark text-primary focus:ring-primary size-3.5 cursor-pointer"
                          />
                          <span className="text-[10px] font-bold text-text-dim hover:text-white uppercase tracking-wider transition-colors">
                            Hiện trường trống
                          </span>
                        </label>
                      )}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar md:p-6 space-y-4">

                      {/* ── TAB: Trường chuẩn ── */}
                      {activeTab === 'standard' && (
                        <div className="bg-sidebar-dark/40 border border-border-dark rounded-2xl p-5 space-y-5">

                          {/* Thông tin chung */}
                          {hasVisibleFields([formData.contractNumber, formData.contractDate, formData.effectiveDate, formData.expiredDate, formData.value, formData.valueInWords]) && (
                            <div className="space-y-3">
                              <h5 className="text-xs font-black text-primary uppercase tracking-wider">Thông tin chung</h5>
                              <div className="grid grid-cols-2 gap-3">
                                <FormField label="Số hợp đồng" value={formData.contractNumber} onChange={(v) => handleFieldChange('contractNumber', v)} />
                                <FormField label="Ngày ký" value={formData.contractDate} onChange={(v) => handleFieldChange('contractDate', v)} placeholder="DD/MM/YYYY" />
                                <FormField label="Ngày hiệu lực" value={formData.effectiveDate} onChange={(v) => handleFieldChange('effectiveDate', v)} placeholder="DD/MM/YYYY" />
                                <FormField label="Ngày hết hạn" value={formData.expiredDate} onChange={(v) => handleFieldChange('expiredDate', v)} placeholder="DD/MM/YYYY" />
                                <FormField label="Tổng giá trị hợp đồng" value={formData.value} onChange={(v) => handleFieldChange('value', v)} type="money" />
                                <span className="hidden md:inline" />
                                <FormField label="Giá trị bằng chữ" value={formData.valueInWords} onChange={(v) => handleFieldChange('valueInWords', v)} className="col-span-2" />
                              </div>
                            </div>
                          )}

                          {/* Bên A */}
                          {hasVisibleFields([formData.partyA?.name, formData.partyA?.taxCode, formData.partyA?.phone, formData.partyA?.address, formData.partyA?.representative, formData.partyA?.position]) && (
                            <div className="space-y-3">
                              <h5 className="text-xs font-black text-primary uppercase tracking-wider">Bên A</h5>
                              <div className="grid grid-cols-2 gap-3">
                                <FormField label="Tên công ty / Cá nhân" value={formData.partyA?.name} onChange={(v) => handlePartyChange('partyA', 'name', v)} className="col-span-2" />
                                <FormField label="MST" value={formData.partyA?.taxCode} onChange={(v) => handlePartyChange('partyA', 'taxCode', v)} />
                                <FormField label="Điện thoại" value={formData.partyA?.phone} onChange={(v) => handlePartyChange('partyA', 'phone', v)} />
                                <FormField label="Địa chỉ" value={formData.partyA?.address} onChange={(v) => handlePartyChange('partyA', 'address', v)} isTextArea className="col-span-2" />
                                <FormField label="Người đại diện" value={formData.partyA?.representative} onChange={(v) => handlePartyChange('partyA', 'representative', v)} />
                                <FormField label="Chức vụ" value={formData.partyA?.position} onChange={(v) => handlePartyChange('partyA', 'position', v)} />
                              </div>
                            </div>
                          )}

                          {/* Bên B */}
                          {hasVisibleFields([formData.partyB?.name, formData.partyB?.taxCode, formData.partyB?.phone, formData.partyB?.address, formData.partyB?.representative, formData.partyB?.position]) && (
                            <div className="space-y-3">
                              <h5 className="text-xs font-black text-primary uppercase tracking-wider">Bên B</h5>
                              <div className="grid grid-cols-2 gap-3">
                                <FormField label="Tên công ty / Cá nhân" value={formData.partyB?.name} onChange={(v) => handlePartyChange('partyB', 'name', v)} className="col-span-2" />
                                <FormField label="MST" value={formData.partyB?.taxCode} onChange={(v) => handlePartyChange('partyB', 'taxCode', v)} />
                                <FormField label="Điện thoại" value={formData.partyB?.phone} onChange={(v) => handlePartyChange('partyB', 'phone', v)} />
                                <FormField label="Địa chỉ" value={formData.partyB?.address} onChange={(v) => handlePartyChange('partyB', 'address', v)} isTextArea className="col-span-2" />
                                <FormField label="Người đại diện" value={formData.partyB?.representative} onChange={(v) => handlePartyChange('partyB', 'representative', v)} />
                                <FormField label="Chức vụ" value={formData.partyB?.position} onChange={(v) => handlePartyChange('partyB', 'position', v)} />
                              </div>
                            </div>
                          )}

                          {/* Bang gia tri hop dong: chi render khi co items va khong rong */}
                          {formData?.items && formData.items.length > 0 && (
                            <div className="space-y-3">
                              <h5 className="text-xs font-black text-primary uppercase tracking-wider">
                                Bảng giá trị hợp đồng / Chi tiết mặt hàng
                              </h5>
                              {renderStandardItemsTable()}
                            </div>
                          )}

                          {/* Cac loai gia tri hop dong: day len ngay duoi bang hoac doi tac chinh, lam noi bat nhe */}
                          <div className="space-y-3 p-4 bg-primary/[0.03] border border-primary/20 rounded-2xl shadow-sm">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <h5 className="text-xs font-black text-primary uppercase tracking-wider">
                                Các loại giá trị hợp đồng
                              </h5>
                              {/* Thue VAT dat inline canh tieu de */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider whitespace-nowrap">Thuế VAT (%)</span>
                                <input
                                  type="number"
                                  value={formData.vatRate ?? ''}
                                  onChange={(e) => handleFieldChange('vatRate', e.target.value)}
                                  className="w-16 px-2 py-1 bg-sidebar-dark border border-border-dark rounded-lg text-xs text-amber-300 focus:border-primary focus:outline-none transition-colors text-center"
                                  placeholder="10"
                                  min={0}
                                  max={100}
                                />
                              </div>
                            </div>
                            {renderContractValuesTable()}
                          </div>

                          {/* Du an / Cong trinh */}
                          {hasVisibleFields([formData.projectName, formData.projectAddress, formData.startDate, formData.endDate]) && (
                            <div className="space-y-3">
                              <h5 className="text-xs font-black text-primary uppercase tracking-wider">Dự án / Công trình</h5>
                              <div className="grid grid-cols-2 gap-3">
                                <FormField label="Tên dự án" value={formData.projectName} onChange={(v) => handleFieldChange('projectName', v)} className="col-span-2" />
                                <FormField label="Địa chỉ dự án" value={formData.projectAddress} onChange={(v) => handleFieldChange('projectAddress', v)} isTextArea className="col-span-2" />
                                <FormField label="Ngày bắt đầu" value={formData.startDate} onChange={(v) => handleFieldChange('startDate', v)} placeholder="DD/MM/YYYY" />
                                <FormField label="Ngày kết thúc" value={formData.endDate} onChange={(v) => handleFieldChange('endDate', v)} placeholder="DD/MM/YYYY" />
                              </div>
                            </div>
                          )}

                          {/* Dieu khoan thanh toan - da bo truong Thue VAT (chuyen len khu vuc Cac loai gia tri hop dong) */}
                          {(formData.paymentMethod || formData.paymentTerm) && (
                          <div className="space-y-4">
                            <h5 className="text-xs font-black text-primary uppercase tracking-wider">Điều khoản thanh toán</h5>
                            <div className="grid grid-cols-2 gap-3">
                              <FormField label="Phương thức thanh toán" value={formData.paymentMethod} onChange={(v) => handleFieldChange('paymentMethod', v)} className="col-span-2" />
                              <FormField label="Điều khoản thanh toán" value={formData.paymentTerm} onChange={(v) => handleFieldChange('paymentTerm', v)} isTextArea className="col-span-2" />
                            </div>
                          </div>
                          )}

                          {/* Điều khoản khác */}
                          {hasVisibleFields([formData.warrantyPeriod, formData.penaltyClause, formData.disputeResolution]) && (
                            <div className="space-y-3">
                              <h5 className="text-xs font-black text-primary uppercase tracking-wider">Điều khoản khác</h5>
                              <div className="grid grid-cols-1 gap-3">
                                <FormField label="Bảo hành" value={formData.warrantyPeriod} onChange={(v) => handleFieldChange('warrantyPeriod', v)} isTextArea />
                                <FormField label="Điều khoản phạt" value={formData.penaltyClause} onChange={(v) => handleFieldChange('penaltyClause', v)} isTextArea />
                                <FormField label="Giải quyết tranh chấp" value={formData.disputeResolution} onChange={(v) => handleFieldChange('disputeResolution', v)} isTextArea />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── TAB: Cấu trúc tài liệu ── */}
                      {activeTab === 'structure' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl text-[10px] text-primary/80 font-semibold">
                            <List className="size-3.5 shrink-0" />
                            Toàn bộ nội dung hợp đồng được AI chuyển sang cấu trúc có thể chỉnh sửa. Mỗi điều khoản, mục lớn/nhỏ đều có ô nhập liệu riêng.
                          </div>
                          {renderDocumentBlocks()}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 px-5 pb-5 md:px-6 md:pb-6 shrink-0 border-t border-white/10 pt-4">
                      <button
                        onClick={handleSave}
                        className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98]"
                      >
                        <Save className="size-4" />
                        {editMode ? 'Lưu cập nhật' : 'Lưu hợp đồng'}
                      </button>
                      <button
                        onClick={editMode ? onBack : handleReset}
                        className="px-6 py-3 bg-sidebar-dark border border-border-dark hover:border-white/20 text-text-dim hover:text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                      >
                        {editMode ? <X className="size-4" /> : <RefreshCw className="size-4" />}
                        {editMode ? 'Hủy' : 'Làm mới'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper format tiền tệ
function formatCurrency(value: number): string {
  return value.toLocaleString('vi-VN');
}
