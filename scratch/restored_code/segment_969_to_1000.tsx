           {selectedIds.length > 0 && (
             <button 
               onClick={() => {
                 if (isDeletingBulk) {
                   onBulkDelete(selectedIds);
                   setSelectedIds([]);
                   setIsDeletingBulk(false);
                 } else {
                   setIsDeletingBulk(true);
                   setTimeout(() => setIsDeletingBulk(false), 3000);
                 }
               }}
               className={cn(
                 "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all shadow-lg",
                 isDeletingBulk ? "bg-red-500 text-white border-red-500 animate-pulse shadow-red-500/20" : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
               )}
             >
               <Trash2 className="size-4" />
               {isDeletingBulk ? "Xác nhận xóa ngay" : `Xóa ${selectedIds.length} hợp đồng`}
             </button>
           )}
           <button 
             onClick={toggleSelectAll}
             className="flex-1 md:flex-none px-6 py-3 bg-white/5 border border-border-dark text-text-dim rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all whitespace-nowrap shadow-sm"
           >
             {selectedIds.length === filteredContracts.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
           </button>
         </div>
       </div>
 
       <div className="bg-card-dark rounded-[32px] border border-border-dark overflow-hidden shadow-2xl">
         <div className="overflow-x-auto custom-scrollbar">