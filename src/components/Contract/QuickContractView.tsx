import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  PenTool,
  Check,
  ChevronRight,
  ChevronLeft,
  FileText,
  ShieldCheck,
  HelpCircle,
  RefreshCw,
  Edit3,
  Save,
  CheckSquare,
  Square,
  Sparkles,
  Download,
  AlertCircle,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  FileSpreadsheet,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useToast } from '../Notifications';
import type { Partner } from '../../types/appTypes';
import type { User } from 'firebase/auth';

interface QuickContractViewProps {
  partners?: Partner[];
  user?: User | null;
  onBack?: () => void;
}

// Bên B mặc định (Huỳnh Bảo) nếu không có danh sách đối tác
const DEFAULT_PARTY_B = {
  name: 'CÔNG TY TNHH XÂY DỰNG HUỲNH BẢO',
  representative: 'HUỲNH LÂM DUY BẢO',
  position: 'Giám đốc',
  address: '123 Đường Số 4, Phường Linh Tây, TP. Thủ Đức, TP. HCM',
  taxCode: '0317828847',
  accountNumber: '62530338',
  bankName: 'ACB - Ngân hàng Á Châu'
};

const getContractTemplate = (partyA: any, partyB: any) => {
  return `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
------------------

HỢP ĐỒNG DỊCH VỤ THƯƠNG MẠI
Số: ${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}/HĐDV-HB

- Căn cứ Bộ luật Dân sự nước Cộng hòa Xã hội Chủ nghĩa Việt Nam số 91/2015/QH13 ngày 24/11/2015;
- Căn cứ Luật Thương mại nước Cộng hòa Xã hội Chủ nghĩa Việt Nam số 36/2005/QH11 ngày 14/06/2005;
- Căn cứ vào nhu cầu và năng lực của hai Bên.

Hôm nay, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}, tại văn phòng đại diện, chúng tôi gồm có:

BÊN A (KHÁCH HÀNG):
- Họ và tên: ${partyA.fullName || '................................................'}
- Số CCCD: ${partyA.cccd || '........................................'}
- Ngày cấp: ${partyA.cccdDate || '........................'} - Nơi cấp: ${partyA.cccdPlace || '........................................'}
- Địa chỉ: ${partyA.address || '................................................'}
- Điện thoại: ${partyA.phone || '........................'}
- Email: ${partyA.email || '........................................'}

BÊN B (ĐỐI TÁC):
- Tên tổ chức: ${partyB.name}
- Người đại diện: ${partyB.representative} - Chức vụ: ${partyB.position}
- Địa chỉ: ${partyB.address}
- Mã số thuế: ${partyB.taxCode}
- Số tài khoản: ${partyB.accountNumber} tại Ngân hàng ${partyB.bankName}

Sau khi thảo luận, hai Bên đồng ý ký kết Hợp đồng dịch vụ thương mại với các điều khoản cụ thể sau đây:

ĐIỀU 1: NỘI DUNG DỊCH VỤ
Bên B đồng ý cung cấp cho Bên A các gói giải pháp số hóa hóa đơn, hỗ trợ quản lý hồ sơ và tích hợp tự động đối soát thông tin giao dịch từ Gmail thông qua công nghệ trí tuệ nhân tạo (AI).

ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN
1. Giá trị dịch vụ sẽ được tính dựa trên gói đăng ký hàng tháng hoặc chi phí sử dụng thực tế được hai bên thỏa thuận.
2. Phương thức thanh toán: Chuyển khoản qua số tài khoản của Bên B được nêu ở trên. Hạn thanh toán trong vòng 05 ngày kể từ ngày xuất hóa đơn.

ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A
1. Cung cấp đầy đủ thông tin, dữ liệu hóa đơn cần xử lý cho Bên B.
2. Thanh toán đầy đủ và đúng hạn chi phí dịch vụ theo quy định tại Điều 2.
3. Hưởng đầy đủ các chính sách bảo mật, hỗ trợ kỹ thuật từ Bên B.

ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B
1. Cung cấp dịch vụ ổn định, chính xác thông qua hệ thống AI và các API kết nối.
2. Cam kết bảo mật tuyệt đối thông tin dữ liệu hóa đơn, thông tin đối tác của Bên A.
3. Có quyền tạm ngừng cung cấp dịch vụ nếu Bên A vi phạm điều khoản thanh toán.

ĐIỀU 5: ĐIỀU KHOẢN CHUNG
Hợp đồng này có hiệu lực kể từ ngày ký. Hai bên cam kết thực hiện đúng các điều khoản đã thỏa thuận. Mọi tranh chấp phát sinh sẽ được giải quyết thông qua thương lượng, hòa giải.

Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để thực hiện.

                    ĐẠI DIỆN BÊN A                                         ĐẠI DIỆN BÊN B
                 (Ký và ghi rõ họ tên)                                  (Ký và ghi rõ họ tên)`;
};

export function QuickContractView({ partners = [], user = null, onBack }: QuickContractViewProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<number>(1);
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [hasAgreed, setHasAgreed] = useState<boolean>(false);
  const [isSigned, setIsSigned] = useState<boolean>(false);
  const [isSigningProgress, setIsSigningProgress] = useState<boolean>(false);

  // Thêm liên kết Google Fonts chữ ký nghệ thuật khi mount
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Playball&family=Mrs+Saint+Delafield&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Thông tin Bên A
  const [partyA, setPartyA] = useState({
    fullName: user?.displayName || '',
    cccd: '',
    cccdDate: '',
    cccdPlace: '',
    address: '',
    phone: '',
    email: user?.email || ''
  });

  // Xác thực Form Bên A
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Chọn đối tác Bên B
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('default');
  
  const partyB = useMemo(() => {
    if (selectedPartnerId === 'default') {
      return DEFAULT_PARTY_B;
    }
    const partner = partners.find(p => p.id === selectedPartnerId);
    if (!partner) return DEFAULT_PARTY_B;
    return {
      name: partner.name,
      representative: partner.representative || 'Chưa cập nhật',
      position: partner.position || 'Đại diện',
      address: partner.address || 'Chưa cập nhật',
      taxCode: partner.taxCode,
      accountNumber: partner.accountNumber || 'Chưa cập nhật',
      bankName: partner.bankName || 'Chưa cập nhật'
    };
  }, [selectedPartnerId, partners]);

  // Nội dung hợp đồng đã chỉnh sửa
  const [contractText, setContractText] = useState<string>('');

  // Đồng bộ nội dung khi chuyển bước
  useEffect(() => {
    if (step === 2 && !contractText) {
      setContractText(getContractTemplate(partyA, partyB));
    }
  }, [step, partyA, partyB, contractText]);

  // Thông tin ký tên
  const [signerName, setSignerName] = useState<string>('');
  const [signatureType, setSignatureType] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState<string>('');
  const [selectedCursiveFont, setSelectedCursiveFont] = useState<string>('font-cursive-dancing');
  const [drawnSignatureData, setDrawnSignatureData] = useState<string | null>(null);

  // Tham chiếu Canvas vẽ chữ ký
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Ghi nhận họ tên người ký tự động từ Bên A
  useEffect(() => {
    if (partyA.fullName && !signerName) {
      setSignerName(partyA.fullName);
      setTypedSignature(partyA.fullName);
    }
  }, [partyA.fullName, signerName]);

  // Khởi tạo Canvas sắc nét
  useEffect(() => {
    if (step === 3 && signatureType === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Tối ưu hóa chất lượng vẽ trên màn hình Retina
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#2563eb'; // Màu xanh dương chuyên nghiệp
        
        // Vẽ nét cũ nếu có
        if (drawnSignatureData) {
          const img = new Image();
          img.src = drawnSignatureData;
          img.onload = () => {
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
          };
        }
      }
    }
  }, [step, signatureType, drawnSignatureData]);

  // Logic vẽ Canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      // Lưu lại nét vẽ vào state
      if (canvasRef.current) {
        setDrawnSignatureData(canvasRef.current.toDataURL());
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawnSignatureData(null);
  };

  // Validate form bước 1
  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!partyA.fullName.trim()) errors.fullName = 'Vui lòng nhập Họ và tên.';
    if (!partyA.cccd.trim()) errors.cccd = 'Vui lòng nhập số CCCD.';
    if (!partyA.cccdDate) errors.cccdDate = 'Vui lòng chọn ngày cấp.';
    if (!partyA.cccdPlace.trim()) errors.cccdPlace = 'Vui lòng nhập nơi cấp.';
    if (!partyA.address.trim()) errors.address = 'Vui lòng nhập địa chỉ.';
    
    // Validate điện thoại
    if (!partyA.phone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại.';
    } else if (!/^[0-9+]{9,12}$/.test(partyA.phone.trim())) {
      errors.phone = 'Số điện thoại không hợp lệ.';
    }
    
    // Validate email
    if (!partyA.email.trim()) {
      errors.email = 'Vui lòng nhập email.';
    } else if (!/\S+@\S+\.\S+/.test(partyA.email.trim())) {
      errors.email = 'Email không hợp lệ.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Xử lý chuyển tiếp
  const handleContinue = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      } else {
        toast('Vui lòng điền đầy đủ các trường thông tin bắt buộc (*)', 'error');
      }
    } else if (step === 2) {
      if (isEditing) {
        toast('Vui lòng lưu thay đổi trước khi tiếp tục.', 'info');
      } else {
        setStep(3);
      }
    } else if (step === 3) {
      if (!hasAgreed) {
        toast('Vui lòng xác nhận đồng ý với các điều khoản của hợp đồng.', 'info');
        return;
      }
      
      if (signatureType === 'draw' && !drawnSignatureData) {
        toast('Vui lòng vẽ chữ ký của bạn lên khung ký.', 'info');
        return;
      }

      if (signatureType === 'type' && !typedSignature.trim()) {
        toast('Vui lòng nhập tên cho chữ ký viết tay.', 'info');
        return;
      }

      // Khởi chạy tiến trình ký hợp đồng điện tử giả lập
      setIsSigningProgress(true);
      setTimeout(() => {
        setIsSigningProgress(false);
        setIsSigned(true);
        toast('Ký hợp đồng điện tử thành công!', 'success');
      }, 2000);
    }
  };

  const handleAutoFill = () => {
    setPartyA({
      fullName: 'NGUYỄN VĂN HUỲNH ANH',
      cccd: '079096012345',
      cccdDate: '2022-09-15',
      cccdPlace: 'Cục Cảnh sát Quản lý hành chính về trật tự xã hội',
      address: '456 Đường CMT8, Phường 15, Quận 10, TP. Hồ Chí Minh',
      phone: '0987654321',
      email: user?.email || 'nguyenvananhtest@gmail.com'
    });
    setSignerName('NGUYỄN VĂN HUỲNH ANH');
    setTypedSignature('NGUYỄN VĂN HUỲNH ANH');
    setFormErrors({});
    toast('Đã tự động điền thông tin Bên A mẫu để test!', 'success');
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const handleDownloadPDF = () => {
    // Tạo một cửa sổ in mới
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast('Không thể mở cửa sổ in. Vui lòng tắt trình chặn popup.', 'error');
      return;
    }

    // Lấy ảnh chữ ký vẽ hoặc viết tay của Bên A
    const signatureHtml = signatureType === 'draw' && drawnSignatureData
      ? `<img src="${drawnSignatureData}" style="max-height: 80px; display: block; margin: 10px auto;" alt="Chữ ký Bên A" />`
      : `<span style="font-family: ${selectedCursiveFont === 'font-cursive-dancing' ? 'Dancing Script' : selectedCursiveFont === 'font-cursive-vibes' ? 'Great Vibes' : selectedCursiveFont === 'font-cursive-playball' ? 'Playball' : 'Mrs Saint Delafield'}, cursive; font-size: 28px; color: #1e3a8a; display: block; padding: 10px 0; text-align: center;">${typedSignature}</span>`;

    // Chữ ký đại diện Bên B (Huỳnh Bảo)
    const signatureBHtml = `<span style="font-family: 'Great Vibes', cursive; font-size: 28px; color: #1e3a8a; display: block; padding: 10px 0; text-align: center;">${partyB.representative}</span>`;

    // Chuẩn bị nội dung in
    let formattedTextForPrint = contractText;
    
    // Cắt bỏ phần chữ ký text mặc định ở cuối để thay thế bằng bảng chữ ký thực tế
    const signAreaIndex = formattedTextForPrint.indexOf('ĐẠI DIỆN BÊN A');
    if (signAreaIndex !== -1) {
      formattedTextForPrint = formattedTextForPrint.substring(0, signAreaIndex);
    }

    // Tách phần Quốc hiệu & Tiêu ngữ để căn giữa theo đúng thể thức Nghị định 30/2020/NĐ-CP
    let headerHtml = '';
    let bodyText = formattedTextForPrint;

    const mottoIndex = bodyText.indexOf('Độc lập - Tự do - Hạnh phúc');
    const numberIndex = bodyText.indexOf('Số: ');
    
    if (mottoIndex !== -1 && numberIndex !== -1) {
      const numberLineEnd = bodyText.indexOf('\n', numberIndex);
      const numberLine = bodyText.substring(numberIndex, numberLineEnd !== -1 ? numberLineEnd : numberIndex + 30).trim();
      
      headerHtml = `
        <table style="width: 100%; border: none; margin-bottom: 25px; font-family: 'Times New Roman', Times, serif; border-collapse: collapse;">
          <tr>
            <td style="width: 45%; text-align: center; vertical-align: top; border: none; padding: 0; font-size: 13px; font-family: 'Times New Roman', Times, serif;">
              <div style="font-weight: bold; text-transform: uppercase;">CÔNG TY TNHH XÂY DỰNG</div>
              <div style="font-weight: bold; text-transform: uppercase;">HUỲNH BẢO</div>
              <div style="margin: 3px auto 0 auto; border-bottom: 1px solid #111; width: 80px;"></div>
            </td>
            <td style="width: 10%; border: none; padding: 0;"></td>
            <td style="width: 45%; text-align: center; vertical-align: top; border: none; padding: 0; font-size: 13px; font-family: 'Times New Roman', Times, serif;">
              <div style="font-weight: bold; text-transform: uppercase; letter-spacing: 0.2px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div style="font-weight: bold; margin-top: 3px; font-size: 13.5px;">Độc lập - Tự do - Hạnh phúc</div>
              <div style="margin: 3px auto 0 auto; border-bottom: 1.5px solid #111; width: 130px;"></div>
            </td>
          </tr>
        </table>
        
        <div style="text-align: center; font-family: 'Times New Roman', Times, serif; margin-top: 35px; margin-bottom: 30px;">
          <div style="font-weight: bold; text-transform: uppercase; font-size: 16px; letter-spacing: 0.5px;">HỢP ĐỒNG DỊCH VỤ THƯƠNG MẠI</div>
          <div style="font-style: italic; font-size: 13px; margin-top: 4px;">${numberLine}</div>
        </div>
      `;

      // Cắt bỏ phần tiêu đề text gốc
      const cutOffset = numberLineEnd !== -1 ? numberLineEnd : numberIndex + 30;
      bodyText = bodyText.substring(cutOffset).trim();
    } else {
      headerHtml = `
        <div style="text-align: center; font-family: 'Times New Roman', Times, serif; margin-bottom: 30px;">
          <div style="font-weight: bold; text-transform: uppercase; font-size: 13px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div style="font-weight: bold; margin-top: 3px;">Độc lập - Tự do - Hạnh phúc</div>
          <div style="margin: 5px auto 0 auto; border-bottom: 1.5px solid #111; width: 140px;"></div>
          
          <div style="font-weight: bold; text-transform: uppercase; font-size: 15px; margin-top: 30px;">HỢP ĐỒNG DỊCH VỤ THƯƠNG MẠI</div>
        </div>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Hop_dong_ky_so_${partyA.fullName.replace(/\s+/g, '_')}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Playball&family=Mrs+Saint+Delafield&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4;
              margin: 20mm 15mm 20mm 25mm;
            }
            body {
              font-family: 'Times New Roman', Times, FreeSerif, serif;
              color: #111;
              line-height: 1.5;
              padding: 0;
              margin: 0;
              background: #fff;
            }
            .contract-content {
              white-space: pre-wrap;
              font-size: 14px;
              text-align: justify;
            }
            .sig-title {
              font-weight: bold;
              font-size: 13px;
              margin-bottom: 3px;
            }
            .sig-desc {
              font-style: italic;
              font-size: 11px;
              color: #444;
              margin-bottom: 8px;
            }
            .verified-badge {
              font-size: 8px;
              background: #10b981;
              color: white;
              padding: 2px 5px;
              border-radius: 3px;
            }
            .certificate-box {
              margin-top: 40px;
              border: 1.5px solid #10b981;
              border-radius: 8px;
              padding: 15px;
              background-color: #f0fdf4;
              font-size: 11px;
              color: #1e293b;
              page-break-inside: avoid;
              font-family: Arial, sans-serif;
            }
            .cert-title {
              font-weight: bold;
              text-transform: uppercase;
              color: #047857;
              border-bottom: 1px solid #a7f3d0;
              padding-bottom: 5px;
              margin-bottom: 8px;
            }
          </style>
        </head>
        <body>
          ${headerHtml}
          
          <div class="contract-content">${bodyText}</div>
          
          <table style="width: 100%; border: none; margin-top: 45px; page-break-inside: avoid; border-collapse: collapse;">
            <tr>
              <td style="width: 48%; text-align: center; vertical-align: top; border: none; padding: 0;">
                <div class="sig-title">ĐẠI DIỆN BÊN A (KHÁCH HÀNG)</div>
                <div class="sig-desc">(Ký và ghi rõ họ tên)</div>
                <div style="height: 120px; display: flex; align-items: center; justify-content: center; border: 1px dashed #bbb; border-radius: 8px; background: #fafafa; padding: 10px; position: relative; margin: 0 auto; max-width: 280px; box-sizing: border-box;">
                  ${signatureHtml}
                  <div class="verified-badge" style="position: absolute; bottom: 4px; right: 4px;">Ký số hợp lệ</div>
                </div>
                <div style="margin-top: 10px; font-weight: bold; font-size: 13px; text-transform: uppercase;">${signerName}</div>
              </td>
              <td style="width: 4%; border: none; padding: 0;"></td>
              <td style="width: 48%; text-align: center; vertical-align: top; border: none; padding: 0;">
                <div class="sig-title">ĐẠI DIỆN BÊN B (ĐỐI TÁC)</div>
                <div class="sig-desc">(Ký và ghi rõ họ tên)</div>
                <div style="height: 120px; display: flex; align-items: center; justify-content: center; border: 1px dashed #bbb; border-radius: 8px; background: #fafafa; padding: 10px; position: relative; margin: 0 auto; max-width: 280px; box-sizing: border-box;">
                  ${signatureBHtml}
                  <div class="verified-badge" style="position: absolute; bottom: 4px; right: 4px;">Ký số hợp lệ</div>
                </div>
                <div style="margin-top: 10px; font-weight: bold; font-size: 13px; text-transform: uppercase;">${partyB.representative}</div>
              </td>
            </tr>
          </table>

          <div class="certificate-box">
            <div class="cert-title">✓ CHỨNG THƯ XÁC THỰC KÝ SỐ ĐIỆN TỬ</div>
            <div style="margin-bottom: 4px;"><strong>Mã băm hợp đồng (SHA-256):</strong> ${mockCertificate.contractHash}</div>
            <div style="margin-bottom: 4px;"><strong>Thời gian hoàn thành ký:</strong> ${mockCertificate.signingTime}</div>
            <div style="margin-bottom: 4px;"><strong>Địa chỉ IP người ký:</strong> ${mockCertificate.ipAddress}</div>
            <div><strong>Chứng nhận bởi:</strong> ${mockCertificate.authority}</div>
            <div style="margin-top: 8px; font-style: italic; color: #047857; font-weight: bold;">Hợp đồng điện tử đã được xác thực mã hóa bảo mật và có giá trị pháp lý tương đương bản in giấy truyền thống theo Luật Giao dịch điện tử.</div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Mock Chứng chỉ ký số
  const mockCertificate = useMemo(() => {
    return {
      contractHash: 'SHA256: 8f4c28b5e963b65a507f1d4f20e98031a54b9d0b67484df2413fe9a8031d2b8b',
      signingTime: new Date().toLocaleString('vi-VN'),
      ipAddress: '100.115.210.109',
      browser: navigator.userAgent.split(' ')[0],
      status: 'VERIFIED (HỢP LỆ)',
      authority: 'SMARTINVOICE CONTRACT AUTHORITY (CA)'
    };
  }, [isSigned]);

  // Cấu hình phông chữ chữ ký viết tay
  const cursiveFonts = [
    { id: 'font-cursive-dancing', name: 'Dancing Script', className: "font-['Dancing_Script'] font-bold" },
    { id: 'font-cursive-vibes', name: 'Great Vibes', className: "font-['Great_Vibes']" },
    { id: 'font-cursive-playball', name: 'Playball', className: "font-['Playball']" },
    { id: 'font-cursive-saint', name: 'Saint Delafield', className: "font-['Mrs_Saint_Delafield'] text-4xl" }
  ];

  return (
    <div className="flex flex-col h-full w-full p-4 space-y-4 max-w-6xl mx-auto overflow-hidden text-foreground">
      {/* HEADER */}
      <div className="flex items-center justify-between shrink-0 bg-card-dark/20 border border-border-dark/60 p-4 rounded-2xl backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.1)]">
            <PenTool size={20} />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              Ký Hợp Đồng Điện Tử 
              <span className="text-[9px] uppercase px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black rounded-full">Tính năng nhanh</span>
            </h1>
            <p className="text-[10px] md:text-xs text-text-dim mt-0.5">Xác nhận thông tin, xem trước hợp đồng và ký số tức thì</p>
          </div>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="px-3.5 py-1.5 bg-white/5 border border-border-dark text-text-dim hover:text-white rounded-xl text-xs font-bold transition-all hover:bg-white/10"
          >
            Quay lại chi tiết
          </button>
        )}
      </div>

      {!isSigned ? (
        <>
          {/* STEPPER PROGRESS */}
          <div className="shrink-0 bg-card-dark/30 border border-border-dark/60 px-6 py-4 rounded-2xl">
            <div className="flex items-center justify-between max-w-3xl mx-auto relative">
              {/* Thanh liên kết ở background */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-border-dark -z-10" />
              <div 
                className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 bg-blue-500 transition-all duration-300 -z-10" 
                style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
              />

              {/* Step 1 */}
              <div className="flex flex-col items-center gap-1.5 bg-sidebar-dark/95 px-3 z-10">
                <div className={cn(
                  "size-8 rounded-full flex items-center justify-center text-xs font-black border transition-all duration-200",
                  step > 1 
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]" 
                    : step === 1 
                      ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(37,99,235,0.2)]" 
                      : "bg-stone-900 border-border-dark text-text-dim"
                )}>
                  {step > 1 ? <Check size={14} /> : "1"}
                </div>
                <span className={cn(
                  "text-[10px] uppercase font-black tracking-wider transition-colors",
                  step === 1 ? "text-blue-400" : step > 1 ? "text-emerald-400" : "text-text-dim"
                )}>Xác nhận thông tin</span>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center gap-1.5 bg-sidebar-dark/95 px-3 z-10">
                <div className={cn(
                  "size-8 rounded-full flex items-center justify-center text-xs font-black border transition-all duration-200",
                  step > 2 
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]" 
                    : step === 2 
                      ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(37,99,235,0.2)]" 
                      : "bg-stone-900 border-border-dark text-text-dim"
                )}>
                  {step > 2 ? <Check size={14} /> : "2"}
                </div>
                <span className={cn(
                  "text-[10px] uppercase font-black tracking-wider transition-colors",
                  step === 2 ? "text-blue-400" : step > 2 ? "text-emerald-400" : "text-text-dim"
                )}>Đọc hợp đồng</span>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center gap-1.5 bg-sidebar-dark/95 px-3 z-10">
                <div className={cn(
                  "size-8 rounded-full flex items-center justify-center text-xs font-black border transition-all duration-200",
                  step === 3 
                    ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(37,99,235,0.2)]" 
                    : "bg-stone-900 border-border-dark text-text-dim"
                )}>
                  3
                </div>
                <span className={cn(
                  "text-[10px] uppercase font-black tracking-wider transition-colors",
                  step === 3 ? "text-blue-400" : "text-text-dim"
                )}>Ký hợp đồng</span>
              </div>
            </div>
          </div>

          {/* MAIN INTERACTION AREA WITH ANIMATION */}
          <div className="flex-1 min-h-0 bg-card-dark/40 border border-border-dark/60 rounded-2xl overflow-hidden flex flex-col shadow-xl">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-h-0 overflow-y-auto p-5 md:p-6 space-y-6"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* BÊN A FORM */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="flex items-center justify-between border-b border-border-dark pb-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                          <h2 className="text-xs uppercase font-black tracking-wider text-white">Bên A: Thông tin khách hàng (Người ký)</h2>
                        </div>
                        
                        <button
                          type="button"
                          onClick={handleAutoFill}
                          className="px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/25 text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                        >
                          <Sparkles size={10} />
                          Tự động điền
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Họ tên */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-text-dim tracking-wider flex items-center gap-1">
                            Họ và tên <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Nhập đầy đủ họ và tên"
                            value={partyA.fullName}
                            onChange={(e) => setPartyA({ ...partyA, fullName: e.target.value })}
                            className={cn(
                              "w-full bg-black/20 border border-border-dark focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all rounded-xl px-3 py-2 text-white placeholder:text-text-dim text-xs",
                              formErrors.fullName && "border-red-500/50 focus:border-red-500"
                            )}
                          />
                          {formErrors.fullName && <p className="text-[9px] text-red-400 font-bold">{formErrors.fullName}</p>}
                        </div>

                        {/* CCCD */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-text-dim tracking-wider">
                            Số CCCD <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Nhập 12 số CCCD"
                            value={partyA.cccd}
                            onChange={(e) => setPartyA({ ...partyA, cccd: e.target.value })}
                            className={cn(
                              "w-full bg-black/20 border border-border-dark focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all rounded-xl px-3 py-2 text-white placeholder:text-text-dim text-xs",
                              formErrors.cccd && "border-red-500/50 focus:border-red-500"
                            )}
                          />
                          {formErrors.cccd && <p className="text-[9px] text-red-400 font-bold">{formErrors.cccd}</p>}
                        </div>

                        {/* Ngày cấp */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-text-dim tracking-wider">
                            Ngày cấp <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={partyA.cccdDate}
                            onChange={(e) => setPartyA({ ...partyA, cccdDate: e.target.value })}
                            className={cn(
                              "w-full bg-black/20 border border-border-dark focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all rounded-xl px-3 py-2 text-white text-xs",
                              formErrors.cccdDate && "border-red-500/50"
                            )}
                          />
                          {formErrors.cccdDate && <p className="text-[9px] text-red-400 font-bold">{formErrors.cccdDate}</p>}
                        </div>

                        {/* Nơi cấp */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-text-dim tracking-wider">
                            Nơi cấp <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Ví dụ: Cục CS QLHC về TTXH"
                            value={partyA.cccdPlace}
                            onChange={(e) => setPartyA({ ...partyA, cccdPlace: e.target.value })}
                            className={cn(
                              "w-full bg-black/20 border border-border-dark focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all rounded-xl px-3 py-2 text-white placeholder:text-text-dim text-xs",
                              formErrors.cccdPlace && "border-red-500/50"
                            )}
                          />
                          {formErrors.cccdPlace && <p className="text-[9px] text-red-400 font-bold">{formErrors.cccdPlace}</p>}
                        </div>

                        {/* Điện thoại */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-text-dim tracking-wider">
                            Số điện thoại <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Ví dụ: 0912345678"
                            value={partyA.phone}
                            onChange={(e) => setPartyA({ ...partyA, phone: e.target.value })}
                            className={cn(
                              "w-full bg-black/20 border border-border-dark focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all rounded-xl px-3 py-2 text-white placeholder:text-text-dim text-xs",
                              formErrors.phone && "border-red-500/50"
                            )}
                          />
                          {formErrors.phone && <p className="text-[9px] text-red-400 font-bold">{formErrors.phone}</p>}
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-text-dim tracking-wider">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            placeholder="Vi du: nguyenvan@gmail.com"
                            value={partyA.email}
                            onChange={(e) => setPartyA({ ...partyA, email: e.target.value })}
                            className={cn(
                              "w-full bg-black/20 border border-border-dark focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all rounded-xl px-3 py-2 text-white placeholder:text-text-dim text-xs",
                              formErrors.email && "border-red-500/50"
                            )}
                          />
                          {formErrors.email && <p className="text-[9px] text-red-400 font-bold">{formErrors.email}</p>}
                        </div>
                      </div>

                      {/* Địa chỉ */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-text-dim tracking-wider">
                          Địa chỉ liên hệ <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Địa chỉ số nhà, ngõ, phường, quận, tỉnh thành..."
                          value={partyA.address}
                          onChange={(e) => setPartyA({ ...partyA, address: e.target.value })}
                          className={cn(
                            "w-full bg-black/20 border border-border-dark focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all rounded-xl px-3 py-2 text-white placeholder:text-text-dim text-xs",
                            formErrors.address && "border-red-500/50"
                          )}
                        />
                        {formErrors.address && <p className="text-[9px] text-red-400 font-bold">{formErrors.address}</p>}
                      </div>
                    </div>

                    {/* BÊN B ACCORDION & PARTNER SELECT */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="flex items-center gap-2 border-b border-border-dark pb-2 mb-3">
                        <span className="size-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                        <h2 className="text-xs uppercase font-black tracking-wider text-white">Bên B: Chọn Đối tác & Thông tin</h2>
                      </div>

                      {/* Chọn đối tác từ DB */}
                      <div className="space-y-1 bg-black/10 border border-border-dark/60 p-3 rounded-xl">
                        <label className="text-[9px] font-black uppercase text-text-dim tracking-widest">
                          Chọn đối tác liên kết
                        </label>
                        <select
                          value={selectedPartnerId}
                          onChange={(e) => setSelectedPartnerId(e.target.value)}
                          className="w-full bg-black/40 border border-border-dark focus:border-blue-500 transition-all rounded-lg px-2.5 py-1.5 text-white text-xs"
                        >
                          <option value="default">Cấu hình mặc định (Huỳnh Bảo)</option>
                          {partners.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (MST: {p.taxCode})</option>
                          ))}
                        </select>
                        <p className="text-[9px] text-text-dim italic mt-1">Hệ thống tự điền thông tin dựa trên đối tác bạn chọn.</p>
                      </div>

                      {/* ACCORDION CHO BÊN B */}
                      <div className="border border-border-dark/80 rounded-xl overflow-hidden shadow-sm bg-black/15">
                        <button
                          type="button"
                          onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                          className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 flex items-center justify-between text-left text-xs text-white font-bold transition-all border-b border-border-dark/40"
                        >
                          <span className="flex items-center gap-2">
                            <Info size={13} className="text-amber-500" />
                            Thông tin Bên B (Read-only)
                          </span>
                          {isAccordionOpen ? <ChevronUp size={14} className="text-text-dim" /> : <ChevronDown size={14} className="text-text-dim" />}
                        </button>

                        <AnimatePresence initial={false}>
                          {isAccordionOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 space-y-3.5 text-[11px]">
                                <div className="space-y-1">
                                  <span className="text-[9px] uppercase font-bold text-text-dim tracking-wider">Tên tổ chức</span>
                                  <p className="font-semibold text-white">{partyB.name}</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <span className="text-[9px] uppercase font-bold text-text-dim tracking-wider">Người đại diện</span>
                                    <p className="font-semibold text-white">{partyB.representative}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[9px] uppercase font-bold text-text-dim tracking-wider">Chức vụ</span>
                                    <p className="font-semibold text-white">{partyB.position}</p>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[9px] uppercase font-bold text-text-dim tracking-wider">Địa chỉ tổ chức</span>
                                  <p className="font-semibold text-white/90 leading-relaxed">{partyB.address}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-border-dark/30 pt-3">
                                  <div className="space-y-1">
                                    <span className="text-[9px] uppercase font-bold text-text-dim tracking-wider">Mã số thuế (MST)</span>
                                    <p className="font-semibold text-white font-mono">{partyB.taxCode}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[9px] uppercase font-bold text-text-dim tracking-wider">Số tài khoản</span>
                                    <p className="font-semibold text-white font-mono tracking-wider">{partyB.accountNumber}</p>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[9px] uppercase font-bold text-text-dim tracking-wider">Mở tại Ngân hàng</span>
                                  <p className="font-semibold text-white/90">{partyB.bankName}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-h-0 flex flex-col p-5 md:p-6 space-y-4"
                >
                  <div className="flex items-center justify-between shrink-0 bg-white/5 border border-border-dark/60 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-blue-500" />
                      <div>
                        <h2 className="text-xs text-white font-extrabold uppercase">Xem trước và Biên tập Hợp đồng</h2>
                        <p className="text-[9px] text-text-dim">Đọc kỹ trước khi chuyển qua bước ký số. Bạn có thể bấm Chỉnh sửa để sửa đổi trực tiếp văn bản.</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md border",
                        isEditing 
                          ? "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700" 
                          : "bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600/25"
                      )}
                    >
                      {isEditing ? (
                        <>
                          <Save size={13} />
                          Lưu thay đổi
                        </>
                      ) : (
                        <>
                          <Edit3 size={13} />
                          Chỉnh sửa
                        </>
                      )}
                    </button>
                  </div>

                  {/* DOCUMENT VIEWER */}
                  <div className="flex-1 min-h-0 relative border border-border-dark rounded-xl overflow-hidden">
                    {isEditing ? (
                      <textarea
                        value={contractText}
                        onChange={(e) => setContractText(e.target.value)}
                        className="w-full h-full p-6 bg-stone-950 text-white font-mono text-[11px] leading-relaxed focus:outline-none resize-none overflow-y-auto"
                      />
                    ) : (
                      <div className="w-full h-full p-6 bg-stone-900 overflow-y-auto text-stone-300 font-sans text-xs leading-relaxed select-text space-y-1.5 whitespace-pre-wrap">
                        {contractText}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-h-0 overflow-y-auto p-5 md:p-6 space-y-6"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* BÊN TRÁI: ĐIỀU KHOẢN CAM KẾT & THÔNG TIN KÝ SỐ */}
                    <div className="lg:col-span-6 space-y-5">
                      <div className="flex items-center gap-2 border-b border-border-dark pb-2">
                        <ShieldCheck size={16} className="text-emerald-500" />
                        <h2 className="text-xs uppercase font-black tracking-wider text-white">Xác nhận & Cam kết pháp lý</h2>
                      </div>

                      {/* Điều khoản cam kết Checkbox */}
                      <button
                        type="button"
                        onClick={() => setHasAgreed(!hasAgreed)}
                        className="w-full text-left p-4 bg-white/5 hover:bg-white/10 border border-border-dark rounded-xl transition-all flex items-start gap-3 select-none"
                      >
                        <div className="mt-0.5 shrink-0 text-blue-500">
                          {hasAgreed ? <CheckSquare size={16} /> : <Square size={16} className="text-text-dim" />}
                        </div>
                        <p className="text-xs text-stone-300 leading-relaxed font-semibold">
                          Tôi xác nhận rằng tôi đã đọc toàn bộ các điều khoản của Hợp đồng dịch vụ thương mại ở Bước 2. Tôi hoàn toàn đồng ý và cam kết sẽ thực hiện đúng các quyền và nghĩa vụ quy định trong hợp đồng này.
                        </p>
                      </button>

                      {/* Họ tên người ký */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-text-dim tracking-wider">
                          Họ tên người ký hiển thị
                        </label>
                        <input
                          type="text"
                          placeholder="Ví dụ: NGUYỄN VĂN A"
                          value={signerName}
                          onChange={(e) => {
                            setSignerName(e.target.value);
                            setTypedSignature(e.target.value);
                          }}
                          className="w-full bg-black/20 border border-border-dark focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all rounded-xl px-3 py-2 text-white placeholder:text-text-dim text-xs font-bold uppercase"
                        />
                        <p className="text-[9px] text-text-dim italic">Họ tên này sẽ được chèn vào góc chữ ký số và biên bản xác thực của hợp đồng.</p>
                      </div>

                      {/* Chọn loại chữ ký */}
                      <div className="bg-black/10 border border-border-dark/60 p-4 rounded-xl space-y-3">
                        <span className="text-[9px] uppercase font-black text-text-dim tracking-widest">Phương thức ký</span>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setSignatureType('draw')}
                            className={cn(
                              "py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5",
                              signatureType === 'draw'
                                ? "bg-blue-600/10 border-blue-500 text-blue-400"
                                : "bg-black/20 border-border-dark text-text-dim hover:text-white"
                            )}
                          >
                            <PenTool size={12} />
                            Vẽ chữ ký
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setSignatureType('type')}
                            className={cn(
                              "py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5",
                              signatureType === 'type'
                                ? "bg-blue-600/10 border-blue-500 text-blue-400"
                                : "bg-black/20 border-border-dark text-text-dim hover:text-white"
                            )}
                          >
                            <Sparkles size={12} />
                            Chữ ký viết tay
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* BÊN PHẢI: KHUNG VẼ CANVAS HOẶC NHẬP CHỮ KÝ NGHỆ THUẬT */}
                    <div className="lg:col-span-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-border-dark pb-2">
                        <h2 className="text-xs uppercase font-black tracking-wider text-white">Khung ký hợp đồng điện tử</h2>
                        
                        {signatureType === 'draw' && (
                          <button
                            type="button"
                            onClick={clearCanvas}
                            className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase transition-colors"
                          >
                            Xóa nét vẽ
                          </button>
                        )}
                      </div>

                      {signatureType === 'draw' ? (
                        <div className="relative bg-stone-900 border border-border-dark rounded-xl overflow-hidden shadow-inner flex flex-col items-center">
                          <div className="absolute top-2 left-2 text-[9px] uppercase font-bold text-blue-400/60 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10 flex items-center gap-1 pointer-events-none">
                            <PenTool size={10} /> Dùng chuột/ngón tay để vẽ
                          </div>

                          <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="w-full h-44 cursor-crosshair bg-stone-955"
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase text-text-dim">
                              Nhập nội dung chữ ký viết tay
                            </label>
                            <input
                              type="text"
                              value={typedSignature}
                              onChange={(e) => setTypedSignature(e.target.value)}
                              className="w-full bg-black/20 border border-border-dark focus:border-blue-500 transition-all rounded-xl px-3 py-2 text-white text-xs font-semibold"
                              placeholder="Nhập tên chữ ký viết tay của bạn"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase text-text-dim">
                              Chọn phông chữ viết tay nghệ thuật
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {cursiveFonts.map(f => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => setSelectedCursiveFont(f.id)}
                                  className={cn(
                                    "p-3.5 bg-black/35 hover:bg-black/50 border rounded-xl text-center transition-all flex flex-col items-center justify-center min-h-[75px] gap-1",
                                    selectedCursiveFont === f.id
                                      ? "border-blue-500 text-blue-400"
                                      : "border-border-dark text-text-dim"
                                  )}
                                >
                                  <span className="text-[9px] text-text-dim/80 uppercase font-black tracking-widest">{f.name}</span>
                                  <span className={cn("text-lg select-none truncate w-full", f.className)}>
                                    {typedSignature || 'Signature'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cảnh báo bảo mật */}
                      <div className="flex gap-2.5 p-3.5 bg-blue-500/5 border border-blue-500/10 rounded-xl text-[10px] text-stone-300 leading-normal">
                        <ShieldCheck className="size-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-white uppercase tracking-wider mb-0.5">Bảo mật chữ ký số</p>
                          Chữ ký của bạn được mã hóa hoàn toàn và chỉ sử dụng cho mục đích gắn chứng nhận lên bản hợp đồng số này. Hệ thống không lưu trữ nét chữ ký của bạn dưới dạng ảnh gốc thô.
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CONTROL FOOTER */}
            <div className="shrink-0 border-t border-border-dark px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-3 bg-black/10">
              <div className="flex gap-4 text-[10px] text-text-dim font-bold uppercase tracking-wider order-2 md:order-1">
                <button
                  type="button"
                  onClick={() => toast('Thông báo: Hợp đồng đã lưu dưới dạng nháp. Bạn có thể quay lại sau.', 'info')}
                  className="hover:text-white transition-colors"
                >
                  Để sau — tôi sẽ ký sau
                </button>
                <span className="text-border-dark">|</span>
                <button
                  type="button"
                  onClick={() => toast('Yêu cầu hỗ trợ: Bộ phận kỹ thuật sẽ liên hệ hỗ trợ bạn qua điện thoại.', 'info')}
                  className="hover:text-white transition-colors"
                >
                  Gặp vấn đề với điều khoản?
                </button>
              </div>

              <div className="flex gap-3 w-full md:w-auto order-1 md:order-2">
                <button
                  onClick={handleBack}
                  className="flex-1 md:flex-initial px-4 py-2 border border-border-dark text-text-dim hover:text-white rounded-xl text-xs font-bold transition-all hover:bg-white/5 flex items-center justify-center gap-1"
                >
                  <ChevronLeft size={13} />
                  Quay lại
                </button>
                
                <button
                  onClick={handleContinue}
                  disabled={isSigningProgress}
                  className={cn(
                    "flex-1 md:flex-initial px-5 py-2 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-lg",
                    step === 3 
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10" 
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/10"
                  )}
                >
                  {isSigningProgress ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Đang xử lý ký...
                    </>
                  ) : step === 3 ? (
                    <>
                      <Check size={13} />
                      Hoàn thành và Ký
                    </>
                  ) : (
                    <>
                      Tiếp tục
                      <ChevronRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* SUCCESS SCREEN - DASHBOARD CHỨNG CHỈ KÝ SỐ */
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex-1 bg-card-dark/40 border border-border-dark/60 rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center space-y-6 shadow-xl"
        >
          {/* Animated checkmark icon */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
            <div className="size-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center z-10 relative shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <ShieldCheck size={36} />
            </div>
          </div>

          <div className="space-y-2 max-w-md">
            <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight">Ký Kết Hợp Đồng Thành Công!</h2>
            <p className="text-xs text-text-dim leading-relaxed">
              Hợp đồng dịch vụ thương mại số <span className="font-bold text-white font-mono">{new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}/HĐDV-HB</span> đã được ký số hoàn tất và gắn chứng chỉ pháp lý.
            </p>
          </div>

          {/* CHỨNG CHỈ SỐ DASHBOARD */}
          <div className="w-full max-w-xl bg-black/35 border border-border-dark rounded-2xl p-4 text-left space-y-3.5">
            <div className="flex items-center justify-between border-b border-border-dark/50 pb-2">
              <span className="text-[10px] uppercase font-black text-white tracking-widest flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-400" />
                Chứng thư số xác thực hợp đồng
              </span>
              <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded">
                Trạng thái: {mockCertificate.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-text-dim">Mã băm hợp đồng (Hash)</span>
                <p className="text-[10px] font-mono text-white/95 truncate" title={mockCertificate.contractHash}>{mockCertificate.contractHash}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-text-dim">Thời gian đóng dấu</span>
                <p className="text-white/95">{mockCertificate.signingTime}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-text-dim">IP người ký ký kết</span>
                <p className="text-white/95 font-mono">{mockCertificate.ipAddress}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-text-dim">Thiết bị (User-Agent)</span>
                <p className="text-white/95 truncate">{mockCertificate.browser}</p>
              </div>
            </div>

            <div className="border-t border-border-dark/40 pt-3.5 flex items-start gap-2.5 text-[10px] text-text-dim leading-relaxed">
              <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                Chứng thư được cấp bởi <span className="text-white font-bold">{mockCertificate.authority}</span> dưới sự tuân thủ nghiêm ngặt của Luật Giao dịch điện tử Việt Nam.
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md pt-2">
            <button
              onClick={handleDownloadPDF}
              className="flex-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/10 flex items-center justify-center gap-1.5"
            >
              <Download size={14} />
              Tải hợp đồng đã ký (.PDF)
            </button>

            <button
              onClick={() => {
                // Reset lại từ đầu
                setStep(1);
                setIsSigned(false);
                setHasAgreed(false);
                setDrawnSignatureData(null);
              }}
              className="flex-1 px-5 py-2.5 bg-white/5 border border-border-dark text-white rounded-xl text-xs font-bold transition-all hover:bg-white/10 flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={14} />
              Tạo hợp đồng mới
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
