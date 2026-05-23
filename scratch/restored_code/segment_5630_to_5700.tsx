       if (!currentId) return prev;
       
       const oldData = prev.templateFormData[currentId] || {};
       const newData = typeof updater === 'function' ? updater(oldData) : updater;
       
       return {
         ...prev,
         templateFormData: {
           ...prev.templateFormData,
           [currentId]: newData
         }
       };
     });
   };
 
   const handleContractFieldChange = (tag: string, val: string) => {
     const upperTag = tag.toUpperCase();
     const tags = contractForm.tags || [];
     
     const isTableTag = (upperTag.includes('BANG') || upperTag.includes('TABLE')) && 
                       !upperTag.includes('BANG_CHU') && !upperTag.includes('BANGCHU');
 
     // Check if this is a currency/number field
     const isCurrencyField = !isTableTag && [
       'GIATRI', 'GIA_TRI', 'SO_TIEN', 'TONG_TIEN', 'THANH_TIEN', 'PHI', 'PHIDICHVU', 'GIA_TRI_HD', 'GIATRIHOPDONG'
     ].some(v => upperTag.includes(v));
 
     let finalVal = val;
     let autoWords = '';
 
     if (isCurrencyField) {
       // Format with thousands separator
       finalVal = formatThousands(val);
       
       // Calculate words if possible
       const numericString = val.replace(/\D/g, '');
       if (numericString) {
         const num = parseInt(numericString, 10);
         if (!isNaN(num)) {
           autoWords = numberToVietnameseWords(num);
         }
       }
     } else if (upperTag === 'BANG_GDN') {
       try {
         const rows = JSON.parse(val);
         if (Array.isArray(rows)) {
           const totalSum = rows.reduce((sum, row) => {
             const num = parseInt(row.giatri, 10) || 0;
             return sum + num;
           }, 0);
           if (totalSum > 0) {
             autoWords = numberToVietnameseWords(totalSum);
           }
         }
       } catch (e) {
         // Ignore JSON parsing errors for incomplete edits
       }
     }
 
     setContractFormData((prev: Record<string, string>) => {
       const next = { ...prev, [tag]: finalVal };
       
       // If we generated words, try to find a word field to populate
       if (autoWords) {
         const wordTag = tags.find(t => {
           const u = t.toUpperCase();
           return (u.includes('BANG_CHU') || u.includes('BANGCHU')) && !u.includes('LICH');
         });
         if (wordTag) {
           next[wordTag] = autoWords;
         }