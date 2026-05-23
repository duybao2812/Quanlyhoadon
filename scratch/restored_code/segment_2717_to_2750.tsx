 
     // Detect related Day/Month/Year fields to group them
     const groups: Record<string, { day?: string, month?: string, year?: string }> = {};
     const dateTags = new Set<string>();
 
     tags.forEach(tag => {
       const upper = tag.toUpperCase();
       
       // Smart detection of date components
       // Patterns: NGAY_KY, THANG_KY, NAM_KY or DAY_CTR, MONTH_CTR, YEAR_CTR
       const datePatterns = [
         { key: 'day', regex: /^(NGAY|DAY)_?(.*)$/i },
         { key: 'month', regex: /^(THANG|MONTH)_?(.*)$/i },
         { key: 'year', regex: /^(NAM|YEAR)_?(.*)$/i }
       ];
 
       for (const pattern of datePatterns) {
         const match = upper.match(pattern.regex);
         if (match) {
           const suffix = match[2] || 'DEFAULT';
           if (!groups[suffix]) groups[suffix] = {};
           (groups[suffix] as any)[pattern.key] = tag;
           dateTags.add(tag);
           break;
         }
       }
 
       if (upper === 'BEN_DUOC_DE_NGHI_TITLE' || upper === 'BEN_DE_NGHI_TITLE' || upper === 'TAMUNG-THANHTOAN_TITLE') {
         // Skip derived uppercase tags from form categories
       } else if (upper.includes('BEN A') || upper.includes('BENA') || upper.includes('BEN_A') || upper.endsWith('_A') || upper.startsWith('A_') || upper.includes('BEN_DUOC_DE_NGHI')) {
         categories.partyA.push(tag);
       } else if (upper.includes('BEN B') || upper.includes('BENB') || upper.includes('BEN_B') || upper.endsWith('_B') || upper.startsWith('B_') || upper.includes('BEN_DE_NGHI') || (upper.includes('DE_NGHI') && !upper.includes('DUOC'))) {
         categories.partyB.push(tag);
       } else {