             <div>
               <div className="uppercase">
                 <InlineField tag="BEN_DE_NGHI_TITLE" value={getVal('BEN_DE_NGHI_TITLE') || getVal('BEN_DE_NGHI').toUpperCase()} onChange={(v) => setVal('BEN_DE_NGHI_TITLE', v)} placeholder="BÊN ĐỀ NGHỊ" className="font-bold uppercase" />
               </div>
               <div className="font-normal italic text-[9.5px] text-gray-500 mt-1">Giám đốc</div>
               <div className="mt-24 text-blue-900 font-bold">{getVal('DAI_DIEN_BEN_DE_NGHI') || getVal('DAIDIENBENB') || '....................'}</div>
             </div>
           </div>
         </div>
       </div>
     );
   };
 
   const renderHDNTDocument = () => {
     const getVal = (tag: string) => formData[tag] || '';
     const setVal = (tag: string, val: string) => handleFieldChange(tag, val);
 
     const contractNumber = getVal('SO_HOPDONG') || getVal('SO_HD') || getVal('SOHOPDONG') || getVal('SOHD');
     const setContractNumber = (v: string) => {
       setVal('SO_HOPDONG', v);
       setVal('SO_HD', v);
       setVal('SOHOPDONG', v);
       setVal('SOHD', v);
     };
 
     return (
       <div className="font-serif text-[#1a1a1a] text-xs leading-relaxed max-w-[800px] w-full mx-auto bg-white p-8 md:p-14 shadow-2xl rounded-sm border border-gray-200 my-4 text-left relative transition-all duration-300">
         {/* Header section with 2 columns */}
         <div className="grid gri
             <p className="pl-4 mt-1">
               Bên A cung cấp vật tư xây dựng cho bên B phục vụ cho các công trình như sau:
             </p>
             <div className="pl-4 mt-2">
               <InlineField tag="BANGGIATRIHOPDONG" value={getVal('BANGGIATRIHOPDONG')} onChange={(v) => setVal('BANGGIATRIHOPDONG', v)} placeholder="Nhập bảng hoặc nội dung danh mục vật tư..." className="w-full min-h-[50px] block" />
             </div>
           </div>
 
           {/* Article 2 */}
           <div>
             <h4 className="font-bold uppercase text-[10px]">ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG</h4>
             <p className="pl-4 mt-1">
               - Tổng giá trị hợp đồng là: <InlineField tag="GIATRIHOPDONG" value={getVal('GIATRIHOPDONG')} onChange={(v) => setVal('GIATRIHOPDONG', v)} placeholder="Nhập giá trị hợp đồng..." isCurrency onOpenSelector={() => { setActiveInvoiceTag?.('GIATRIHOPDONG'); setIsInvoiceSelectorOpen?.(true); }} /> <span className="font-bold">đ</span> (đã bao gồm thuế GTGT).
             </p>
             <p className="pl-4 italic mt-1">
               (Bằng chữ: <InlineField tag="BANGCHUGIATRI" value={getVal('BANGCHUGIATRI')} onChange={(v) => setVal('BANGCHUGIATRI', v)} placeholder="Nhập số tiền bằng chữ..." className="w-[80%]" onOpenSelector={() => { setActiveInvoiceTag?.('BANGCHUGIATRI'); setIsInvoiceSelectorOpen?.(true); }} />).
             </p>
             <p className="pl-4 mt-1">
               - Giá trị trên là giá trị tạm tính.
             </p>
             <p className="pl-4 mt-1">
               - Giá trị thực tế tại công trường là giá trị thanh quyết toán.