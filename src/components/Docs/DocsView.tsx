import React, { useState, useCallback, useEffect } from 'react';
import {
  Printer,
  Download,
  RefreshCw,
  AlertCircle,
  Trash2,
  Clock,
  Settings2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import { cn, formatVNNumber, executeSecureExport, getTemplateBuffer } from '../../lib/utils';
import { generateDocxBlob } from '../../lib/docxGenerator';
import { useToast } from '../Notifications';
import { GeneratedDoc, Invoice, Partner } from '../../types/appTypes';

﻿export const DocsView = ({ items, onDelete, onBulkDelete, onDeleteAll, invoices, partners }: { items: GeneratedDoc[], onDelete: (id: string) => void, onBulkDelete: (ids: string[]) => void, onDeleteAll: () => void, invoices: Invoice[], partners: Partner[] }) => {
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  // State va cau hinh in nhanh tu Agent Hub
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>(() => localStorage.getItem('agenthub_selected_printer') || '');
  const [isPrinting, setIsPrinting] = useState<string | null>(null);
  const [hubError, setHubError] = useState<string | null>(null);

  // Tai danh sach may in tu Agent Hub khi component mount hoac thay doi selectedPrinter
  // Tai danh sach may in tu Agent Hub khi component mount hoac thay doi selectedPrinter
  const loadPrinters = useCallback(async () => {
    try {
      let storedConfig = localStorage.getItem('agenthub_config');
      let config = storedConfig ? JSON.parse(storedConfig) : null;
      
      // Tu dong lay token tu localhost neu chua co cau hinh
      if (!config) {
        const defaultHubUrl = 'http://localhost:56789';
        console.log('Chua co cau hinh. Tu dong lay token tu localhost...');
        try {
          const tokenRes = await fetch(`${defaultHubUrl}/api/status/token`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(2000)
          });
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            if (tokenData.token) {
              config = { hubUrl: defaultHubUrl, securityToken: tokenData.token };
              localStorage.setItem('agenthub_config', JSON.stringify(config));
              console.log('Tu dong lay token thanh cong:', config);
            }
          }
        } catch (tokenErr) {
          console.error('Loi khi tu dong lay token:', tokenErr);
        }
      }

      if (!config) {
        setHubError('Chua cau hinh ket noi Agent Hub');
        return;
      }

      const fetchPrinters = async (cfg: any) => {
        const execUrl = `${cfg.hubUrl.replace(/\/$/, '')}/api/execute`;
        const currentToken = cfg.securityToken || cfg.token || '';
        return await fetch(execUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Agent-Token': currentToken
          },
          body: JSON.stringify({
            pluginId: 'printer-agent-plugin',
            action: 'list-printers',
            data: {}
          }),
          signal: AbortSignal.timeout(3000)
        });
      };

      let response = await fetchPrinters(config);
      
      // Tu dong cap nhat lai token neu bi loi 401/403 va dang o localhost
      if ((response.status === 401 || response.status === 403) && 
          (config.hubUrl.includes('localhost') || config.hubUrl.includes('127.0.0.1'))) {
        console.log('Token bi tu choi. Tien hanh lay lai token...');
        try {
          const tokenRes = await fetch(`${config.hubUrl.replace(/\/$/, '')}/api/status/token`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(2000)
          });
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            if (tokenData.token) {
              config.securityToken = tokenData.token;
              config.token = tokenData.token;
              localStorage.setItem('agenthub_config', JSON.stringify(config));
              response = await fetchPrinters(config);
            }
          }
        } catch (tokenErr) {
          console.error('Loi khi lam moi token:', tokenErr);
        }
      }

      if (response.ok) {
        const res = await response.json();
        if (res.success && Array.isArray(res.result)) {
          const list = res.result;
          setPrinters(list);
          setHubError(null);
          if (list.length > 0 && !selectedPrinter) {
            setSelectedPrinter(list[0]);
            localStorage.setItem('agenthub_selected_printer', list[0]);
          }
        } else {
          setHubError(res.error || 'Khong the lay danh sach may in tu Agent Hub');
        }
      } else {
        setHubError(`Loi ket noi Agent Hub (HTTP ${response.status})`);
      }
    } catch (err: any) {
      console.error('Error loading printers:', err);
      setHubError('Khong the ket noi den Agent Hub. Vui long kiem tra dich vu da chay chua.');
    }
  }, [selectedPrinter]);

  // Load danh sach may in khi mount hoac khi selectedPrinter thay doi
  useEffect(() => {
    loadPrinters();
  }, [loadPrinters]);

  // Tu dong dong bo khi co tab khac thay doi cau hinh trong localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'agenthub_config') {
        console.log('Cau hinh Agent Hub thay doi tu tab khac, dang tai lai...');
        loadPrinters();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadPrinters]);

  // Ham xu ly in nhanh khong hop thoai qua backend plugin
  const handleSilentPrint = async (genDoc: GeneratedDoc) => {
    const inv = invoices.find(i => i.id === genDoc.invoiceId);
    if (!inv) {
      alert("Không tìm thấy dữ liệu hóa đơn gốc để tạo lại file.");
      return;
    }

    if (!selectedPrinter) {
      alert("Vui lòng chọn máy in trước khi thực hiện in nhanh.");
      return;
    }

    setIsPrinting(genDoc.id);
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

      // Convert type Blob sang base64 dung FileReader
      const fileContentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const commaIdx = base64String.indexOf(',');
          resolve(commaIdx !== -1 ? base64String.substring(commaIdx + 1) : base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const storedConfig = localStorage.getItem('agenthub_config');
      if (!storedConfig) {
        throw new Error('Chua cau hinh ket noi Agent Hub');
      }
      const config = JSON.parse(storedConfig);
      const execUrl = `${config.hubUrl.replace(/\/$/, '')}/api/execute`;
      const currentToken = config.securityToken || config.token || '';
      
      const response = await fetch(execUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Token': currentToken
        },
        body: JSON.stringify({
          pluginId: 'printer-agent-plugin',
          action: 'silent-print',
          data: {
            printerName: selectedPrinter,
            documentName: genDoc.fileName,
            fileContent: fileContentBase64
          }
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (response.ok) {
        const res = await response.json();
        if (res.success) {
          alert(`Đã gửi lệnh in tài liệu "${genDoc.fileName}" thành công!`);
        } else {
          throw new Error(res.error || 'Lỗi từ Agent Hub');
        }
      } else {
        throw new Error(`Lỗi kết nối Agent Hub (HTTP ${response.status})`);
      }
    } catch (err: any) {
      console.error('Loi khi in nhanh:', err);
      alert("In nhanh thất bại: " + err.message);
    } finally {
      setIsPrinting(null);
    }
  };

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
      const itemsMap = new Map(items.map(d => [d.id, d]));
      const invoicesMap = new Map(invoices.map(i => [i.id, i]));
      const partnersTaxMap = new Map(partners.map(p => [p.taxCode, p]));

      for (const id of selectedIds) {
        const genDoc = itemsMap.get(id);
        if (!genDoc) continue;

        const inv = invoicesMap.get(genDoc.invoiceId);
        if (!inv) continue;

        const pA = partnersTaxMap.get(inv.extractedData?.seller?.taxCode) || {};
        const pB = partnersTaxMap.get(inv.extractedData?.buyer?.taxCode) || {};

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
      // Xuat file an toan dung showSaveFilePicker
      executeSecureExport(`TaiLieu_DaChon_${new Date().getTime()}.zip`, content, 'application/zip');
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

      // Xuat file an toan dung showSaveFilePicker
      executeSecureExport(genDoc.fileName, blob, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } catch (err: any) {
      alert("Lỗi khi tải file: " + err.message);
    } finally {
      setIsDownloading(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-card-dark rounded-xl border border-border-dark p-12 text-center">
        <div className="size-16 bg-sidebar-dark rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="text-text-dim size-8" />
        </div>
        <h3 className="text-white font-bold mb-1">Chưa có tài liệu nào</h3>
        <p className="text-text-dim text-xs">Vui lòng tạo biên bản từ tab Dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-center bg-card-dark p-4 rounded-xl border border-border-dark shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedIds.length === items.length && items.length > 0}
              onChange={toggleSelectAll}
              className="size-4 rounded border-border-dark text-primary focus:ring-primary bg-sidebar-dark"
            />
            <span className="text-xs font-bold text-white uppercase tracking-widest">
              Chọn tất cả ({items.length})
            </span>
          </label>

          <div className="h-6 w-px bg-border-dark hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider flex items-center gap-1">
              <Printer className="size-3.5 text-primary" /> Máy in:
            </span>
            {printers.length > 0 ? (
              <select
                value={selectedPrinter}
                onChange={(e) => {
                  setSelectedPrinter(e.target.value);
                  localStorage.setItem('agenthub_selected_printer', e.target.value);
                }}
                className="bg-sidebar-dark border border-border-dark rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-primary transition-all font-medium"
              >
                {printers.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 flex items-center gap-1">
                  {hubError ? 'Mất kết nối Agent Hub' : 'Không tìm thấy máy in'}
                </span>
                <button
                  onClick={loadPrinters}
                  className="p-1 hover:bg-white/10 text-text-dim hover:text-white rounded-lg transition-colors border border-border-dark"
                  title="Thử kết nối lại"
                >
                  <RefreshCw className="size-3" />
                </button>
              </div>
            )}
          </div>
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
        {items.map((docItem) => {
          const inv = invoices.find(i => i.id === docItem.invoiceId);
          const isReplacedOrCancelled = inv && (
            (inv.status as string) === "Bị thay thế" || 
            (inv.status as string) === "Hủy" || 
            (inv.status as string) === "Replaced" || 
            (inv.status as string) === "Cancelled" ||
            (inv.status as string) === "cancelled" ||
            (inv.status as string) === "replaced"
          );

          return (
            <div
              key={docItem.id}
              className={cn(
                "card p-4 transition-all group relative flex gap-4 border-2 bg-card-dark text-white",
                selectedIds.includes(docItem.id) ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/30" : "hover:border-primary/50 border-transparent shadow-sm"
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
                  className="size-5 rounded-md border-border-dark text-primary focus:ring-primary cursor-pointer shadow-sm bg-sidebar-dark"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-10 bg-primary/20 text-primary border border-primary/30 rounded flex items-center justify-center shrink-0">
                    <FileText className="size-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate pr-4 text-white" title={docItem.fileName}>{docItem.fileName}</div>
                    <div className="text-[10px] text-text-dim uppercase font-bold tracking-tight">{docItem.templateType}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-border-dark">
                  <span className="text-text-dim flex items-center gap-1" suppressHydrationWarning>
                    <Clock className="size-3 opacity-40" />
                    {docItem.createdAt?.toDate ? new Date(docItem.createdAt.toDate()).toLocaleDateString() : '…'}
                  </span>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* Silent Print Button with Frontend Filter Rule */}
                    {!isReplacedOrCancelled && (
                      <button
                        disabled={isPrinting === docItem.id || !selectedPrinter}
                        onClick={() => handleSilentPrint(docItem)}
                        className="text-emerald-500 font-bold bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        title={selectedPrinter ? `In nhanh qua ${selectedPrinter}` : 'Chưa chọn máy in'}
                      >
                        {isPrinting === docItem.id ? <Loader2 className="size-3 animate-spin" /> : <Printer className="size-3" />}
                        In nhanh
                      </button>
                    )}
                    <button
                      disabled={isDownloading === docItem.id}
                      onClick={() => downloadDoc(docItem)}
                      className="text-primary font-bold bg-primary/20 border border-primary/30 hover:bg-primary/30 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-2"
                    >
                      {isDownloading === docItem.id ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
                      Tải về
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onDelete(docItem.id);
                      }}
                      className="size-8 text-text-dim hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all flex items-center justify-center shrink-0"
                      title="Xóa tài liệu"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-sidebar-dark/95 backdrop-blur-md text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6 z-50 border border-border-dark w-fit"
          >
            <div className="flex items-center gap-3 border-r border-border-dark pr-6 mr-1">
              <div className="size-7 bg-primary rounded-full flex items-center justify-center text-[11px] font-black shadow-lg text-white">
                {selectedIds.length}
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-text-dim">Đã chọn</span>
            </div>

            <button
              onClick={downloadDocZip}
              disabled={isBulkDownloading}
              className="flex items-center gap-2 text-primary hover:text-primary/80 hover:bg-white/5 px-4 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50"
            >
              {isBulkDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download size={18} />}
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
              className="text-[10px] text-text-dim hover:text-white transition-all uppercase font-bold tracking-widest ml-2"
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
