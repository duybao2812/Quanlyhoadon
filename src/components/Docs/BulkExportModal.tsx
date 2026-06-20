import React, { useState, useMemo } from 'react';
import {
  X,
  Files,
  Calendar,
  Search,
  Briefcase,
  Loader2,
  CheckCircle2,
  Download,
  Library
} from 'lucide-react';
import { motion } from 'framer-motion';
import JSZip from 'jszip';
import { cn, formatVNNumber, executeSecureExport, getTemplateBuffer } from '../../lib/utils';
import { generateDocxBlob } from '../../lib/docxGenerator';
import { GeneratedDoc, Invoice, Partner } from '../../types/appTypes';
import { getEnrichedInvoice, formatDisplayDate } from '../Invoice/ReviewModal';

﻿export const BulkExportModal = ({
  invoices,
  partners,
  onClose,
  rankMap
}: {
  invoices: Invoice[],
  partners: Partner[],
  onClose: () => void,
  rankMap: Map<string, number>
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [bulkSearch, setBulkSearch] = useState("");

  const completedInvoices = invoices.filter(inv => inv.status === 'completed');

  // Sort and Enrich invoices
  const enrichedInvoices = useMemo(() => {
    return completedInvoices
      .map(inv => getEnrichedInvoice(inv, rankMap))
      .sort((a, b) => (a.computedRank || 0) - (b.computedRank || 0));
  }, [completedInvoices, rankMap]);

  // Filter invoices based on search
  const filteredInvoices = useMemo(() => {
    const term = bulkSearch.toLowerCase().trim();
    if (!term) return enrichedInvoices;

    return enrichedInvoices.filter(inv => {
      // 1. Match Invoice Number (starts with or includes)
      const invNum = (inv.computedInvoiceNumber || '').toLowerCase();
      if (invNum.includes(term)) return true;

      // 2. Match Seller/Buyer
      const seller = (inv.extractedData?.seller?.name || '').toLowerCase();
      const buyer = (inv.extractedData?.buyer?.name || '').toLowerCase();
      if (seller.includes(term) || buyer.includes(term)) return true;

      // 3. Match Original File Name (not with prefix)
      const fileName = (inv.fileName || '').toLowerCase();
      if (fileName.includes(term)) return true;

      return false;
    });
  }, [enrichedInvoices, bulkSearch]);

  const pdfList = filteredInvoices.filter(inv => inv.fileType === 'pdf');
  const xmlList = filteredInvoices.filter(inv => inv.fileType === 'xml');

  const handleSelectAll = (list: any[]) => {
    const listIds = list.map(i => i.id);
    const allSelected = listIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !listIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...listIds])));
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
    let successCount = 0;
    const completedInvoicesMap = new Map(completedInvoices.map(invoice => [invoice.id, invoice]));
    const partnersTaxMap = new Map(partners.map(p => [p.taxCode, p]));

    for (let i = 0; i < selectedIds.length; i++) {
      const invId = selectedIds[i];
      const inv = completedInvoicesMap.get(invId);
      if (!inv || !inv.extractedData) {
        setExportProgress(Math.round(((i + 1) / selectedIds.length) * 100));
        continue;
      }

      const pA = partnersTaxMap.get(inv.extractedData?.seller?.taxCode) || {};
      const pB = partnersTaxMap.get(inv.extractedData?.buyer?.taxCode) || {};

      let templateType = 'BB_CM';
      if (inv.extractedData?.classification) {
        if (inv.extractedData.classification.includes('VT')) templateType = 'BB_VT';
        else if (inv.extractedData.classification.includes('TC')) templateType = 'BB_TC';
      }

      try {
        const templateBuffer = await getTemplateBuffer(templateType);
        const blob = await generateDocxBlob({
          templateBuffer,
          templateType,
          data: inv.extractedData,
          partnerA: pA,
          partnerB: pB,
          contractNumber: inv.contractNumber || "",
          contractDate: inv.contractDate || ""
        });

        const safeFileName = inv.fileName.replace(/[\\/:*?"<>|]/g, '_').split('.')[0];
        const fileName = `BienBan_${safeFileName}.docx`;
        folder?.file(fileName, blob);
        successCount++;
      } catch (err) {
        console.error("Export error for invoice:", inv.fileName, err);
      }
      setExportProgress(Math.round(((i + 1) / selectedIds.length) * 100));
    }

    if (successCount === 0) {
      alert("Không có file nào được tạo thành công. Vui lòng kiểm tra lại mẫu văn bản.");
    } else {
      const content = await zip.generateAsync({ type: "blob" });
      // Xuat file an toan dung showSaveFilePicker
      executeSecureExport(`DocuForge_BulkExport_${new Date().getTime()}.zip`, content, 'application/zip');
    }

    setIsExporting(false);
    onClose();
  };

  const renderList = (list: any[], title: string, icon: any, color: string) => (
    <div className="flex-1 flex flex-col min-w-0 bg-card-dark rounded-2xl border border-border-dark overflow-hidden">
      <div className="px-4 py-3 bg-sidebar-dark border-b border-border-dark flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", color.replace('text-', 'bg-').concat('/10'))}>
            {React.createElement(icon, { className: cn("size-4", color) })}
          </div>
          <span className="font-black text-[10px] uppercase tracking-widest text-white">{title}</span>
          <span className="text-[10px] font-bold text-text-dim bg-white/5 px-1.5 py-0.5 rounded-md">{list.length}</span>
        </div>
        <button
          onClick={() => handleSelectAll(list)}
          className="text-[10px] font-black uppercase text-primary hover:underline"
        >
          {list.length > 0 && list.every(i => selectedIds.includes(i.id)) ? "Bỏ chọn" : "Chọn hết"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {list.length > 0 ? (
          list.map((inv, index) => (
            <div
              key={inv.id}
              onClick={() => handleToggleSelect(inv.id)}
              className={cn(
                "p-3 rounded-xl border transition-all cursor-pointer group hover:shadow-md",
                selectedIds.includes(inv.id)
                  ? "bg-card-dark border-primary shadow-lg ring-1 ring-primary/10"
                  : "bg-card-dark border-border-dark hover:border-border-dark/80"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "size-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                  selectedIds.includes(inv.id) ? "bg-primary border-primary shadow-sm" : "border-border-dark group-hover:border-border-dark/80"
                )}>
                  {selectedIds.includes(inv.id) && <CheckCircle2 className="size-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-xs text-white truncate mb-1">
                    {index + 1}. Hóa đơn số: {inv.computedInvoiceSymbol ? `${inv.computedInvoiceSymbol}-` : ''}{inv.computedInvoiceNumber || '---'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0",
                      inv.fileType === 'pdf' ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    )}>
                      {inv.fileType}
                    </span>
                    <span className="text-[9px] text-text-dim">•</span>
                    <span className="text-[9px] font-bold text-text-dim uppercase">HĐ: {inv.computedInvoiceNumber || '---'}</span>
                    <span className="text-[9px] text-text-dim">•</span>
                    <span className="text-[9px] font-bold text-text-dim">Ngày: {formatDisplayDate(inv.extractedData?.invoice?.date || inv.extractedData?.date || '---')}</span>
                  </div>
                </div>
                {inv.extractedData?.classification && (
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm shrink-0",
                    inv.extractedData.classification === 'BB_TC' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                      inv.extractedData.classification === 'BB_CM' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                        'bg-green-500/10 text-green-500 border border-green-500/20'
                  )}>
                    {inv.extractedData.classification === 'BB_TC' ? 'Thi công' :
                      inv.extractedData.classification === 'BB_CM' ? 'Ca máy' : 'Vật tư'}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center">
            <p className="text-[10px] font-bold uppercase text-text-dim tracking-widest">Trống</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-card-dark rounded-[32px] shadow-2xl w-full max-w-[1100px] overflow-hidden flex flex-col h-[85vh] border border-white/20"
      >
        <div className="p-6 border-b border-border-dark flex justify-between items-center bg-sidebar-dark">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
              <Download className="size-6" />
            </div>
            <div>
              <h3 className="font-black text-xl text-white tracking-tight">Xuất biên bản hàng loạt</h3>
              <p className="text-sm text-text-dim font-medium italic">Tạo tệp .zip chứa các biên bản đã được xử lý tự động</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-10 flex items-center justify-center rounded-xl text-text-dim hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Controls */}
          <div className="px-6 py-4 bg-sidebar-dark border-b border-border-dark flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-text-dim" />
              <input
                type="text"
                placeholder="Tìm theo Số CT, Tên file, Đơn vị bán..."
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-card-dark border border-border-dark rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-text-dim shadow-sm text-white"
              />
              {bulkSearch && (
                <button
                  onClick={() => setBulkSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim hover:text-white p-1"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-6 px-4">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest leading-none mb-1">Tổng cộng</span>
                <span className="text-xl font-black text-white leading-none">{completedInvoices.length}</span>
              </div>
              <div className="w-px h-8 bg-border-dark"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Đã chọn</span>
                <span className="text-xl font-black text-primary leading-none">{selectedIds.length}</span>
              </div>
            </div>
          </div>

          {/* Unified Column View */}
          <div className="flex-1 flex overflow-hidden p-6 gap-6">
            {renderList(filteredInvoices, "Danh sách hóa đơn hệ thống (PDF & XML)", Library, "text-primary")}
          </div>
        </div>

        <div className="p-8 bg-sidebar-dark border-t border-border-dark">
          {isExporting ? (
            <div className="space-y-4 max-w-md mx-auto">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <div className="text-xs font-black text-primary uppercase tracking-widest">Đang xây dựng tệp ZIP…</div>
                  <div className="text-[10px] font-bold text-text-dim">Vui lòng không đóng cửa sổ lúc này</div>
                </div>
                <div className="text-2xl font-black text-white">{exportProgress}%</div>
              </div>
              <div className="h-3 bg-border-dark rounded-full overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-primary shadow-primary/20"
                  initial={{ width: 0 }}
                  animate={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-4 max-w-2xl mx-auto">
              <button
                onClick={handleBulkExport}
                disabled={selectedIds.length === 0}
                className={cn(
                  "flex-[2] py-4 rounded-2xl font-black text-sm text-white shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group",
                  selectedIds.length > 0 ? "bg-primary hover:bg-primary/80 shadow-primary/20" : "bg-border-dark cursor-not-allowed shadow-none text-text-dim"
                )}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Download className="size-5 relative" />
                <span className="relative">XUẤT {selectedIds.length} BIÊN BẢN (.ZIP)</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-4 border-2 border-border-dark rounded-2xl font-black text-sm text-text-dim hover:bg-white/5 hover:text-white transition-all active:scale-95 shadow-sm"
              >
                HỦY
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
