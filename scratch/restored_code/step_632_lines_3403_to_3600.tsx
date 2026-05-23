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
           <h1 className="text-sm font-bold uppercase tracki
           </p>
           <p className="pl-4">
             <span className="font-bold">Mã số thuế: </span>
             <InlineField tag="MST_A" value={getVal('MST_A')} onChange={(v) => setVal('MST_A', v)} placeholder="Mã số thuế..." />
           </p>
           <p className="pl-4">
             <span className="font-bold">Đại diện: </span>
             <InlineField tag="GIOITINH_A" type="select" options={['Ông', 'Bà']} value={getVal('GIOITINH_A')} onChange={(v) => setVal('GIOITINH_A', v)} placeholder="Ông/Bà" />
             <span className="ml-1"></span>
             <InlineField tag="DAI_DIEN_A" value={getVal('DAI_DIEN_A')} onChange={(v) => setVal('DAI_DIEN_A', v)} placeholder="Họ tên đại diện Bên A..." />
             <span className="ml-4 font-bold">Chức vụ: </span>
             <InlineField tag="CHUC_VU_A" value={getVal('CHUC_VU_A') || getVal('CHUCVU_A')} onChange={(v) => { setVal('CHUC_VU_A', v); setVal('CHUCVU_A', v); }} placeholder="Chức vụ..." />
           </p>
           <p className="pl-4">
             <span className="font-bold">Số tài khoản: </span>
             <InlineField tag="STK_A" value={getVal('STK_A')} onChange={(v) => setVal('STK_A', v)} placeholder="Số tài khoản ngân hàng..." />
             <span className="ml-4 font-bold">Tại ngân hàng: </span>
             <InlineField tag="NH_A" value={getVal('NH_A') || getVal('NGAN_HANG_A')} onChange={(v) => { setVal('NH_A', v); setVal('NGAN_HANG_A', v); }} placeholder="Tên ngân hàng..." />
           </p>
         </div>