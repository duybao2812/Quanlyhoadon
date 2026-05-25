import { parseStringPromise } from 'xml2js';

export async function parseInvoiceXml(xmlString: string): Promise<any> {
  const result = await parseStringPromise(xmlString, { 
    explicitArray: false,
    tagNameProcessors: [(name) => name.replace(/^.*:/, '')] // Remove namespaces
  });
  
  // Helper to clean and parse numbers
  const parseInvoiceNumber = (val: any): number | null => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') return val;
    const s = String(val).trim();
    if (!s || s.match(/^[. ]+$/)) return null;
    const cleanStr = s.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
  };

  const cleanseFieldValue = (val: any): string => {
    if (!val) return "";
    const s = String(val).trim();
    if (s.match(/^[. ]+$/)) return "";
    return s;
  };

  // Deep search helper
  const deepSearch = (obj: any, targetKey: string): any => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj[targetKey] !== undefined) return obj[targetKey];
    
    for (const key in obj) {
      const res = deepSearch(obj[key], targetKey);
      if (res) return res;
    }
    return null;
  };

  const findNode = (obj: any, keys: string[]) => {
    for (const key of keys) {
      const found = deepSearch(obj, key);
      if (found !== null && found !== undefined) return found;
    }
    return null;
  };

  // 1. Get Main Blocks (Targeting the actual e-invoice block first to avoid envelope metadata matching)
  const dlhDon = findNode(result, ['DLHDon', 'HDon', 'Invoice']) || result;

  const nBan = findNode(dlhDon, ['NBan', 'Seller']) || {};
  const nMua = findNode(dlhDon, ['NMua', 'Buyer']) || {};
  const tTChung = findNode(dlhDon, ['TTChung']) || {};
  const tToan = findNode(dlhDon, ['TToan', 'THTToan', 'Payment']) || {};
  
  // 2. Items extraction (Searching within the invoice block)
  let itemsList: any[] = [];
  const dshhdvu = findNode(dlhDon, ['DSHHDVu', 'DSHHoa', 'ListData']);
  if (dshhdvu) {
    const hhdvu = findNode(dshhdvu, ['HHDVu', 'HHoa', 'Item']);
    if (hhdvu) {
      itemsList = Array.isArray(hhdvu) ? hhdvu : [hhdvu];
    }
  } else {
    const hhdvuNode = findNode(dlhDon, ['HHDVu', 'HHoa']);
    if (hhdvuNode) {
      itemsList = Array.isArray(hhdvuNode) ? hhdvuNode : [hhdvuNode];
    }
  }
  
  // 3. Map values
  return {
    seller: {
      name: nBan.Ten || nBan.SellerName || "",
      taxCode: nBan.MST || nBan.TaxCode || "",
      address: nBan.DChi || nBan.Address || "",
      accountNumber: nBan.STK || nBan.SoTK || nBan.AccountNumber || "",
      bankName: nBan.TNHang || nBan.TenNH || nBan.BankName || ""
    },
    buyer: {
      name: nMua.Ten || nMua.BuyerName || "",
      taxCode: nMua.MST || nMua.TaxCode || "",
      address: nMua.DChi || nMua.Address || "",
      accountNumber: nMua.STK || nMua.SoTK || nMua.AccountNumber || "",
      bankName: nMua.TNHang || nMua.TenNH || nMua.BankName || ""
    },
    invoice: {
      number: tTChung.SHDon || tTChung.InvoiceNo || "",
      serial: tTChung.KHHDon || tTChung.Series || "",
      date: tTChung.NLap || tTChung.InvoiceDate || "",
      vatRate: (() => {
        // Logic check: calculate rate from subtotal and vat amount
        const sub = parseInvoiceNumber(tToan.TgTCThue || tToan.subtotal || tToan.Subtotal || tToan.SubTotal) || 0;
        const vat = parseInvoiceNumber(tToan.TgTThue || tToan.vatAmount || tToan.VatAmount || tToan.VATAmount) || 0;
        const total = parseInvoiceNumber(tToan.TgTTTBSo || tToan.TgTTToan || tToan.grandTotal || tToan.GrandTotal || tToan.TotalAmountWithVAT) || (sub + vat);

        if (sub > 0) {
          // Use absolute difference to be safe, then divide by subtotal to get rate
          const calculatedVat = vat > 0 ? vat : Math.abs(total - sub);
          const calculatedRate = Math.round((calculatedVat / sub) * 100);
          return calculatedRate;
        }

        // Fallback to text search if math fails
        const vRateNode = findNode(tToan, ['TSuat', 'VATRate', 'ThueSuat', 'vatRate', 'vrate']);
        if (vRateNode) {
          const rateStr = String(vRateNode).replace(/[^0-9]/g, '');
          if (rateStr) return parseInt(rateStr);
        }

        return 8; // default
      })()
    },
    items: itemsList.map((item: any) => ({
      description: cleanseFieldValue(item.THHDVu || item.Ten || item.TenHHoa || item.ItemName),
      unit: cleanseFieldValue(item.DVTinh || item.Unit),
      quantity: parseInvoiceNumber(item.SLuong),
      unitPrice: parseInvoiceNumber(item.DGia),
      amount: parseInvoiceNumber(item.ThTien || item.ThanhTien || item.TotalAmount)
    })),
    totals: {
      subtotal: parseInvoiceNumber(tToan.TgTCThue || tToan.SubTotal),
      vatAmount: parseInvoiceNumber(tToan.TgTThue || tToan.VATAmount),
      grandTotal: parseInvoiceNumber(tToan.TgTTTBSo || tToan.TgTTToan || tToan.TotalAmountWithVAT),
      amountInWords: tToan.TgTTTBChu || tToan.AmountInWords || ""
    },
    classification: "BB_VT"
  };
}
