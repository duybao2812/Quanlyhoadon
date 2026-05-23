     });
   };
 
   const renderGdnDocument = () => {
     const getVal = (tag: string) => formData[tag] || '';
     const setVal = (tag: string, val: string) => handleFieldChange(tag, val);
 
     return (
       <div className="font-serif text-[#1a1a1a] text-xs leading-relaxed max-w-[800px] w-full mx-auto bg-white p-8 md:p-14 shadow-2xl rounded-sm border border-gray-200 my-4 text-left relative transition-all duration-300">
         {/* National Emblem & Admin Title */}
         <div className="grid grid-cols-2 gap-4 mb-6 font-serif">
           <div className="text-center font-bold text-[10.5px] uppercase leading-tight">
             {selectedPartyBId ? partners.find(p => p.id === selectedPartyBId)?.name.toUpperCase() : "ĐƠN VỊ ĐỀ NGHỊ"}
             <div className="font-normal normal-case italic text-[9.5px] mt-1 text-gray-500">
               Số: <InlineField tag="SO_GDN" value={getVal('SO_GDN')} onChange={(v) => setVal('SO_GDN', v)} placeholder="........" />
             </div>
           </div>
           <div className="text-center">
             <div className="font-bold text-[10.5px] uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
             <div className="font-bold text-[9.5px] underline underline-offset-4 mt-1">Độc lập - Tự do - Hạnh phúc</div>
           </div>
         </div>
 
         {/* Document Title */}
         <div className="text-center my-8 space-y-1">
           <h1 className=
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