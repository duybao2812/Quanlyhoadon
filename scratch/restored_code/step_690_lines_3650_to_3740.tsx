                 <p>
                   <span className="font-bold">- Công trình: </span>
                   <InlineField tag="TEN_CONGTRINH" value={getVal('TEN_CONGTRINH') || getVal('TENCONGTRINH')} onChange={(v) => { setVal('TEN_CONGTRINH', v); setVal('TENCONGTRINH', v); }} placeholder="Nhập tên công trình..." className="w-[80%]" onOpenSelector={() => { setActiveInvoiceTag?.('TEN_CONGTRINH'); setIsInvoiceSelectorOpen?.(true); }} />
                 </p>
               )}
             </div>
           ) : (
             <p className="pl-4 italic text-gray-500">Phạm vi công việc được thực hiện đúng theo yêu cầu kỹ thuật và bản vẽ thiết kế đã được hai bên phê duyệt.</p>
           )}
         </div>
 
         {/* Section 2: Value */}
         <div className="space-y-1.5 mb-8 font-serif">
           <h3 className="font-bold uppercase text-[10px] border-b border-gray-300 pb-0.5">ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG</h3>
           <p className="pl-4">
             - Giá trị hợp đồng tạm tính là: <InlineField tag="GIATRIHOPDONG" value={getVal('GIATRIHOPDONG')} onChange={(v) => setVal('GIATRIHOPDONG', v)} placeholder="Nhập giá trị hợp đồng bằng số..." isCurrency onOpenSelector={() => { setActiveInvoiceTag?.('GIATRIHOPDONG'); setIsInvoiceSelectorOpen?.(true); }} /> <span className="font-bold">VNĐ</span>
           </p>
           <p className="pl-4 italic">
             - Bằng chữ: <InlineField tag="BANGCHU
                   'HDTC': {},
                   'HDCM': {},
                   'GDNTT': {}
                 },
                 selectedPartyAId: '',
                 selectedPartyBId: '',
                 templateBuffer: null,
                 vtLinks: {}
               });
             }}
             className="px-3 py-1.5 text-xs font-medium text-text-dim hover:bg-white/5 hover:text-white rounded-lg transition-colors border border-border-dark"
           >
             Làm mới
           </button>
           {selectedTemplate && (
             <button
               onClick={handleGenerate}
               disabled={isGenerating}
               className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold hover:bg-primary/30 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
             >
               {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
               {isGenerating ? 'Đang tạo...' : 'Xuất Hợp Đồng (.docx)'}
             </button>
           )}
         </div>
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0">
         {/* Left Column: Template & Parties Selection */}
         <div className="lg:col-span-4 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
           <div className="card bg-transparent border-none p-2 space-y-2">
             <h3 className="font-black text-white text-[10px] uppercase tracking-wider flex items-center gap-2">
               <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">