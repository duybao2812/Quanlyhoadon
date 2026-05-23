       });
 
       
       setSelectedPartyAId('');
       setSelectedPartyBId('');
     } catch (error) {
       console.error(error);
       toast('Lỗi khi đọc template: ' + (error instanceof Error ? error.message : String(error)), 'error');
     }
   };
 
   const getMappingForPartner = (partner: Partner, prefix: 'A' | 'B') => {
     const isA = prefix === 'A';
     const abbrName = abbreviateCompanyName(partner.name);
     const effectiveAddress = getEffectiveAddressByCurrentDate(partner);
     
     return {
       [`${prefix}_TEN`]: partner.name,
       [`${prefix}_TEN_VT`]: abbrName,
       [`BEN_${prefix}`]: partner.name,
       [`BEN${prefix}`]: partner.name,
       [`TEN_CTY_${prefix}`]: partner.name,
       [`TEN_CTY_${prefix}_VT`]: abbrName,
       [`DIA_CHI_${prefix}`]: effectiveAddress,
       [`DIACHI_${prefix}`]: effectiveAddress,
       [`DIA_CHI_${isA ? 'A' : 'B'}`]: effectiveAddress,
       [`DIACHI_${isA ? 'A' : 'B'}`]: effectiveAddress,
       [`MST_${prefix}`]: partner.taxCode,
       [`MST${prefix}`]: partner.taxCode,
       [`DAI_DIEN_${prefix}`]: partner.representative,
       [`DAIDIEN_${prefix}`]: partner.representative,
       [`CHUC_VU_${prefix}`]: partner.position,
       [`CHUCVU_${prefix}`]: partner.position,
       [`GIOI_TINH_${prefix}`]: partner.gender,
       [`STK_${prefix}`]: partner.accountNumber,
       [`NH_${prefix}`]: partner.bankName,
       // Common variations
       [`${isA ? 'BENA' : 'BENB'}`]: partner.name,
       [`${isA ? 'BENA' : 'BENB'}_VT`]: abbrName,
       [`DIA_CHI_${isA ? 'BEN_A' : 'BEN_B'}`]: effectiveAddress,
       [`DIACHI_${isA ? 'BEN_A' : 'BEN_B'}`]: effectiveAddress,
       [`MST_${isA ? 'BEN_A' : 'BEN_B'}`]: partner.taxCode,
       [`DAI_DIEN_${isA ? 'BEN_A' : 'BEN_B'}`]: partner.representative,
       [`CHUC_VU_${isA ? 'BEN_A' : 'BEN_B'}`]: partner.position,
     };
   };
 
   const handlePartyChange = (partnerId: string, type: 'A' | 'B') => {
     if (type === 'A') setSelectedPartyAId(partnerId);
     else setSelectedPartyBId(partnerId);
 
     const partner = partners.find(p => p.id === partnerId);
     if (!partner) return;
 
     const newFormData = { ...formData };
     const mapping = getMappingForPartner(partner, type);
 
     // Chúng ta lặp qua danh sách tag từ template + các tag ảo để đảm bảo cập nhật đầy đủ
     const allTags = new Set([...tags, 'DIA_CHI_A', 'DIA_CHI_B', 'DIACHI_A', 'DIACHI_B', 'DIA_CHI_BEN_A', 'DIA_CHI_BEN_B']);
     
     allTags.forEach(tag => {
       const upperTag = tag.toUpperCase();
       // Try direct match from mapping
       if (mapping[upperTag]) {
         newFormData[tag] = mapping[upperTag]!;
       } else {
         // Try fuzzy matching for common patterns - use stricter checks
         const isSideA = upperTag.includes('BENA') || upperTag.includes('BEN_A') || upperTag.includes('BEN A') || upperTag.endsWith('_A') || upperTag.startsWith('A_') || upperTag.includes('BEN_DUOC_DE_NGHI');
         const isSideB = upperTag.includes('BENB') || upperTag.includes('BEN_B') || upperTag.includes('BEN B') || upperTag.endsWith('_B') || upperTag.startsWith('B_') || upperTag.includes('BEN_DE_NGHI') || (upperTag.includes('DE_NGHI') && !upperTag.includes('DUOC'));
         
         const isCorrectSide = (type === 'A' && isSideA) || (type === 'B' && isSideB);
 