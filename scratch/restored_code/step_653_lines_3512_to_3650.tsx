   const renderContractDocument = () => {
     const getVal = (tag: string) => formData[tag] || '';
     const setVal = (tag: string, val: string) => handleFieldChange(tag, val);
 
     // Common tags for day/month/year of signing
     const dayTag = dateGroups[0]?.day || 'NGAY_KY';
     const monthTag = dateGroups[0]?.month || 'THANG_KY';
     const yearTag = dateGroups[0]?.year || 'NAM_KY';
 
     const contractNumber = getVal('SO_HD') || getVal('SO_HOPDONG') || getVal('SOHOPDONG') || getVal('SOHD');
     const setContractNumber = (v: string) => {
       setVal('SO_HD', v);
       setVal('SO_HOPDONG', v);
       setVal('SOHOPDONG', v);
       setVal('SOHD', v);
     };
 
     const templateName = CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate)?.name || 'Hợp Đồng';
 
     return (
       <div className="font-serif text-[#1a1a1a] text-xs leading-relaxed max-w-[800px] w-full mx-auto bg-white p-8 md:p-14 shadow-2xl rounded-sm border border-gray-200 my-4 text-left relative transition-all duration-300">
         {/* National Emblem */}
         <div className="text-center space-y-0.5 mb-6 font-serif">
           <div className="font-bold text-[10.5px] uppercase tracking-wide">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
           <div className="font-bold text-[9.5px]">Độc lập - Tự do - Hạnh phúc</div>
           <div className="font-bold text-[9px] tracking-widest text-gray-400 mt-1">---o0o---</div>
     
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