                                   } else {
                                     throw new Error("Upload failed");
                                   }
                                 } catch (err) {
                                   toast("Lỗi khi tải mẫu tài liệu lên máy chủ", "error");
                                 }
                               }}
                             />
                             <div className={cn(
                               "cursor-pointer py-2 px-4 rounded-lg text-xs font-bold transition-all border-2 border-dashed",
                               isAvailableOnServer 
                                 ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20" 
                                 : "bg-sidebar-dark text-text-dim border-border-dark hover:border-primary/50 hover:text-primary"
                             )}>
                               {isAvailableOnServer ? 'Cập nhật Template (.docx)' : 'Tải lên Template (.docx)'}
                             </div>
                           </label>
 
                           {isAvailableLocally && !isAvailableOnServer && (
                             <button 
                               onClick={() => restoreTemplate(t.id)}
                               className="w-full py-1.5 px-4 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold hover:bg-amber-200 transition-all flex items-center justify-center gap-1"
                             >
                               <CheckCircle2 className="size-3" />
                               Khôi phục từ bộ nhớ
                             </button>
                           )}
 
                           {isAvailableOnServer ? (
                             <div className="text-[10px] text-green-500 flex items-center justify-center gap-1 font-bold">
                               <div className="size-1.5 rounded-full bg-green-500 animate-pulse" /> Đã sẵn sàng trên máy chủ
                             </div>
                           ) : (
                             <div className="text-[10px] text-text-dim flex items-center justify-center gap-1 font-bold">
                               <div className="size-1.5 rounded-full bg-text-dim" /> Chưa có trên máy chủ
                             </div>
                           )}
                         </div>
                       </div>
                     );
                   })}
                             )}>
                               {isAvailableOnServer ? 'Cập nhật Template (.docx)' : 'Tải lên Template (.docx)'}
               {activeTab === 'docs' && (
                 <div className="zoom-125">
                   <DocsView 
                           {isAvailableLocally && !isAvailableOnServer && (
                     onDelete={handleDeleteDoc} 
                               onClick={() => restoreTemplate(t.id)}
                               className="w-full py-1.5 px-4 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold hover:bg-amber-200 transition-all flex items-center justify-center gap-1"
                     invoices={invoices}
                               <CheckCircle2 className="size-3" />
                               Khôi phục từ bộ nhớ
                             </button>
                           )}
               {activeTab === 'contract' && (
                           {isAvailableOnServer ? (
                             <div className="text-[10px] text-green-500 flex items-center justify-center gap-1 font-bold">
                               <div className="size-1.5 rounded-full bg-green-500 animate-pulse" /> Đã sẵn sàng trên máy chủ
                             </div>
                               <div className="size-1.5 rounded-full bg-text-dim" /> Chưa có trên máy chủ
                             <div className="text-[10px] text-text-dim flex items-center justify-center gap-1 font-bold">
                               <div className="size-1.5 rounded-full bg-text-dim" /> Chưa có trên máy chủ
                     setIsInvoiceSelectorOpen={setIsInvoiceSelectorOpen}
                     setActiveInvoiceTag={setActiveInvoiceTag}
                     handleFieldChange={handleContractFieldChange}
                       </div>
                         </div>
                       </div>
               {activeTab === 'docs' && (
                 <DocsView 
                   items={generatedDocs} 
         <footer className="h-10 bg-sidebar-dark border-t border-border-dark px-6 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-text-dim">
                   onBulkDelete={handleBulkDeleteDocs}
             <div className="flex items-center gap-2">
               <div className={`size-2 rounded-full ${isLoadingInvoices || isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
               <span>AI MODEL: MISTRAL-LARGE-LATEST (PREMIUM)</span>
                   onBulkDelete={handleBulkDeleteDocs}
                     onBulkDelete={handleBulkDeleteDocs}
                     onDeleteAll={handleDeleteAllDocs}
               <span>AI REGION: ASIA-SOUTHEAST1 (SINGAPORE)</span>
               {activeTab === 'contract' && (
             <div className="flex items-center gap-2">
                   contractForm={contractForm}
               <span>API STATUS: HEALTHY | REQUESTS: {requestCount}</span>
                   onContractSaved={handleContractSave}
                   setIsInvoiceSelectorOpen={setIsInvoiceSelectorOpen}
                   setActiveInvoiceTag={setActiveInvoiceTag}
                   setIsInvoiceSelectorOpen={setIsInvoiceSelectorOpen}
                   setActiveInvoiceTag={setActiveInvoiceTag}
                   setIsInvoiceSelectorOpen={setIsInvoiceSelectorOpen}
                   setActiveInvoiceTag={setActiveInvoiceTag}
                   handleFieldChange={handleContractFieldChange}
                     setIsInvoiceSelectorOpen={setIsInvoiceSelectorOpen}
         <footer className="h-10 bg-sidebar-dark border-t border-border-dark px-6 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-text-dim">
                     handleFieldChange={handleContractFieldChange}
                   />
                 </div>
         <footer className="h-10 bg-sidebar-dark border-t border-border-dark px-6 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-text-dim">
           <div className="flex items-center gap-6">
         <footer className="h-10 bg-sidebar-dark border-t border-border-dark px-6 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-text-dim">
           <div className="flex items-center gap-6">
         <footer className="h-10 bg-sidebar-dark border-t border-border-dark px-6 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-text-dim">
               <div className={`size-2 rounded-full ${isLoadingInvoices || isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
               <span>AI MODEL: MISTRAL-LARGE-LATEST (PREMIUM)</span>
               <div className={`size-2 rounded-full ${isLoadingInvoices || isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
             <div className="flex items-center gap-2">
               <Globe className="size-3" />
               <span>AI REGION: ASIA-SOUTHEAST1 (SINGAPORE)</span>
             </div>
             <div className="flex items-center gap-2">
               <Zap className="size-3" />
               <span>API STATUS: HEALTHY | REQUESTS: {requestCount}</span>
             </div>
           </div>
           <div className="flex items-center gap-4">
             <span className="flex items-center gap-1"><Cpu className="size-3" /> GAS SERVICE: CONNECTED</span>
             <span className="text-border-dark">|</span>
             <span>© 2026 SMARTINVOICE PRO</span>
           </div>
         </footer>
       </main>
 
       {/* Token Limit Countdown Modal */}
       {isTokenLimited && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">