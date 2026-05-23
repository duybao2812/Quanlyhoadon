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
                   