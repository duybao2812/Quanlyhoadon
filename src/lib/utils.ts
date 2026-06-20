import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const isElectron = (): boolean => {
  // Kiểm tra thông qua contextBridge đã cung cấp
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return true;
  }
  // Fallback kiểm tra qua userAgent
  return typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatVNNumber = (num: number | string | undefined) => {
  if (num === undefined || num === null || num === '') return '0';
  const n = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  if (isNaN(n)) return '0';
  return new Intl.NumberFormat('vi-VN').format(n);
};

export async function executeSecureExport(suggestedFileName: string, blobData: Blob, mimeType: string) {
  if ((window as any).showSaveFilePicker) {
    try {
      const ext = suggestedFileName.split('.').pop() || '';
      const options = {
        suggestedName: suggestedFileName,
        types: [{
          description: `${ext.toUpperCase()} File`,
          accept: { [mimeType]: [`.${ext}`] }
        }],
      };
      const handle = await (window as any).showSaveFilePicker(options);
      const writable = await handle.createWritable();
      await writable.write(blobData);
      await writable.close();
      console.log('Xuat va luu file thanh cong tai he thong.');
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Nguoi dung da chu dong huy lenh luu file.');
        return false;
      }
      console.error('Loi khi dung showSaveFilePicker, chuyen sang fallback:', err);
    }
  }

  const { saveAs } = await import('file-saver');
  saveAs(blobData, suggestedFileName);
  return true;
}

export const getTemplateBuffer = async (templateId: string): Promise<ArrayBuffer> => {
  try {
    let basePath = (import.meta as any).env?.BASE_URL || './';
    if (basePath === './') {
      const pathSegments = window.location.pathname.split('/');
      basePath = pathSegments.slice(0, -1).join('/') + '/';
    }

    if (!basePath.endsWith('/')) basePath += '/';
    const finalPath = `${basePath}templates/${templateId}.docx`.replace(/\/+/g, '/');

    console.log("Fetching template from:", finalPath);
    const res = await fetch(finalPath);
    if (!res.ok) throw new Error(`Template ${templateId} không tìm thấy trong hệ thống.`);
    return await res.arrayBuffer();
  } catch (error: any) {
    console.error("Error loading template buffer:", error);
    throw new Error(`Không thể tải mẫu [${templateId}]: ${error.message}`);
  }
};

export const mapInvoiceToSupabase = (updates: any) => {
  const extData = updates.extractedData;
  const mapped: any = {};
  if (updates.status !== undefined) mapped.status = updates.status;
  if (updates.fileName !== undefined) mapped.file_name = updates.fileName;
  if (updates.fileType !== undefined) mapped.file_type = updates.fileType;

  if (updates.fileURL !== undefined || updates.storagePath !== undefined) {
    // Store URLs inside extractedData
    const nextExtData = extData || {};
    if (updates.fileURL !== undefined) nextExtData.fileURL = updates.fileURL;
    if (updates.storagePath !== undefined) nextExtData.storagePath = updates.storagePath;
    mapped.extracted_data = nextExtData;
  }

  if (extData) {
    mapped.extracted_data = extData;
    mapped.line_items = extData.items || null;
    mapped.contract_number = extData.invoice?.contractNumber || extData.contractNumber || updates.contractNumber || null;
    mapped.contract_date = extData.invoice?.contractDate || extData.contractDate || updates.contractDate || null;
    mapped.seller_name = extData.seller?.name || updates.sellerName || null;
    mapped.buyer_name = extData.buyer?.name || updates.buyerName || null;
    mapped.seller_tax_code = extData.seller?.taxCode || updates.sellerTaxCode || null;
    mapped.buyer_tax_code = extData.buyer?.taxCode || updates.buyerTaxCode || null;
    mapped.category = extData.classification || updates.category || null;
    mapped.type = extData.invoice?.type || updates.type || null;
    mapped.note = extData.invoice?.note || extData.note || null;
    mapped.is_adjustment = extData.invoice?.isAdjustment || false;

    let totalAmt = extData.totals?.grandTotal || extData.totals?.total || extData.totals?.subtotal || updates.totalAmount || null;
    if (typeof totalAmt === 'string') {
      totalAmt = parseFloat(totalAmt.replace(/[^0-9.-]/g, '')) || null;
    }
    mapped.total_amount = totalAmt;
  } else {
    if (updates.contractNumber !== undefined) mapped.contract_number = updates.contractNumber;
    if (updates.contractDate !== undefined) mapped.contract_date = updates.contractDate;
    if (updates.sellerName !== undefined) mapped.seller_name = updates.sellerName;
    if (updates.buyerName !== undefined) mapped.buyer_name = updates.buyerName;
    if (updates.sellerTaxCode !== undefined) mapped.seller_tax_code = updates.sellerTaxCode;
    if (updates.buyerTaxCode !== undefined) mapped.buyer_tax_code = updates.buyerTaxCode;
    if (updates.category !== undefined) mapped.category = updates.category;
    if (updates.type !== undefined) mapped.type = updates.type;
    if (updates.totalAmount !== undefined) mapped.total_amount = updates.totalAmount;
  }
  return mapped;
};
