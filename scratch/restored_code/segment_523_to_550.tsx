     <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-dark/80 backdrop-blur-md p-4">
       <motion.div 
         initial={{ opacity: 0, scale: 0.95, y: 20 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         className="bg-card-dark rounded-[32px] border border-border-dark shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
       >
         <div className="p-8 border-b border-border-dark flex justify-between items-center bg-white/5">
           <div>
             <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Kiểm tra kết quả bóc tách</h2>
             <p className="text-text-dim text-xs font-bold uppercase tracking-widest mt-1">Vui lòng rà soát lại thông tin trước khi lưu vào hệ thống</p>
           </div>
           <button onClick={onClose} className="size-12 flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-white rounded-2xl transition-all group">
             <X className="size-6 group-hover:text-red-500" />
           </button>
         </div>
 
         <div className="flex-1 overflow-y-auto p-8 space-y-10">
           {/* Thông tin hóa đơn */}
           <section className="space-y-8">
             <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-border-dark">
               <div className="flex items-center gap-3 text-primary">
                 <FileText className="size-6" />
                 <h3 className="text-base font-black uppercase tracking-[0.2em]">Thông tin Hóa đơn</h3>
               </div>
               <div className="flex items-center gap-3 bg-primary/10 px-6 py-2.5 rounded-2xl border border-primary/20 shadow-lg shadow-primary/5">
                 <Box className="size-4 text-primary" />
                 <span className="text-xs font-black text-primary uppercase tracking-widest">
                   Phân loại: {(() => {