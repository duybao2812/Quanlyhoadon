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
 
 // --- View: Partners ---
 // --- View: Contract ---
 interface GdnRow {
   stt: string;