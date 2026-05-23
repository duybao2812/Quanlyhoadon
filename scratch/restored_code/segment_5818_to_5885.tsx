            const monthTag = currentTags.find(t => {
              const u = t.toUpperCase();
              return (u.startsWith('THANG') || u.startsWith('MONTH')) && (u.includes('KY') || u.includes('HD') || u.includes('HOPDONG') || u.endsWith('KY'));
            });
            const yearTag = currentTags.find(t => {
              const u = t.toUpperCase();
              return (u.startsWith('NAM') || u.startsWith('YEAR')) && (u.includes('KY') || u.includes('HD') || u.includes('HOPDONG') || u.endsWith('KY'));
            });
            
            if (dayTag) smartUpdates[dayTag] = d.padStart(2, '0');
            if (monthTag) smartUpdates[monthTag] = m.padStart(2, '0');
            if (yearTag) smartUpdates[yearTag] = y;
          }
       }
 
       // If we are selecting a new invoice, we ALREADY reset all possible smart-tags in smartUpdates above.
       // So regardless of whether we found a match, the setContractFormData will clear old values.
       setContractFormData(prev => ({ ...prev, ...smartUpdates }));
     }
     // --- End Smart Extraction ---
 
     const upperTag = activeInvoiceTag.toUpperCase();
     const isTableTag = upperTag.includes('BANG');
     
     if (isTableTag) {
       // Create Professional Markdown Table for goods/services
       let markdownTable = "| STT | Nội dung hàng hóa, dịch vụ | ĐVT | Số lượng | Đơn giá | Thành tiền |\n";
       markdownTable += "|:---:|:---|:---:|---:|---:|---:|\n";
       
       const safeParse = (v: any) => {
         if (typeof v === 'number') return v;
         const s = String(v || '0').replace(/[^0-9]/g, '');
         return parseInt(s, 10) || 0;
       };
 
       const template = contractForm.selectedTemplate;
       const isSpecialContract = template === 'HDNT' || template === 'HDCM';
       
       let itemsToDisplay: any[] = [];
       const rawItems: any[] = [];
 
       selectedDatas.forEach(inv => {
         const data = inv.extractedData || {};
         const items = data.items || data.lineItems || inv.lineItems || [];
         rawItems.push(...items);
       });
 
       if (isSpecialContract) {
         // Merge items logic: Group by (Name/Description, Unit, Price)
         const mergedMap = new Map<string, any>();
         
         rawItems.forEach(item => {
           const desc = (item.description || item.name || '---').trim();
           const unit = (item.unit || item.DVT || '---').trim();
           const price = safeParse(item.unitPrice || item.Don_Gia || '0');
           
           // Create a unique key for grouping
           const key = `${desc.toLowerCase()}|${unit.toLowerCase()}|${price}`;
           
           const qty = safeParse(item.quantity || item.SL || '0');
           const totalLine = safeParse(item.total || item.Thanh_Tien || item.amount || (qty * price));
           
           if (mergedMap.has(key)) {
             const existing = mergedMap.get(key);
             existing.quantity += qty;
             existing.total += totalLine;
           } else {
             mergedMap.set(key, {