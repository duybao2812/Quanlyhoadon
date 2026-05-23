       }));
     }
   };
 
   const handleContractInvoiceIntegration = (invoiceIds: string[]) => {
     if (!activeInvoiceTag) return;
     
     const selectedDatas = invoices.filter(inv => invoiceIds.includes(inv.id));
     if (selectedDatas.length === 0) return;
 
     const template = contractForm.selectedTemplate;
     const isSpecialContract = template === 'HDNT' || template === 'HDCM';
 
     // --- Smart Extraction from Invoice Content ---
     const allItems: any[] = [];
     selectedDatas.forEach(inv => {
       const data = inv.extractedData || {};
       const items = data.items || data.lineItems || inv.lineItems || [];
       allItems.push(...items);
     });
     const allDescriptions = allItems.map(item => (item.description || item.name || '')).join(' ');
     
     if (allDescriptions && !isSpecialContract) {
       const smartUpdates: Record<string, string> = {};
       const currentTags = contractForm.tags || [];
 
       // 0. RESET LOGIC: Identify and reset all autofill-capable tags first
       const autofillKeys = [
         'TENCONGTRINH', 'TEN_CONGTRINH',
         'GOITHAU', 'GOI_THAU', 
         'DIADIEM', 'DIA_DIEM',
         'SO_HD', 'SO_HOPDONG', 'SOHOPDONG', 'SOHD'
       ];
       
       currentTags.forEach(tag => {
         const u = tag.toUpperCase();
         const isDateContract = (u.startsWith('NGAY') || u.startsWith('DAY') || u.startsWit