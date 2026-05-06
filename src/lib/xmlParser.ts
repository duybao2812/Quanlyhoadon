import { parseStringPromise } from 'xml2js';

export async function parseInvoiceXml(xmlString: string): Promise<any> {
  const result = await parseStringPromise(xmlString, { 
    explicitArray: false,
    tagNameProcessors: [(name) => name.replace(/^.*:/, '')] // Remove namespaces
  });
  
  // Helper to clean and parse numbers
  const parseInvoiceNumber = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    const cleanStr = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
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

  // 1. Get Main Blocks
  const nBan = findNode(result, ['NBan']) || {};
  const nMua = findNode(result, ['NMua']) || {};
  const tTChung = findNode(result, ['TTChung']) || {};
  const tToan = findNode(result, ['TToan', 'THTToan']) || {};
  
  // 2. Items extraction
  let itemsList: any[] = [];
  const dshhdvu = findNode(result, ['DSHHDVu', 'DSHHoa', 'ListData']);
  if (dshhdvu) {
    const hhdvu = findNode(dshhdvu, ['HHDVu', 'HHoa', 'Item']);
    if (hhdvu) {
      itemsList = Array.isArray(hhdvu) ? hhdvu : [hhdvu];
    }
  } else {
    const hhdvuNode = findNode(result, ['HHDVu', 'HHoa']);
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
      vatRate: 8 // default
    },
    items: itemsList.map((item: any) => ({
      description: item.THHDVu || item.Ten || item.TenHHoa || item.ItemName || "",
      unit: item.DVTinh || item.Unit || "",
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
