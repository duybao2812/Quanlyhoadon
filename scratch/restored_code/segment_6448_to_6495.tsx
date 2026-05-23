             extractedData = normalizeExtractedData(extractedData);
             
             if (extractedData.items) {
               try {
                 const { classifyInvoice } = await import('./lib/mistral');
                 extractedData.classification = await classifyInvoice(extractedData.items);
               } catch (e) {
                 console.error("Classification failed:", e);
               }
             }
           } else {
             updateLoading(`Đang trích xuất AI: ${file.name}`);
             setRequestCount(prev => prev + 1);
             try {
               const rawExtracted = await extractFromInvoice(file);
               extractedData = normalizeExtractedData(rawExtracted);
             } catch (err: any) {
               const errMsg = err.message || "";
               if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota")) {
                 setIsTokenLimited(true);
                 setCountdown(60);
                 toast("Lỗi giới hạn Token AI. Đang tạm dừng...", "error");
                 
                 const timer = setInterval(() => {
                   setCountdown(prev => {
                     if (prev <= 1) {
                       clearInterval(timer);
                       return 0;
                     }
                     return prev - 1;
                   });
                 }, 1000);
 
                 await new Promise(resolve => setTimeout(resolve, 60000));
                 setIsTokenLimited(false);
                 i--; // Retry same file
                 if (docRef) await supabase.from('invoices').delete().eq('id', docRef.id);
                 continue;
               }
               throw err;
             }
             
             if (extractedData && (extractedData.items || extractedData.items_list)) {
               try {
                 const { classifyInvoice } = await import('./lib/mistral');
                 const items = extractedData.items || extractedData.items_list || [];
                 extractedData.classification = await classifyInvoice(items);
               } catch (e) {