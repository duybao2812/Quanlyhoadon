     }
   }, [user, partners]);
 
   const renderInvoiceList = (items: any[], placement: 'left' | 'right' = 'right') => {
     const sortedItems = [...items].sort((a, b) => {
         const dateA = a.extractedData?.invoice?.date || a.extractedData?.date || '';
         const dateB = b.extractedData?.invoice?.date || b.extractedData?.date || '';
         const tA = parseInvoiceDate(dateA);
         const tB = parseInvoiceDate(dateB);
         return tA - tB; // chronological oldest -> newest
     });
 
     return sortedItems.map((inv: any, index: number) => {
       const displayInvoiceNumber = inv.computedInvoiceNumber || '';
       const displaySymbol = inv.computedInvoiceSymbol || inv.extractedData?.invoice?.serial || '';
       const localRank = index + 1;
       const displayFullNumber = displaySymbol ? `${displaySymbol}-${displayInvoiceNumber}` : displayInvoiceNumber;
       const displayName = `${localRank}. Hóa đơn số: ${displayFullNumber || '---'}`;
       
       const rawDate = inv.extractedData?.invoice?.date || inv.extractedData?.date || '';
       const displayDate = rawDate ? formatDisplayDate(rawDate) : (inv.createdAt?.toDate ? new Date(inv.createdAt.toDate()).toLocaleDateString() : '');
 
       const seller = inv.extractedData?.seller;
       const buyer = inv.extractedData?.buyer;
       const itemsList = inv.extractedData?.items || [];
 
       return (
         <InvoiceItemComp 
           key={inv.id}
           displayName={displayName}
           placement={placement}
           invoice={{
             id: inv.id,
             invoiceNumber: displayInvoiceNumber || '---',
             invoiceSymbol: displaySymbol || undefined,
             companyName: inv.extractedData?.seller?.name || '---',
             taxCode: inv.extractedData?.seller?.taxCode || '---',
             buyerName: inv.extractedData?.buyer?.name || '---',
             buyerTaxCode: inv.extractedData?.buyer?.taxCode || '---',
             classification: typeof inv.extractedData?.classification === 'object' ? inv.extractedData.classification.type : (inv.extractedData?.classification || 'BB_VT'),
             address: inv.extractedData?.buyer?.address || '---',