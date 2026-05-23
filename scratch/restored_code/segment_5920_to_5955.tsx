         const grandTotal = total + vat;
         
         markdownTable += `| | TỔNG CỘNG TIỀN HÀNG | | | | ${formatThousands(String(total))} |\n`;
         markdownTable += `| | THUẾ GIÁ TRỊ GIA TĂNG (10%) | | | | ${formatThousands(String(vat))} |\n`;
         markdownTable += `| | TỔNG CỘNG TIỀN THANH TOÁN | | | | ${formatThousands(String(grandTotal))} |`;
         
         const valueTag = contractForm.tags.find(t => {
           const u = t.toUpperCase();
           return (u.includes('GIATRI') || u.includes('SO_TIEN')) && !u.includes('BANG') && !u.includes('CHU');
         });
         if (valueTag) {
           handleContractFieldChange(valueTag, String(grandTotal));
         }
       } else {
         markdownTable += `| | TỔNG CỘNG | | | | ${formatThousands(String(total))} |`;
       }
 
       handleContractFieldChange(activeInvoiceTag, markdownTable);
     } else {
       // Sum value for numeric field
       const safeParse = (v: any) => {
         if (typeof v === 'number') return v;
         return parseFloat(String(v || '0').replace(/[^0-9.-]+/g, '')) || 0;
       };
 
       const totalSum = selectedDatas.reduce((acc, inv) => {
         const data = inv.extractedData || {};
         const amt = data.totals?.grandTotal || data.totals?.totalAmount || data.totalAmount || inv.totalAmount || 0;
         return acc + safeParse(amt);
       }, 0);
       handleContractFieldChange(activeInvoiceTag, formatThousands(String(totalSum)));
     }
 
     setIsInvoiceSelectorOpen(false);
     setActiveInvoiceTag(null);
     setSelectedInvoices([]);