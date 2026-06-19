// Contract utility functions extracted from App.tsx
// These are shared helpers for contract management

export function getContractValueStandalone(data: Record<string, any>): string {
  if (!data) return '';

  const rawValue = data.value ?? data.GIA_TRI_HOP_DONG ?? data.TOTAL ?? data.GRAND_TOTAL ?? data.TOTAL_AMOUNT ?? data.GIA_TRI ?? data.VALUE ?? data.AMOUNT;
  
  if (rawValue !== undefined && rawValue !== null) {
    if (typeof rawValue === 'number') return rawValue.toLocaleString('vi-VN');
    if (typeof rawValue === 'string') {
      const num = parseFloat(rawValue.replace(/[^0-9.-]/g, ''));
      if (!isNaN(num)) return num.toLocaleString('vi-VN');
    }
    if (typeof rawValue === 'object') {
      const num = parseFloat(String(rawValue.amount ?? rawValue.value ?? rawValue.total ?? Object.values(rawValue)[0] ?? 0).replace(/[^0-9.-]/g, ''));
      if (!isNaN(num)) return num.toLocaleString('vi-VN');
    }
  }

  if (data.values && Array.isArray(data.values)) {
    let sum = 0;
    for (const item of data.values) {
      if (item && typeof item === 'object') {
        const num = parseFloat(String(item.value ?? item.amount ?? item.total ?? Object.values(item)[0] ?? 0).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) sum += num;
      }
    }
    if (sum > 0) return sum.toLocaleString('vi-VN');
  }

  return '';
}

export function getContractSignDateStandalone(data: Record<string, any>, createdAt?: any): string {
  if (!data) return '';

  const rawDate = data.contractDate ?? data.NGAY_BB ?? data.NGAY_KY ?? data.DATE ?? data.NGAY_HOPDONG ?? data.CONTRACT_DATE ?? data.SIGN_DATE ?? data.NGAY_KY_HOP_DONG;
  
  if (rawDate !== undefined && rawDate !== null && String(rawDate).trim()) {
    const v = String(rawDate).trim();
    try {
      const date = new Date(v);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('vi-VN');
      }
    } catch {}
  }

  if (createdAt) {
    try {
      const date = new Date(createdAt);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('vi-VN');
      }
    } catch {}
  }

  return new Date().toLocaleDateString('vi-VN');
}

export function getContractNumberStandalone(data: Record<string, any>): string {
  if (!data) return '';

  const rawNumber = data.contractNumber ?? data.SO_HD ?? data.SO_HOP_DONG ?? data.MA_HD ?? data.SOHD ?? data.MAHD ?? data.CONTRACT_NUMBER;
  
  if (rawNumber !== undefined && rawNumber !== null && rawNumber !== '') {
    return String(rawNumber).trim();
  }

  return '';
}

export function getProjectNameStandalone(data: Record<string, any>): string {
  if (!data) return '';

  const rawProject = data.TEN_DU_AN ?? data.PROJECT_NAME ?? data.DU_AN ?? data.PROJECT ?? data.TEN_CONG_TRINH;
  
  if (rawProject !== undefined && rawProject !== null && rawProject !== '') {
    return String(rawProject).trim();
  }

  return '';
}

export function getContractNoteStandalone(data: Record<string, any>): string {
  if (!data) return '';

  const rawNote = data.NOTE ?? data.GHI_CHU ?? data.NOTES ?? data.GHICHU ?? data.DESCRIPTION;
  
  if (rawNote !== undefined && rawNote !== null && rawNote !== '') {
    return String(rawNote).trim();
  }

  return '';
}

export function parseValueStandalone(valStr: string): number {
  if (!valStr) return 0;
  const cleaned = String(valStr).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function formatCurrencyStandalone(val: number): string {
  return val.toLocaleString('vi-VN');
}

/**
 * Extract incoming number from document number
 * Example: "03/2024/HĐNV-HB" -> "03-2024"
 */
export function extractIncomingNumberFromDocNumber(docNumber: string): string {
  if (!docNumber) return '';
  
  // Try to find pattern like "DD/YYYY" or "DD/YYYY/..."
  const match = docNumber.match(/^(\d{1,2})\/(\d{4})/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  
  // Try pattern like "DD-MM-YYYY"
  const match2 = docNumber.match(/^(\d{1,2})-(\d{4})/);
  if (match2) {
    return `${match2[1]}-${match2[2]}`;
  }
  
  return '';
}

/**
 * Extract date from contract data (issue date / sign date)
 */
export function extractIssueDate(data: Record<string, any>): string {
  if (!data) return '';
  
  // Priority: issueDate > contractDate > effectiveDate > startDate
  const dateFields = ['issueDate', 'NGAY_PH', 'NGAY_BB', 'contractDate', 'NGAY_KY', 'NGAY_KY_HOP_DONG', 'effectiveDate', 'NGAY_HIEU_LUC', 'startDate', 'NGAY_BD'];
  
  for (const field of dateFields) {
    const rawDate = data[field];
    if (rawDate !== undefined && rawDate !== null && String(rawDate).trim()) {
      const v = String(rawDate).trim();
      try {
        const date = new Date(v);
        if (!isNaN(date.getTime())) {
          // Return YYYY-MM-DD for form input
          return date.toISOString().split('T')[0];
        }
      } catch {}
    }
  }
  
  return '';
}
