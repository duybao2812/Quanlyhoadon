     partners, 
     toast,
     handleFieldChange,
     getEffectiveAddressByCurrentDate
   };
 
   const [isGenerating, setIsGenerating] = useState(false);
 
   const CONTRACT_TEMPLATES = [
     { id: 'HDNT', name: 'Hợp đồng Nguyên Tắc', file: 'Template_HDNT.docx' },
     { id: 'HDTC', name: 'Hợp đồng Thi Công', file: 'Template_HDTC.docx' },
     { id: 'HDCM', name: 'Hợp đồng Ca Máy', file: 'Template_HDCM.docx' },
     { id: 'GDNTT', name: 'Giấy đề nghị thanh toán/ tạm ứng', file: 'Template GDN TT.docx' }
   ];
 
   const handleTemplateChange = async (templateId: string) => {
     setSelectedTemplate(templateId);
     const template = CONTRACT_TEMPLATES.find(t => t.id === templateId);
     if (!template) return;
 
     try {
       let basePath = (import.meta as any).env?.BASE_URL || './';
       if (basePath === './') {
         const pathSegments = window.location.pathname.split('/');
         basePath = pathSegments.slice(0, -1).join('/') + '/';
       }
       if (!basePath.endsWith('/')) basePath += '/';
       
       const folderName = templateId === 'GDNTT' ? 'templates_muc_phu' : 'templatesHopDong';
       const finalPath = `${basePath}${folderName}/${template.file}`.replace(/\/+/g, '/');
       const response = await fetch(finalPath);
       if (!response.ok) throw new Error('Không thể tải template');
       const buffer = await response.arrayBuffer();
       setTemplateBuffer(buffer);
       const extractedTags = extractTags(buffer);
       
       // Smart substitution: if template has BEN_DUOC_DE_NGHI_TITLE or BEN_DE_NGHI_TITLE,
       // ensure we have the base versions in finalTags for input forms, and remove the _TITLE versions.
       let finalTags: string[] = [];
       let hasBenDuoc = false;
       let hasBenDeNghi = false;
       
       extractedTags.forEach(tag => {
         const u = tag.toUpperCase();
         if (u === 'BEN_DUOC_DE_NGHI_TITLE' || u === 'BEN_DUOC_DE_NGHI') {
           hasBenDuoc = true;
         } else if (u === 'BEN_DE_NGHI_TITLE' || u === 'BEN_DE_NGHI') {
           hasBenDeNghi = true;
         } else if (u !== 'TAMUNG-THANHTOAN_TITLE') {
           finalTags.push(tag);
         }
       });
       
       if (hasBenDuoc) {
         finalTags.push('BEN_DUOC_DE_NGHI');
       }
       if (hasBenDeNghi) {
         finalTags.push('BEN_DE_NGHI');
       }
       
       // HDTC needs DIADIEM field even if not in template tags
       if (templateId === 'HDTC' && !finalTags.some(t => {
         const u = t.toUpperCase();
         return u === 'DIA_DIEM' || u === 'DIADIEM' || u === 'DIA DIEM';
       })) {
         finalTags.push('DIADIEM');
       }
       
       setTags(finalTags);
       
       // When switching templates, we only initialize missing tags for the NEW template's specific data
       setFormData((oldDataForThisTemplate: Record<string, string>) => {
         const next = { ...oldDataForThisTemplate };
         finalTags.forEach(tag => {
           if (next[tag] === undefined) next[tag] = '';
         });