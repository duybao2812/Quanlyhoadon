     });
     return true; // Assume we want to show toast if called manually
   }, [selectedPartyAId, selectedPartyBId, partners]);
 
   // Track date-related keys to trigger updates
   const dateValuesString = useMemo(() => {
     const keys: string[] = [];
     dateGroups.forEach(g => {
       if (g.day) keys.push(formData[g.day] || '');
       if (g.month) keys.push(formData[g.month] || '');
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
         const upper 
       const out = doc.getZip().generate({ type: 'blob', compression: 'DEFLATE' });
       const templateName = CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate)?.name || 'HopDong';
        const renderGdnDocument = () => {
     const getVal = (tag: string) => formData[tag] || '';
     const setVal = (tag: string, val: string) => handleFieldChange(tag, val);
 
     return (
       <div className="font-serif text-[#1a1a1a] text-xs leading-relaxed max-w-[800px] w-full mx-auto bg-white p-8 md:p-14 shadow-2xl rounded-sm border border-gray-200 my-4 text-left relative transition-all duration-300">
         {/* National Emblem & Admin Title */}
         <div className="grid grid-cols-2 gap-4 mb-6 font-serif">
           <div className="text-left font-bold text-[10.5px] uppercase leading-tight">
             <div className="min-h-[1.5em]">
               <InlineField tag="TEN_CTY_VIET_TAT" value={getVal('TEN_CTY_VIET_TAT')} onChange={(v) => setVal('TEN_CTY_VIET_TAT', v)} placeholder="[Tên Cty Viết Tắt]" />
             </div>
             <div className="font-normal normal-case italic text-[9.5px] mt-1 text-gray-500">
               Số: <InlineField tag="SO_GDN" value={getVal('SO_GDN')} onChange={(v) => setVal('SO_GDN', v)} placeholder="........" />
             </div>
             <div className="font-normal text-[9px] mt-1 text-gray-800">
               (V/v: Đề nghị <InlineField tag="TAMUNG-THANHTOAN" type="select" options={['tạm ứng', 'thanh toán']} value={getVal('TAMUNG-THANHTOAN')} onChange={(v) => setVal('TAMUNG-THANHTOAN', v)} placeholder="tạm ứng / thanh toán" />)
             </div>
           </div>
           <div className="text-center font-bold">