         const p = partners.find(ptr => ptr.id === targetPartnerId);
         if (p) {
           const uTag = tag.toUpperCase();
           if (uTag.includes('DIA_CHI') || uTag.includes('DIACHI')) {
             newFormData[tag] = getEffectiveAddressByCurrentDate(p);
           } else {
             newFormData[tag] = abbreviateCompanyName(p.name);
           }
         }
       }
     });
 
     setFormData(newFormData);
     toast(`Đã cập nhật thông tin Bên ${type}: ${partner.name}`, "success");
   };
 
   const forceUpdateAddresses = useCallback(() => {
     setFormData(prevFormData => {
       const newFormData = { ...prevFormData };
       let needsUpdateTotal = false;
       
       const parties: Array<{id: string, type: 'A' | 'B'}> = [
         { id: selectedPartyAId, type: 'A' },
         { id: selectedPartyBId, type: 'B' }
       ];
 
       parties.forEach(({id, type}) => {
         if (!id) return;
         const partner = partners.find(p => p.id === id);
         if (!partner) return;
 
         // Pass prevFormData to ensure we use current values in the calculation
         const effectiveAddress = getEffectiveAddressWithData(partner, prevFormData);
         
         const allPossibleTags = new Set([
           ...Object.keys(newFormData), 
           'DIA_CHI_A', 'DIA_CHI_B', 'DIACHI_A', 'DIACHI_B', 
           'DIA_CHI_BEN_A', 'DIA_CHI_BEN_B', 'DIA_CHI_BEN A', 'DIA_CHI_BEN B',
           'DAI_DIEN_A', 'DAI_DIEN_B', 'DAIDIEN_A', 'DAIDIEN_B',
           'DAI_DIEN_BEN_A', 'DAI_DIEN_BEN_B'
         ]);
         
         allPossibleTags.forEach(tag => {
           const upperTag = tag.toUpperCase();
           const isAddressTag = upperTag.includes('DIA_CHI') || upperTag.includes('DIACHI');
           const isRepTag = upperTag.includes('DAI_DIEN') || upperTag.includes('DAIDIEN');
           
           if (!isAddressTag && !isRepTag) return;
           
           // Stricter check for Side A/B to prevent cross-contamination (e.g. _B matching _BENA)
           const isSideA = 
             upperTag.endsWith('_A') || 
             upperTag.includes('BEN_A') || 
             upperTag.includes('BEN A') || 
             upperTag.includes('BENA') || 
             upperTag.startsWith('A_');
 
           const isSideB = 
             upperTag.endsWith('_B') || 
             upperTag.includes('BEN_B') || 
             upperTag.includes('BEN B') || 
             upperTag.includes('BENB') || 
             upperTag.startsWith('B_');
 
           const isCorrectSide = (type === 'A' && isSideA) || (type === 'B' && isSideB);
           
           if (isCorrectSide) {
             const targetVal = isAddressTag ? effectiveAddress : (partner.representative || '');
             const currentVal = newFormData[tag] || '';
             if (currentVal !== targetVal) {
               newFormData[tag] = targetVal;
               needsUpdateTotal = true;
             }
           }
         });
       });
 
       if (needsUpdateTotal) {
         return newFormData;
       }
       return prevFormData;
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
 
   const getTagType = (tag: string) => {
     if (!templateBuffer || !selectedTemplate) return;
     if (u === 'BENA' || u === 'BENB' || u.includes('TEN_CTY') || u === 'BEN_A' || u === 'BEN_B') return 'company';
     if (u.includes('GIOI_TINH') || u.includes('GIOITINH')) return 'gender';
     if (u.includes('DAI_DIEN') || u.includes('DAIDIEN')) return 'rep';
     if (u.includes('CHUC_VU') || u.includes('CHUCVU')) return 'pos';
     if (u.includes('STK') || u.includes('SO_TAI_KHOAN') || u.includes('SOTAIKHOAN')) return 'stk';
     if (u === 'NH' || u.startsWith('NH_') || u.endsWith('_NH') || u.includes('_NH_') || u.includes('NGAN_HANG') || u.includes('NGANHANG')) return 'bank';
     if (u.includes('DIA_CHI') || u.includes('DIACHI')) return 'address';
         zip.file("word/document.xml", docXml);
       }
 
   const renderCategorizedPartyTags = (sideTags: string[]) => {
         paragraphLoop: true, 
         linebreaks: true, 
       row2: { gender: string | null, rep: string | null, pos: string | null },
       row3: { stk: string | null, bank: string | null },
       others: string[],
       const dataToRender: Record<string, string> = {};
       Object.keys(formData).forEach(tag => {
         const upper = tag.toUpperCase();
         // Skip dots for common table-related tags if empty
         const isTableTag = upper.includes('NOI_DUNG') || 
                            upper.includes('DVT') || 
                            upper.includes('SOLUONG') || 
                            upper.includes('SL') || 
                            upper.includes('DON_GIA') ||
                            upper.includes('DONGIA') ||
                            upper.includes('THANHTIEN') ||
                            upper.includes('THANH_TIEN');
       else if (type === 'gender') groups.row2.gender = tag;
       else if (type === 'rep') groups.row2.rep = tag;
       else if (type === 'pos') groups.row2.pos = tag;
       else if (type === 'stk') groups.row3.stk = tag;
       else if (type === 'bank') groups.row3.bank = tag;
       else if (type === 'address') groups.address.push(tag);
       else groups.others.push(tag);
           } catch (e) {
             console.error("Failed to parse BANG_GDN for rendering", e);
     return (
       <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5">
             rows = [{ stt: "1", noidung: "", donvi: "Đồng", giatri: "" }];
         {groups.company.map(tag => (
           dataToRender[tag] = generateGdnDocxTable(rows);
             <TagRenderItem tag={tag} {...commonItemProps} />
           const tamungKey = Object.keys(formData).find(k => k.toUpperCase() === 'TAMUNG-THANHTOAN') || 'TAMUNG-THANHTOAN';
           dataToRender[tag] = (formData[tamungKey] || '').toUpperCase();
         } else if (upper === 'BEN_DUOC_DE_NGHI_TITLE' || upper === 'BEN_DE_NGHI_TITLE') {
           const baseKey = upper === 'BEN_DUOC_DE_NGHI_TITLE' ? 'BEN_DUOC_DE_NGHI' : 'BEN_DE_NGHI';
           const matchKey = Object.keys(formData).find(k => k.toUpperCase() === baseKey) || baseKey;
           dataToRender[tag] = (formData[matchKey] || '').toUpperCase();
         } else if (upper === 'BEN_DUOC_DE_NGHI' || upper === 'BEN_DE_NGHI') {
           dataToRender[tag] = toVietnameseTitleCase(formData[tag]) || "....................";
                 <TagRenderItem tag={groups.row2.gender} {...commonItemProps} />
           dataToRender[tag] = formData[tag] || (isTableTag ? "" : "....................");
             )}
             {groups.row2.rep && (
               <div className={cn(
                 groups.row2.gender && groups.row2.pos ? "md:col-span-5" :
       const tamungKey = Object.keys(formData).find(k => k.toUpperCase() === 'TAMUNG-THANHTOAN') || 'TAMUNG-THANHTOAN';
       const tamungVal = formData[tamungKey] || '';
                 <TagRenderItem tag={groups.row2.rep} {...commonItemProps} />
               </div>
       // Ensure all variations of company tags in the template are correctly mapped in their 
             {groups.row2.pos && (
               <div className={cn(
                 groups.row2.gender && groups.row2.rep ? "md:col-span-4" :
                 groups.row2.gender || groups.row2.rep ? "md:col-span-7" : "md:col-span-12"
               )}>
                 <TagRenderItem tag={groups.row2.pos} {...commonItemProps} />
               </div>
             )}
         if (u === 'BEN_DUOC_DE_NGHI_TITLE') {
           dataToRender[tag] = benDuocVal.toUpperCase();
         } else if (u === 'BEN_DE_NGHI_TITLE') {
           dataToRender[tag] = benDeNghiVal.toUpperCase();
         {(groups.row3.stk || groups.row3.bank) && (
           dataToRender[tag] = toVietnameseTitleCase(benDuocVal) || "....................";
         } else if (u === 'BEN_DE_NGHI') {
           dataToRender[tag] = toVietnameseTitleCase(benDeNghiVal) || "....................";
                 <TagRenderItem tag={groups.row3.stk} {...commonItemProps} />
               </div>
             )}
       // Double-safety for default exact casing if not captured above
       if (!dataToRender['BEN_DUOC_DE_NGHI_TITLE']) dataToRender['BEN_DUOC_DE_NGHI_TITLE'] = benDuocVal.toUpperCase();
       if (!dataToRender['BEN_DE_NGHI_TITLE']) dataToRender['BEN_DE_NGHI_TITLE'] = benDeNghiVal.toUpperCase();
       if (!dataToRender[benDuocKey]) dataToRender[benDuocKey] = toVietnameseTitleCase(benDuocVal) || "....................";
       if (!dataToRender[benDeNghiKey]) dataToRender[benDeNghiKey] = toVietnameseTitleCase(benDeNghiVal) || "....................";
           </React.Fragment>
       doc.render(dataToRender);
       const out = doc.getZip().generate({ type: 'blob', compression: 'DEFLATE' });
       const templateName = CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate)?.name || 'HopDong';
       const fileName = `${templateName}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.docx`;
     const getVal = (tag: string) => formData[tag] || '';
     const setVal = (tag: string, val: string) => handleFieldChange(tag, val);
           </div>
       // Save metadata to Supabase
       <div className="font-serif text-[#1a1a1a] text-xs leading-relaxed max-w-[800px] w-full mx-auto bg-white p-8 md:p-14 shadow-2xl rounded-sm border border-gray-200 my-4 text-left relative transition-all duration-300">
         {/* National Emblem & Admin Title */}
         <div className="grid grid-cols-2 gap-4 mb-6 font-serif">
           <div className="text-left font-bold text-[10.5px] uppercase leading-tight">
             <TagRenderItem tag={tag} {...commonItemProps} />
               <InlineField tag="TEN_CTY_VIET_TAT" value={getVal('TEN_CTY_VIET_TAT')} onChange={(v) => setVal('TEN_CTY_VIET_TAT', v)} placeholder="[Tên Cty Viết Tắt]" />
             </div>
             <div className="font-normal normal-case italic text-[9.5px] mt-1 text-gray-500">
               Số: <InlineField tag="SO_GDN" value={getVal('SO_GDN')} onChange={(v) => setVal('SO_GDN', v)} placeholder="........" />
     } catch (error: any) {
             <div className="font-normal text-[9px] mt-1 text-gray-800">
               (V/v: Đề nghị <InlineField tag="TAMUNG-THANHTOAN" type="select" options={['tạm ứng', 'thanh toán']} value={getVal('TAMUNG-THANHTOAN')} onChange={(v) => setVal('TAMUNG-THANHTOAN', v)} placeholder="tạm ứng / thanh toán" />)
       toast('Lỗi khi tạo hợp đồng: ' + errorMessage, 'error');
     setIsGenerating(true);
           <div className="text-center font-bold">
       const zip = new PizZip(templateBuffer);
       
       let docXml = zip.file("word/document.xml")?.asText() || "";
   const handleDateGroupChange = (groupId: string, dateStr: string) => {
         docXml = docXml.replace(/\[BANG_GDN\]/g, '[@BANG_GDN]');
         zip.file("word/document.xml", docXml);
       }
     if (!dateStr) {
       const doc = new Docxtemplater(zip, { 
         const next = { ...prev };
         if (group.day) next[group.day] = '';
         if (group.month) next[group.month] = '';
         if (group.year) next[group.year] = '';
         return next;
       const dataToRender: Record<string, string> = {};
       Object.keys(formData).forEach(tag => {
         const upper = tag.toUpperCase();
         // Skip dots for common table-related tags if empty
         const isTableTag = upper.includes('NOI_DUNG') || 
                            upper.includes('DVT') || 
                            upper.includes('SOLUONG') || 
                            upper.includes('SL') || 
                            upper.includes('DON_GIA') ||
                            upper.includes('DONGIA') ||
                            upper.includes('THANHTIEN') ||
                            upper.includes('THANH_TIEN');
       if (group.month) next[group.month] = m;
       if (group.year) next[group.year] = y;
           let rows: GdnRow[] = [];
           try {
             if (formData[tag]) {
               rows = JSON.parse(formData[tag]);
   const renderGdnDocument = () => {
     const getVal = (tag: string) => formData[tag] || '';
     const setVal = (tag: string, val: string) => handleFieldChange(tag, val);
           }
           if (!Array.isArray(rows) || rows.length === 0) {
       <div className="font-serif text-[#1a1a1a] text-xs leading-relaxed max-w-[800px] w-full mx-auto bg-white p-8 md:p-14 shadow-2xl rounded-sm border border-gray-200 my-4 text-left relative transition-all duration-300">
         {/* National Emblem & Admin Title */}
         <div className="grid grid-cols-2 gap-4 mb-6 font-serif">
           <div className="text-center font-bold text-[10.5px] uppercase leading-tight">
           const tamungKey = Object.keys(formData).find(k => k.toUpperCase() === 'TAMUNG-THANHTOAN') || 'TAMUNG-THANHTOAN';
             <div className="font-normal normal-case italic text-[9.5px] mt-1 text-gray-500">
               Số: <InlineField tag="SO_GDN" value={getVal('SO_GDN')} onChange={(v) => setVal('SO_GDN', v)} placeholder="........" />
           const baseKey = upper === 'BEN_DUOC_DE_NGHI_TITLE' ? 'BEN_DUOC_DE_NGHI' : 'BEN_DE_NGHI';
           const matchKey = Object.keys(formData).find(k => k.toUpperCase() === baseKey) || baseKey;
           dataToRender[tag] = (formData[matchKey] || '').toUpperCase();
             <div className="font-bold text-[10.5px] uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
             <div className="font-bold text-[9.5px] underline underline-offset-4 mt-1">Độc lập - Tự do - Hạnh phúc</div>
         } else {
         </div>
 
         {/* Document Title */}
         <div className="text-center my-8 space-y-1">
             Rất mong được <span className="font-bold">{getVal('BEN_DUOC_DE_NGHI') || '....................'}</span> xem xét, chấp thuận và thực hiện <span className="font-bold text-blue-900">{getVal('TAMUNG-THANHTOAN') || '....................'}</span> để tạo điều kiện hỗ trợ chi phí cho Công ty.
           </p>
           <p>Xin chân thành cảm ơn !</p>
         </div>
 
         {/* Signatures block */}
           dataToRender[tag] = (formData[matchKey] || '').toUpperCase();
           <div className="grid grid-cols-2 gap-4 text-center font-bold text-[10.5px]">
           dataToRender[tag] = toVietnameseTitleCase(formData[tag]) || "....................";
               <span className="font-bold">Nơi nhận:</span>
           dataToRender[tag] = formData[tag] || (isTableTag ? "" : "....................");
             - Phòng Tài chính - Kế toán <InlineField tag="BEN_DUOC_DE_NGHI_TITLE" value={getVal('BEN_DUOC_DE_NGHI_TITLE') || getVal('BEN_DUOC_DE_NGHI')} onChange={(v) => setVal('BEN_DUOC_DE_NGHI_TITLE', v)} placeholder="Ban Tài chính kế toán..." className="font-bold min-w-[200px]" />
                 <p>- Lưu PKT.KT.</p>
               </div>
       // Ensure TAMUNG-THANHTOAN_TITLE is in dataToRender
       const tamungKey = Object.keys(formData).find(k => k.toUpperCase() === 'TAMUNG-THANHTOAN') || 'TAMUNG-THANHTOAN';
         <div className="space-y-3 mb-6 font-serif">
                 <InlineField tag="BEN_DE_NGHI_TITLE" value={getVal('BEN_DE_NGHI_TITLE') || getVal('BEN_DE_NGHI').toUpperCase()} onChange={(v) => setVal('BEN_DE_NGHI_TITLE', v)} placeholder="BÊN ĐỀ NGHỊ" className="font-bold uppercase" />
             Tôi tên là: <InlineField tag="DAI_DIEN_BEN_DE_NGHI" value={getVal('DAI_DIEN_BEN_DE_NGHI')} onChange={(v) => setVal('DAI_DIEN_BEN_DE_NGHI', v)} placeholder="Họ tên người đề nghị..." />
       // Ensure all variations of company tags in the template are correctly mapped in their exact case
             <InlineField tag="BEN_DE_NGHI" value={getVal('BEN_DE_NGHI')} onChange={(v) => setVal('BEN_DE_NGHI', v)} placeholder="Tên công ty Bên B (Đơn vị đề nghị)..." onOpenSelector={() => { setActiveInvoiceTag?.('BEN_DE_NGHI'); setIsInvoiceSelectorOpen?.(true); }} className="font-bold" />
       const benDeNghiKey = Object.keys(formData).find(k => k.toUpperCase() === 'BEN_DE_NGHI') || 'BEN_DE_NGHI';
       const benDuocVal = formData[benDuocKey] || '';
             Đề nghị thanh toán/tạm ứng cho nội dung công việc theo hợp đồng số: <InlineField tag="SO_HD" value={getVal('SO_HD') || getVal('SO_HOPDONG') || getVal('SOHOPDONG') || getVal('SOHD')} onChange={(v) => { setVal('SO_HD', v); setVal('SO_HOPDONG', v); }} placeholder="Số hợp đồng..." />
             <span className="ml-4 font-bold">ký ngày: </span>
             <InlineField tag="NGAY_KY_HOP_DONG" type="date" value={getVal('NGAY_KY_HOP_DONG')} onChange={(v) => setVal('NGAY_KY_HOP_DONG', v)} placeholder="ngày ký..." />
       genTags.forEach(tag => {
         const u = tag.toUpperCase();
         if (u === 'BEN_DUOC_DE_NGHI_TITLE') {
     const getVal = (tag: string) => formData[tag] || '';
     const setVal = (tag: string, val: string) => handleFieldChange(tag, val);
           dataToRender[tag] = benDeNghiVal.toUpperCase();
     const contractNumber = getVal('SO_HOPDONG') || getVal('SO_HD') || getVal('SOHOPDONG') || getVal('SOHD');
           dataToRender[tag] = toVietnameseTitleCase(benDuocVal) || "....................";
         } else if (u === 'BEN_DE_NGHI') {
           dataToRender[tag] = toVietnameseTitleCase(benDeNghiVal) || "....................";
       setVal('SOHOPDONG', v);
       setVal('SOHD', v);
     };
       // Double-safety for default exact casing if not captured above
       if (!dataToRender['BEN_DUOC_DE_NGHI_TITLE']) dataToRender['BEN_DUOC_DE_NGHI_TITLE'] = benDuocVal.toUpperCase();
       <div className="font-serif text-[#1a1a1a] text-xs leading-relaxed max-w-[800px] w-full mx-auto bg-white p-8 md:p-14 shadow-2xl rounded-sm border border-gray-200 my-4 text-left relative transition-all duration-300">
       if (!dataToRender[benDuocKey]) dataToRender[benDuocKey] = toVietnameseTitleCase(benDuocVal) || "....................";
       if (!dataToRender[benDeNghiKey]) dataToRender[benDeNghiKey] = toVietnameseTitleCase(benDeNghiVal) || "....................";
 
       doc.render(dataToRender);
       const out = doc.getZip().generate({ type: 'blob', compression: 'DEFLATE' });
       const templateName = CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate)?.name || 'HopDong';
       const fileName = `${templateName}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.docx`;
       
       saveAs(out, fileName);
       
       // Save metadata to Supabase
       await onContractSaved({
         templateId: selectedTemplate,
         partyAId: selectedPartyAId,
         partyBId: selectedPartyBId,
         formData: formData,
         fileName: fileName
       });
 
       toast("Đã tạo hợp đồng và lưu vào hệ thống!", "success");
     } catch (error: any) {
       console.error(error);