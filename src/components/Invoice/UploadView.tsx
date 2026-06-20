import React from 'react';
import {
  UploadCloud,
  Loader2,
  List,
  Zap,
  FileQuestion,
  FileCode,
  FileText,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { cn } from '../../lib/utils';

interface UploadViewProps {
  onUpload: (accepted: File[], rejected: any[]) => void;
  queue: File[];
  rejectedFiles: { file: File; reason: string }[];
  onRemove: (name: string) => void;
  onRemoveRejected: (name: string) => void;
  onProcess: () => void;
  isProcessing: boolean;
  processingStatus: string;
}

export const UploadView: React.FC<UploadViewProps> = ({
  onUpload,
  queue,
  rejectedFiles,
  onRemove,
  onRemoveRejected,
  onProcess,
  isProcessing,
  processingStatus
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    accept: {
      'application/pdf': ['.pdf'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml'],
      'application/octet-stream': ['.xml', '.pdf'],
      'text/plain': ['.xml'],
      'image/*': ['.png', '.jpg', '.jpeg']
    }
  } as any);

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center p-12 transition-all cursor-pointer bg-sidebar-dark group",
            isDragActive ? "border-primary bg-primary/5" : "border-border-dark hover:border-primary/40 hover:bg-white/5"
          )}
        >
          <input {...getInputProps()} />
          <div className="size-20 bg-primary/10 text-primary rounded-[24px] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl shadow-primary/20">
            <UploadCloud className="size-10" />
          </div>
          <h3 className="text-xl font-black text-white mb-2 tracking-tighter uppercase">Kéo và thả hóa đơn vào đây</h3>
          <p className="text-text-dim text-[10px] mb-8 font-black uppercase tracking-[0.3em] opacity-60">Hỗ trợ định dạng PDF, XML và Hình ảnh (JPG, PNG)</p>
          <div className="flex gap-4">
            <button className="px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:translate-y-[-2px] active:scale-95 transition-all">
              CHỌN TỆP TIN TỪ MÁY TÍNH
            </button>
          </div>
        </div>
      </div>

      {(queue.length > 0 || rejectedFiles.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card-dark rounded-[40px] border border-border-dark overflow-hidden shadow-2xl relative"
        >
          {/* Header Status Bar */}
          <div className="p-8 border-b border-border-dark bg-white/[0.02] flex items-center justify-between relative overflow-hidden">
            {isProcessing && (
              <div className="absolute bottom-0 left-0 h-1 bg-primary animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.5)] w-full transition-all" />
            )}

            <div className="flex items-center gap-5">
              <div className={cn(
                "size-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                isProcessing ? "bg-primary/20 text-primary animate-pulse" : "bg-white/5 text-text-dim"
              )}>
                {isProcessing ? <Loader2 className="size-6 animate-spin" /> : <List className="size-6" />}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black uppercase tracking-[0.2em] text-white">Hàng chờ hệ thống</span>
                  <div className="px-3 py-0.5 bg-primary/20 text-primary rounded-full text-[10px] font-black tracking-widest border border-primary/30">
                    {queue.length} TỆP SẴN SÀNG
                  </div>
                </div>
                {isProcessing && processingStatus ? (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="size-1.5 rounded-full bg-primary animate-ping" />
                    <span className="text-[10px] text-primary font-black uppercase tracking-widest">{processingStatus}</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest mt-1 opacity-60">Các tệp sẽ được bóc tách bằng AI Mistral Premium</p>
                )}
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); onProcess(); }}
              disabled={isProcessing || queue.length === 0}
              className={cn(
                "px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-2xl",
                isProcessing
                  ? "bg-white/5 text-text-dim cursor-not-allowed"
                  : "bg-primary text-white hover:translate-y-[-4px] active:scale-95 shadow-primary/20"
              )}
            >
              {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4 fill-current" />}
              {isProcessing ? "Đang xử lý dữ liệu..." : "BẮT ĐẦU TRÍCH XUẤT NGAY"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-border-dark min-h-[400px]">
            {/* Column 1: Ready to Process */}
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3 text-xs font-black text-emerald-500 uppercase tracking-[0.2em]">
                  <div className="size-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                  Danh sách tệp hợp lệ
                </div>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                {queue.length === 0 && (
                  <div className="py-24 text-center border-2 border-dashed border-border-dark rounded-3xl opacity-30">
                    <FileQuestion className="size-12 mx-auto mb-4 text-text-dim" />
                    <p className="text-[10px] text-text-dim italic font-black uppercase tracking-widest">Không có tệp nào trong hàng đợi</p>
                  </div>
                )}

                {queue.map((file, idx) => {
                  const isXml = file.name.toLowerCase().endsWith('.xml');
                  return (
                    <div key={file.name + '-' + file.size} className="group relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[24px]" />
                      <div className="relative flex items-center justify-between bg-white/[0.03] p-5 rounded-[24px] border border-border-dark group-hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center gap-5 min-w-0">
                          <div className={cn(
                            "size-14 rounded-2xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 duration-500",
                            isXml ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                          )}>
                            {isXml ? <FileCode className="size-7" /> : <FileText className="size-7" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-white truncate leading-tight uppercase tracking-tighter group-hover:text-emerald-400 transition-colors">{file.name}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[9px] font-black text-text-dim uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">
                                {(file.size / 1024).toFixed(1)} KB
                              </span>
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                isXml ? "text-amber-500 bg-amber-500/10" : "text-red-500 bg-red-500/10"
                              )}>
                                {isXml ? "XML Data" : "PDF Document"}
                              </span>
                            </div>
                          </div>
                        </div>
                        {!isProcessing && (
                          <button
                            onClick={() => onRemove(file.name)}
                            className="size-10 flex items-center justify-center text-text-dim hover:text-white hover:bg-red-500 rounded-xl transition-all shadow-sm active:scale-90"
                          >
                            <X className="size-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Rejections & Errors */}
            <div className="p-8 space-y-6 bg-red-500/[0.01]">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3 text-xs font-black text-red-500 uppercase tracking-[0.2em]">
                  <div className="size-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
                  Tệp không khả dụng
                </div>
                {rejectedFiles.length > 0 && (
                  <button
                    onClick={() => rejectedFiles.forEach(r => onRemoveRejected(r.file.name))}
                    className="text-[9px] font-black text-red-500/60 hover:text-red-500 uppercase tracking-widest transition-colors"
                  >
                    Dọn sạch danh sách
                  </button>
                )}
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                {rejectedFiles.length === 0 ? (
                  <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                    <CheckCircle2 className="size-12 mx-auto mb-4 text-emerald-500" />
                    <p className="text-[10px] text-text-dim italic font-black uppercase tracking-widest">Hệ thống không ghi nhận lỗi</p>
                  </div>
                ) : (
                  rejectedFiles.map((item, idx) => (
                    <div key={`rejected-${item.file.name}-${item.file.size}`} className="flex items-center justify-between bg-red-500/[0.03] p-5 rounded-[24px] border border-red-500/10 group hover:border-red-500/30 transition-all shadow-sm">
                      <div className="flex items-center gap-5 min-w-0">
                        <div className="size-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-inner">
                          <AlertCircle className="size-7" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-red-400 truncate leading-tight uppercase tracking-tighter">{item.file.name}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="px-2 py-0.5 bg-red-500/10 rounded-md text-[9px] font-black text-red-500 uppercase tracking-widest border border-red-500/20">
                              Lý do: {item.reason}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveRejected(item.file.name)}
                        className="size-10 flex items-center justify-center text-red-500/40 hover:text-white hover:bg-red-500 rounded-xl transition-all"
                      >
                        <X className="size-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
