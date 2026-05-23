                                 }
                               }}
                               className="w-full px-4 py-3 bg-card-dark border-2 border-border-dark text-white rounded-xl text-base font-bold outline-none focus:ring-8 focus:ring-primary/10 focus:border-primary transition-all shadow-sm placeholder:text-text-dim"
                             />
                           </div>
                         </div>
                       </div>
 
                       <div className="p-4 bg-sidebar-dark rounded-xl text-[11px] text-primary overflow-x-auto shadow-inner">
                         <div className="text-text-dim font-bold mb-2 opacity-70">DỮ LIỆU JSON GỐC://</div>
                         {JSON.stringify(selectedInvoice.extractedData, null, 2)}
                       </div>
                     </div>
                   </div>
 
                   {/* Right Panel: Template Logic */}
                   <div className="col-span-8 flex flex-col card h-full">
                     <div className="p-4 border-b border-border-dark flex justify-between items-center bg-sidebar-dark">
                       <div className="flex items-center gap-3">
                         <div className="flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary rounded-full border border-primary/30">
                           <HardHat className="size-3.5" />
                           <span className="text-xs font-bold uppercase tracking-wider">
                             {(() => {
                               const raw = selectedInvoice.extractedData?.classification;
                               const type = typeof raw === 'object' ? raw.type : (raw || 'BB_CM');
                               switch(type) {
                                 case 'BB_CM': return 'Phân loại: Ca Máy';
                                 case 'BB_VT': return 'Phân loại: Vật Tư';
                                 case 'BB_TC': return 'Phân loại: Thi Công';
                                 default: return `Phân loại: ${type}`;
                               }
                             })()}
                           </span>
                         </div>
                       </div>
                       <button 