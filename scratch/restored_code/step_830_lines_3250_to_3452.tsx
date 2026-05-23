       if (g.year) keys.push(formData[g.year] || '');
     });
     return keys.join('|');
   }, [dateGroups, formData]);
 
   useEffect(() => {
     forceUpdateAddresses();
   }, [dateValuesString, selectedPartyAId, selectedPartyBId, forceUpdateAddresses]);
 
   const handleGenerate = async () => {
     if (!templateBuffer || !selectedTemplate) return;
     setIsGenerating(true);
     try {
       const zip = new PizZip(templateBuffer);
       
       let docXml = zip.file("word/document.xml")?.asText() || "";
       if (docXml.includes('[BANG_GDN]')) {
         docXml = docXml.replace(/\[BANG_GDN\]/g, '[@BANG_GDN]');
         zip.file("word/document.xml", docXml);
       }
 
       const doc = new Docxtemplater(zip, { 
         paragraphLoop: true, 
         linebreaks: true, 
         delimiters: { start: "[", end: "]" } 
       });
       
       const dataToRender: Record<string, string> = {};
       Object.keys(formData).forEach(tag => {
         const upper = tag.toUpperCase();
         // Skip dots for common table-related tags if empty
         const isTableTag = upper.includes('NOI_DUNG') || 
                            upper.includes('DVT') || 
                            upper.includes('SOLUONG') || 
                            upper.includes('SL') || 
                            upper.includes('DON_GIA') ||
                            upper.includes('DONGIA') |
           </p>
           <p>
             Rất mong được <span className="font-bold">{getVal('BEN_DUOC_DE_NGHI') || '....................'}</span> xem xét, chấp thuận và thực hiện <span className="font-bold text-blue-900">{getVal('TAMUNG-THANHTOAN') || '....................'}</span> để tạo điều kiện hỗ trợ chi phí cho Công ty.
           </p>
           <p>Xin chân thành cảm ơn !</p>
         </div>
 
         {/* Signatures block */}
         <div className="mt-12 font-serif">
           <div className="grid grid-cols-2 gap-4 text-center font-bold text-[10.5px]">
             <div className="text-left font-normal">
               <span className="font-bold">Nơi nhận:</span>
               <div className="text-[9.5px] mt-1 space-y-0.5 text-gray-600">
                 <p>- Như kính gửi;</p>
                 <p>- Lưu PKT.KT.</p>
               </div>
             </div>
             <div>
               <div className="uppercase">
                 <InlineField tag="BEN_DE_NGHI_TITLE" value={getVal('BEN_DE_NGHI_TITLE') || getVal('BEN_DE_NGHI').toUpperCase()} onChange={(v) => setVal('BEN_DE_NGHI_TITLE', v)} placeholder="BÊN ĐỀ NGHỊ" className="font-bold uppercase" />
               </div>
               <div className="font-normal italic text-[9.5px] text-gray-500 mt-1">Giám đốc</div>
               <div className="mt-24 text-blue-900 font-bold">{getVal('DAI_DIEN_BEN_DE_NGHI') || getVal('DAIDIENBENB') || '....................'}</div>
             </div>
           </div>
         </div>
       </div>
     );
   };
 