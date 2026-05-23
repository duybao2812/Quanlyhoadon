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