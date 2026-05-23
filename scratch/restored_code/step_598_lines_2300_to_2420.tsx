   'NGANHANGBENB': 'Ngân hàng Bên B',
   'NGAN_HANG_A': 'Ngân hàng Bên A',
   'NGAN_HANG_B': 'Ngân hàng Bên B',
   'NGAY_HD': 'Ngày ký hợp đồng',
   'THANG_HD': 'Tháng ký hợp đồng',
   'NAM_HD': 'Năm ký hợp đồng',
   'NGAY_HOPDONG': 'Ngày ký hợp đồng',
   'THANG_HOPDONG': 'Tháng ký hợp đồng',
   'NAM_HOPDONG': 'Năm ký hợp đồng',
   'NGAYKYHOPDONG': 'Ngày ký hợp đồng',
   'SO_HD': 'Số hợp đồng',
   'SO_HOPDONG': 'Số hợp đồng',
   'SOHOPDONG': 'Số hợp đồng',
   'SOHD': 'Số hợp đồng',
   'NGAY_BAT_DAU': 'Ngày bắt đầu',
   'NGAY_KET_THUC': 'Ngày kết thúc',
   'BANGCHUGIATRI': 'Bằng chữ giá trị',
   'BANGGIATRIHOPDONG': 'Bảng giá trị hợp đồng',
   'BANG_GIATRIHOPDONG': 'Bảng giá trị hợp đồng',
   'GIATRIHOPDONG': 'Giá trị hợp đồng',
   'TEN_CTY_VIET_TAT': 'Tên công ty viết tắt',
   'NOI_KY': 'Nơi ký',
   'DIA_DIEM': 'Địa điểm',
   'BANG_GIATRITHUEXE': 'Bảng giá trị thuê xe',
   'BANGGIATRITHUEXE': 'Bảng giá trị thuê xe',
   'GOI_THAU': 'Gói thầu',
   'TEN_CONGTRINH': 'Tên công trình',
   'BEN_DE_NGHI': 'Bên đề nghị (Bên B)',
   'BEN_DUOC_DE_NGHI': 'Bên được đề nghị (Bên A)',
   'DAI_DIEN_BEN_DE_NGHI': 'Đại diện bên đề nghị (Bên B)',
   'STK_BEN_DE_NGHI': 'Số tài khoản bên đề nghị (Bên B)',
   'NGAN_HANG_BEN
   const d = new Date(dateStr);
   if (isNaN(d.getTime())) return dateStr;
   const day = d.getDate().toString().padStart(2, '0');
   const month = (d.getMonth() + 1).toString().padStart(2, '0');
   const year = d.getFullYear();
   return `ngày ${day} tháng ${month} năm ${year}`;
 };
 
 const InlineField: React.FC<{
   tag: string;
   value: string;
   onChange: (val: string) => void;
   placeholder?: string;
   type?: 'text' | 'date' | 'select';
   options?: string[];
   onOpenSelector?: () => void;
   isCurrency?: boolean;
   className?: string;
 }> = ({ tag, value, onChange, placeholder, type = 'text', options = [], onOpenSelector, isCurrency, className }) => {
   const [isFocused, setIsFocused] = useState(false);
   const friendlyLabel = placeholder || getFriendlyLabel(tag);
 
   const displayValue = value || friendlyLabel;
   const isPlaceholder = !value;
   
   // Calculate character width dynamically
   const charWidth = 7.5;
   const inputWidth = Math.max(displayValue.length * charWidth + (type === 'select' ? 20 : 12), 45);
 
   return (
     <span
       className={cn(
         "inline-flex items-center relative rounded transition-all duration-200 align-baseline mx-0.5 px-1 py-0.5",
         isFocused
           ? "bg-blue-100/90 ring-1 ring-blue-400 text-blue-950"
           : isPlaceholder
             ? "bg-amber-50/40 text-amber-600/70 border-b border-dashed border-amber-400 hover:bg-amber-100/40 hover:text-amber-700 cursor-pointer"
             : "text-blue-900 font-bold bg-blue-50/40 border-b border-blue-400 hover:bg-blue-100/30 hover:text-blue-950 cursor-pointer",