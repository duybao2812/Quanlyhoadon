     } catch (error: any) {
       console.error(error);
       const errorMessage = error.properties?.errors?.map((e: any) => e.message).join(', ') || error.message;
       toast('Lỗi khi tạo hợp đồng: ' + errorMessage, 'error');
     } finally {
       setIsGenerating(false);
     }
   };
 
   const handleDateGroupChange = (groupId: string, dateStr: string) => {
     const group = dateGroups.find(g => g.id === groupId);
     if (!group) return;
 
     if (!dateStr) {
       setFormData(prev => {
         const next = { ...prev };
         if (group.day) next[group.day] = '';
         if (group.month) next[group.month] = '';
         if (group.year) next[group.year] = '';
         return next;
       });
       return;
     }
 
     const date = new Date(dateStr);
     const d = date.getDate().toString();
     const m = (date.getMonth() + 1).toString();
     const y = date.getFullYear().toString();
 
     setFormData(prev => {
       const next = { ...prev };
       if (group.day) next[group.day] = d;
       if (group.month) next[group.month] = m;
       if (group.year) next[group.year] = y;
       return next;
     });
   };
 
   const renderGdnDocument = () => {
     const getVal = (tag: string) => formData[tag] || '';
     const setVal = (tag: string, val: string) => handleFieldChange(tag, val);
 
     return (
       <
           </div>
           <div className="pl-16">
             - Phòng Tài chính - Kế toán <InlineField tag="BEN_DUOC_DE_NGHI_TITLE" value={getVal('BEN_DUOC_DE_NGHI_TITLE') || getVal('BEN_DUOC_DE_NGHI')} onChange={(v) => setVal('BEN_DUOC_DE_NGHI_TITLE', v)} placeholder="Ban Tài chính kế toán..." className="font-bold min-w-[200px]" />
           </div>
         </div>
 
         {/* Personal Details & Request Details */}
         <div className="space-y-3 mb-6 font-serif">
           <p>
             Tôi tên là: <InlineField tag="DAI_DIEN_BEN_DE_NGHI" value={getVal('DAI_DIEN_BEN_DE_NGHI')} onChange={(v) => setVal('DAI_DIEN_BEN_DE_NGHI', v)} placeholder="Họ tên người đề nghị..." />
             <span className="ml-4 font-bold">Đại diện đơn vị: </span>
             <InlineField tag="BEN_DE_NGHI" value={getVal('BEN_DE_NGHI')} onChange={(v) => setVal('BEN_DE_NGHI', v)} placeholder="Tên công ty Bên B (Đơn vị đề nghị)..." onOpenSelector={() => { setActiveInvoiceTag?.('BEN_DE_NGHI'); setIsInvoiceSelectorOpen?.(true); }} className="font-bold" />
           </p>
           <p>
             Đề nghị thanh toán/tạm ứng cho nội dung công việc theo hợp đồng số: <InlineField tag="SO_HD" value={getVal('SO_HD') || getVal('SO_HOPDONG') || getVal('SOHOPDONG') || getVal('SOHD')} onChange={(v) => { setVal('SO_HD', v); setVal('SO_HOPDONG', v); }} placeholder="Số hợp đồng..." />
             <span className="ml-4 font-bold">ký ngày: </span>
             <InlineField tag="NGAY_KY_HOP_DONG" type="date" value={getVal('NGAY_KY_HOP_DONG')} onChange={(v) => setVal('NGAY_KY_HOP_DONG', v)} placeholder="ngày ký..." />