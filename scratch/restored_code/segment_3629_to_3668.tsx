           </p>
           <p className="pl-4">
             <span className="font-bold">Số tài khoản: </span>
             <InlineField tag="STK_B" value={getVal('STK_B')} onChange={(v) => setVal('STK_B', v)} placeholder="Số tài khoản ngân hàng..." />
             <span className="ml-4 font-bold">Tại ngân hàng: </span>
             <InlineField tag="NH_B" value={getVal('NH_B') || getVal('NGAN_HANG_B')} onChange={(v) => { setVal('NH_B', v); setVal('NGAN_HANG_B', v); }} placeholder="Tên ngân hàng..." />
           </p>
         </div>
 
         {/* Section 1: Scope */}
         <div className="space-y-1.5 mb-6 font-serif">
           <h3 className="font-bold uppercase text-[10px] border-b border-gray-300 pb-0.5">ĐIỀU 1: PHẠM VI CÔNG VIỆC</h3>
           {(tags.some(t => t.toUpperCase() === 'GOI_THAU' || t.toUpperCase() === 'GOITHAU') || tags.some(t => t.toUpperCase() === 'TEN_CONGTRINH' || t.toUpperCase() === 'TENCONGTRINH')) ? (
             <div className="pl-4 space-y-1.5">
               {tags.some(t => t.toUpperCase() === 'GOI_THAU' || t.toUpperCase() === 'GOITHAU') && (
                 <p>
                   <span className="font-bold">- Gói thầu: </span>
                   <InlineField tag="GOI_THAU" value={getVal('GOI_THAU') || getVal('GOITHAU')} onChange={(v) => { setVal('GOI_THAU', v); setVal('GOITHAU', v); }} placeholder="Nhập tên gói thầu..." className="w-[80%]" onOpenSelector={() => { setActiveInvoiceTag?.('GOI_THAU'); setIsInvoiceSelectorOpen?.(true); }} />
                 </p>
               )}
               {tags.some(t => t.toUpperCase() === 'TEN_CONGTRINH' || t.toUpperCase() === 'TENCONGTRINH') && (
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