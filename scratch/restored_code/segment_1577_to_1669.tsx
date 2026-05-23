 const UploadView = ({ 
   onUpload, 
   queue, 
   rejectedFiles,
   onRemove, 
   onRemoveRejected,
   onProcess, 
   isProcessing,
   processingStatus
 }: { 
   onUpload: (accepted: File[], rejected: any[]) => void, 
   queue: File[], 
   rejectedFiles: {file: File, reason: string}[],
   onRemove: (name: string) => void,
   onRemoveRejected: (name: string) => void,
   onProcess: () => void,
   isProcessing: boolean,
   processingStatus: string
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
             
             <but