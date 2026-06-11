import { InvoiceItem } from '../../types/invoiceData';

// Extended type to support notes and attachments locally
export interface ExtendedInvoiceItem extends InvoiceItem {
  notes?: string;
  attachments?: Array<{
    name: string;
    url: string;
    size: string;
    type: 'pdf' | 'jpg' | 'xml' | 'png';
  }>;
  extractedData?: any;
  vatRate?: number;
}

export const sampleInvoices: ExtendedInvoiceItem[] = [
  {
    id: "inv-001",
    invoiceNumber: "0002134",
    invoiceSymbol: "AA/24P",
    companyName: "Công ty Cổ phần Thép Hòa Phát Hải Dương",
    taxCode: "0800723456",
    buyerName: "Tổng Công ty Sông Đà - CTCP",
    buyerTaxCode: "0100105678",
    address: "Tòa nhà Sông Đà, Phạm Hùng, Mỹ Đình, Nam Từ Liêm, Hà Nội",
    date: "2026-05-10T08:30:00Z",
    status: "paid",
    type: "PDF",
    classification: "BB_VT", // Vật tư
    total: 352000000,
    vat: 32000000,
    contractNumber: "HD-HP-SD/2026/01",
    contractDate: "2026-01-15",
    notes: "Đơn hàng thép xây dựng D10 và D16 phục vụ công trình Thủy điện Hòa Bình mở rộng. Đã đối chiếu số lượng thực tế tại kho công trường.",
    attachments: [
      { name: "HoaDonGoc_0002134.pdf", url: "#", size: "2.4 MB", type: "pdf" },
      { name: "PhieuCanThep_D10_D16.jpg", url: "#", size: "850 KB", type: "jpg" }
    ],
    items: [
      { id: "item-1-1", description: "Thép xây dựng Hòa Phát D10 (tấn)", unit: "Tấn", quantity: 15, price: 14500000, total: 217500000 },
      { id: "item-1-2", description: "Thép xây dựng Hòa Phát D16 (tấn)", unit: "Tấn", quantity: 7, price: 14642857, total: 102500000 }
    ]
  },
  {
    id: "inv-002",
    invoiceNumber: "0005412",
    invoiceSymbol: "AB/24P",
    companyName: "Công ty Cổ phần Xi măng Vicem Hoàng Thạch",
    taxCode: "0800109988",
    buyerName: "Công ty TNHH Đầu tư & Xây dựng Trường An",
    buyerTaxCode: "0100782345",
    address: "Số 123 Đường Láng, Đống Đa, Hà Nội",
    date: "2026-05-12T10:15:00Z",
    status: "paid",
    type: "XML",
    classification: "BB_VT", // Vật tư
    total: 198000000,
    vat: 18000000,
    contractNumber: "HD-XMHT-TA/2026/04",
    contractDate: "2026-03-01",
    notes: "Cung cấp xi măng PCB40 Hoàng Thạch đợt 2 cho dự án chung cư cao cấp Trường An Plaza. Đã kiểm tra chứng chỉ chất lượng đi kèm.",
    attachments: [
      { name: "Vicem_XML_0005412.xml", url: "#", size: "45 KB", type: "xml" },
      { name: "ChungChiChatLuong_HoangThach.pdf", url: "#", size: "1.2 MB", type: "pdf" }
    ],
    items: [
      { id: "item-2-1", description: "Xi măng Vicem Hoàng Thạch PCB40 (tấn)", unit: "Tấn", quantity: 120, price: 1500000, total: 180000000 }
    ]
  },
  {
    id: "inv-003",
    invoiceNumber: "0001095",
    invoiceSymbol: "TC/24E",
    companyName: "Công ty TNHH Cơ khí & Xây dựng Bách Khoa",
    taxCode: "0312345678",
    buyerName: "Công ty Cổ phần Phát triển Đô thị HUD",
    buyerTaxCode: "0100234987",
    address: "Khu đô thị mới Linh Đàm, Hoàng Mai, Hà Nội",
    date: "2026-05-14T14:20:00Z",
    status: "paid",
    type: "PDF",
    classification: "BB_TC", // Thi công
    total: 528000000,
    vat: 48000000,
    contractNumber: "HDTC-BK-HUD/02-2026",
    contractDate: "2026-02-10",
    notes: "Nghiệm thu thanh toán đợt 1 phần thô móng tòa CT2. Công trình hoàn thành đúng tiến độ cam kết và được tư vấn giám sát ký xác nhận.",
    attachments: [
      { name: "BienBanNghiemThuTho_CT2.pdf", url: "#", size: "3.8 MB", type: "pdf" },
      { name: "PhuLucKhoiLuong_Dot1.pdf", url: "#", size: "1.7 MB", type: "pdf" }
    ],
    items: [
      { id: "item-3-1", description: "Thi công bê tông cốt thép đài móng CT2", unit: "m3", quantity: 350, price: 1100000, total: 385000000 },
      { id: "item-3-2", description: "Đào đất móng hố cột và gia cố cừ tràm", unit: "Gói", quantity: 1, price: 95000000, total: 95000000 }
    ]
  },
  {
    id: "inv-004",
    invoiceNumber: "0000987",
    invoiceSymbol: "CM/26T",
    companyName: "Công ty Cổ phần Thiết bị & Cho thuê Máy xây dựng miền Bắc",
    taxCode: "0108976543",
    buyerName: "Công ty TNHH Xây dựng và Thương mại Hoàng Long",
    buyerTaxCode: "0100456213",
    address: "Số 45 Trần Duy Hưng, Cầu Giấy, Hà Nội",
    date: "2026-05-15T09:00:00Z",
    status: "pending",
    type: "PDF",
    classification: "BB_CM", // Ca máy
    total: 105600000,
    vat: 9600000,
    contractNumber: "HD-CM-HL-05",
    contractDate: "2026-04-20",
    notes: "Hóa đơn thuê máy xúc và xe lu rung trong tháng 4 năm 2026 tại công trường quốc lộ 1A mở rộng. Có nhật ký ca máy đính kèm chi tiết số giờ hoạt động.",
    attachments: [
      { name: "NhatKyCaMay_T4_2026.pdf", url: "#", size: "2.1 MB", type: "pdf" }
    ],
    items: [
      { id: "item-4-1", description: "Thuê máy xúc bánh xích Komatsu PC200 (giờ)", unit: "Giờ", quantity: 120, price: 500000, total: 60000000 },
      { id: "item-4-2", description: "Thuê xe lu rung Hamm 3411 (ca)", unit: "Ca", quantity: 12, price: 3000000, total: 36000000 }
    ]
  },
  {
    id: "inv-005",
    invoiceNumber: "0008761",
    invoiceSymbol: "VT/26E",
    companyName: "Công ty Cổ phần Nhựa Thiếu niên Tiền Phong",
    taxCode: "0200156987",
    buyerName: "Công ty TNHH Đầu tư & Phát triển Hạ tầng Đô thị IDICO",
    buyerTaxCode: "0302456981",
    address: "151 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh",
    date: "2026-05-16T11:45:00Z",
    status: "paid",
    type: "XML",
    classification: "BB_VT", // Vật tư
    total: 82500000,
    vat: 7500000,
    contractNumber: "HD-NTP-IDICO/26",
    contractDate: "2026-03-15",
    notes: "Cung cấp ống nhựa uPVC và phụ kiện phục vụ mạng lưới cấp thoát nước phân khu A. Chiết khấu thương mại 15% đã được khấu trừ trực tiếp vào giá bán.",
    attachments: [
      { name: "TienPhong_Invoice_0008761.xml", url: "#", size: "52 KB", type: "xml" }
    ],
    items: [
      { id: "item-5-1", description: "Ống nhựa uPVC Class 2 D110 (mét)", unit: "Mét", quantity: 500, price: 95000, total: 47500000 },
      { id: "item-5-2", description: "Ống nhựa uPVC Class 2 D160 (mét)", unit: "Mét", quantity: 150, price: 183333, total: 27500000 }
    ]
  },
  {
    id: "inv-006",
    invoiceNumber: "0003429",
    invoiceSymbol: "AA/26P",
    companyName: "Tổng Công ty Hóa chất và Thiết bị Mỏ (VIMCC)",
    taxCode: "0100109999",
    buyerName: "Tổng Công ty Sông Đà - CTCP",
    buyerTaxCode: "0100105678",
    address: "Tòa nhà Sông Đà, Phạm Hùng, Mỹ Đình, Nam Từ Liêm, Hà Nội",
    date: "2026-05-17T15:30:00Z",
    status: "paid",
    type: "PDF",
    classification: "BB_VT", // Vật tư
    total: 132000000,
    vat: 12000000,
    contractNumber: "HD-VIMCC-SD/09",
    contractDate: "2026-02-18",
    notes: "Vật liệu nổ và kíp nổ phục vụ công tác nổ mìn phá đá nền đường cao tốc đoạn qua đèo dốc. Bảo quản tại kho chuyên dụng theo tiêu chuẩn ngành.",
    attachments: [
      { name: "GiayPhepSuDungVatLieuNo.pdf", url: "#", size: "1.5 MB", type: "pdf" }
    ],
    items: [
      { id: "item-6-1", description: "Thuốc nổ ANFO (kg)", unit: "Kg", quantity: 3000, price: 30000, total: 90000000 },
      { id: "item-6-2", description: "Kíp nổ điện vi sai phi từ (cái)", unit: "Cái", quantity: 1000, price: 30000, total: 30000000 }
    ]
  },
  {
    id: "inv-007",
    invoiceNumber: "0006712",
    invoiceSymbol: "TC/26P",
    companyName: "Công ty Cổ phần Đầu tư Xây dựng & Kỹ thuật Minh An",
    taxCode: "0107234999",
    buyerName: "Công ty Cổ phần Đô thị FPT Đà Nẵng",
    buyerTaxCode: "0401398721",
    address: "Khu đô thị công nghệ FPT Đà Nẵng, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng",
    date: "2026-05-18T16:00:00Z",
    status: "pending",
    type: "PDF",
    classification: "BB_TC", // Thi công
    total: 1100000000,
    vat: 100000000,
    contractNumber: "HDTC-MA-FPT/05",
    contractDate: "2026-01-20",
    notes: "Hóa đơn nghiệm thu giai đoạn hoàn thiện sơn bã, lắp đặt trần thạch cao tòa nhà văn phòng F-Complex 3. Sơn Dulux Professional 5-in-1 chính hãng.",
    attachments: [
      { name: "BB_NghiemThuHoanThien.pdf", url: "#", size: "4.1 MB", type: "pdf" },
      { name: "BaoCaoKiểmDinhMoiTruong.pdf", url: "#", size: "950 KB", type: "pdf" }
    ],
    items: [
      { id: "item-7-1", description: "Bả ma tít và sơn nước Dulux 2 lớp ngoài nhà (m2)", unit: "m2", quantity: 5000, price: 120000, total: 600000000 },
      { id: "item-7-2", description: "Thi công trần thạch cao khung xương chìm Vĩnh Tường", unit: "m2", quantity: 2000, price: 200000, total: 400000000 }
    ]
  },
  {
    id: "inv-008",
    invoiceNumber: "0001248",
    invoiceSymbol: "CM/26E",
    companyName: "Công ty TNHH Vận tải & Xây dựng Cơ giới Trường Phát",
    taxCode: "0309876541",
    buyerName: "Công ty Cổ phần Cảng Sài Gòn",
    buyerTaxCode: "0300487569",
    address: "3 Nguyễn Tất Thành, Phường 12, Quận 4, TP. Hồ Chí Minh",
    date: "2026-05-19T09:30:00Z",
    status: "paid",
    type: "XML",
    classification: "BB_CM", // Ca máy
    total: 145200000,
    vat: 13200000,
    contractNumber: "HDCM-TP-CSG/2026",
    contractDate: "2026-03-10",
    notes: "Dịch vụ thuê cẩu xích Kato 150 tấn phục vụ bốc xếp dầm thép siêu trường siêu trọng tại cảng cạn Nhà Bè. Phí đã bao gồm tài xế phụ trách kỹ thuật cao.",
    attachments: [
      { name: "Invoice_TrườngPhát_0001248.xml", url: "#", size: "49 KB", type: "xml" }
    ],
    items: [
      { id: "item-8-1", description: "Thuê cần cẩu bánh xích Kato 150T (ca làm việc)", unit: "Ca", quantity: 11, price: 12000000, total: 132000000 }
    ]
  },
  {
    id: "inv-009",
    invoiceNumber: "0009852",
    invoiceSymbol: "VT/26P",
    companyName: "Công ty Cổ phần Cáp điện CADIVI Việt Nam",
    taxCode: "0300381564",
    buyerName: "Công ty Cổ phần Xây dựng và Cơ điện REE",
    buyerTaxCode: "0300741258",
    address: "364 Cộng Hòa, Phường 13, Tân Bình, TP. Hồ Chí Minh",
    date: "2026-05-20T11:00:00Z",
    status: "paid",
    type: "PDF",
    classification: "BB_VT", // Vật tư
    total: 264000000,
    vat: 24000000,
    contractNumber: "HDB-CADIVI-REE/26",
    contractDate: "2026-04-05",
    notes: "Cung cấp cáp đồng trần chống sét, cáp chống cháy CXV/FR phục vụ hệ thống cơ điện tòa nhà Etown 6. Tiêu chuẩn chống cháy nổ IEC đầy đủ.",
    attachments: [
      { name: "CADIVI_0009852_Signed.pdf", url: "#", size: "2.8 MB", type: "pdf" },
      { name: "ChungChiXuatXu_Co.pdf", url: "#", size: "1.9 MB", type: "pdf" }
    ],
    items: [
      { id: "item-9-1", description: "Cáp chống cháy CADIVI CXV/FR 4x16mm2 (mét)", unit: "Mét", quantity: 1500, price: 120000, total: 180000000 },
      { id: "item-9-2", description: "Cáp đồng trần chống sét CADIVI C50 (mét)", unit: "Mét", quantity: 1200, price: 50000, total: 60000000 }
    ]
  },
  {
    id: "inv-010",
    invoiceNumber: "0004561",
    invoiceSymbol: "TC/26E",
    companyName: "Công ty Cổ phần Dịch vụ Kỹ thuật & Môi trường Đô thị Hà Nội",
    taxCode: "0100104562",
    buyerName: "Công ty Cổ phần Vingroup - CTCP",
    buyerTaxCode: "0101245638",
    address: "Số 7 Đường Bằng Lăng 1, Vinhomes Riverside, Long Biên, Hà Nội",
    date: "2026-05-21T14:00:00Z",
    status: "draft",
    type: "XML",
    classification: "BB_TC", // Thi công
    total: 308000000,
    vat: 28000000,
    contractNumber: "HD-VINGROUP-MT/09-2026",
    contractDate: "2026-04-18",
    notes: "Nghiệm thu gói thầu san lấp mặt bằng và trồng cây xanh cảnh quan đợt 3 tại dự án Vinhomes Ocean Park 3. Đang chờ kế toán kiểm duyệt thanh toán phần giữ lại 5%.",
    attachments: [
      { name: "XML_0004561_Vinhomes.xml", url: "#", size: "38 KB", type: "xml" }
    ],
    items: [
      { id: "item-10-1", description: "San lấp bù bùn bằng cát đen sông Hồng (m3)", unit: "m3", quantity: 2000, price: 100000, total: 200000000 },
      { id: "item-10-2", description: "Trồng thảm cỏ nhung Nhật và cây chà là cảnh quan", unit: "Gói", quantity: 1, price: 80000000, total: 80000000 }
    ]
  }
];
