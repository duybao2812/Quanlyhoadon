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