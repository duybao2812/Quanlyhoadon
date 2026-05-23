                   <div className="size-8 rounded-xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center font-black text-sm shadow-md">3</div>
                   <div>
                     <h3 className="font-black text-xs text-white tracking-tight">Soạn thảo văn bản trực quan</h3>
                     <p className="text-[9px] text-text-dim uppercase tracking-wider">Mô phỏng tài liệu in ấn thực tế (A4 layout)</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm">
                   <Check className="size-3" /> Auto-Save
                 </div>
               </div>
 
               {/* A4 Workspace */}
               <div className="flex-1 overflow-y-auto bg-stone-900/60 p-4 md:p-6 custom-scrollbar flex flex-col justify-start">
                 {selectedTemplate === 'GDNTT' ? renderGdnDocument() : renderContractDocument()}
               </div>
 
               {/* Footer */}
               <div className="bg-card-dark border-t border-border-dark p-2 flex items-center justify-between text-[9px] text-text-dim">
                  <div className="flex items-center gap-1.5 uppercase font-black tracking-widest">
                    <ShieldCheck className="size-3 text-emerald-500" /> Hệ thống bảo mật
                  </div>
                  <div className="italic">Dữ liệu trống mặc định: <span className="text-primary font-bold">"............"</span></div>
               </div>
             </div>
           )}
         </div>
       </div>
     </div>
   );
 };
 
 };
 
 const PartnersView = ({ partners, onEdit, onBatchEdit, onDelete }: { 
   partners: Partner[], 
   onEdit: (p: Partner) => void, 