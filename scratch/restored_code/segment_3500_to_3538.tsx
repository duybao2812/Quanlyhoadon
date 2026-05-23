     if (!dateStr) {
       setFormData(prev => {
         const next = { ...prev };
         if (group.day) next[group.day] = '';
         if (group.month) next[group.month] = '';
         if (group.year) next[group.year] = '';
       if (group.year) next[group.year] = y;
       return next;
       return;
     }
 
     const date = new Date(dateStr);
     <div className="flex flex-col h-full gap-1">
     const getVal = (tag: string) => formData[tag] || '';
       <div className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-between bg-card-dark p-2 rounded-2xl shadow-sm border border-border-dark">
         <div className="space-y-0 text-left">
           <h2 className="text-lg font-bold text-white flex items-center gap-2">
             <PlusSquare className="size-5 text-primary" />
     const monthTag = dateGroups[0]?.month || 'THANG_KY';
     const yearTag = dateGroups[0]?.year || 'NAM_KY';
           <p className="text-[11px] text-text-dim">Soạn thảo hợp đồng nhanh chóng với mẫu có sẵn</p>
     const contractNumber = getVal('SO_HD') || getVal('SO_HOPDONG') || getVal('SOHOPDONG') || getVal('SOHD');
         <div className="flex items-center gap-2">
       setVal('SO_HD', v);
       setVal('SO_HOPDONG', v);
               updateContractForm({
     <div className="flex flex-col h-full gap-1">
       {/* Top Header Section */}
       <div className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-between bg-card-dark p-2 rounded-2xl shadow-sm border border-border-dark">
     const templateName = CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate)?.name || 'Hợp Đồng';
           <h2 className="text-lg font-bold text-white flex items-center gap-2">
             <PlusSquare className="size-5 text-primary" />
       <div className="font-serif text-[#1a1a1a] text-xs leading-relaxed max-w-[800px] w-full mx-auto bg-white p-8 md:p-14 shadow-2xl rounded-sm border border-gray-200 my-4 text-left relative transition-all duration-300">
         {/* National Emblem */}
           <p className="text-[11px] text-text-dim">Soạn thảo hợp đồng nhanh chóng với mẫu có sẵn</p>
           <div className="font-bold text-[10.5px] uppercase tracking-wide">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
           <div className="font-bold text-[9.5px]">Độc lập - Tự do - Hạnh phúc</div>
           <div className="font-bold text-[9px] tracking-widest text-gray-400 mt-1">---o0o---</div>
     