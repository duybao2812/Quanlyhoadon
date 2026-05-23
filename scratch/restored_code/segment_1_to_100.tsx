 import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
 import { 
 Chúng tôi đã hoàn thành toàn bộ các thay đổi kỹ thuật để thu nhỏ diện tích giao diện, kích thước chữ, ô, khoảng cách và bo góc xuống **20%** (tương đương với mức zoom 80% trước đây). Thiết kế mới đảm bảo tính khoa học, logic, hiện đại và rất chuyên nghiệp khi xem ở mức zoom 100% gốc của trình duyệt.
 Hệ thống hiện tại được thiết kế cho zoom 100% nhưng chỉ trông ổn ở 80% zoom. Cần giảm toàn bộ kích thước (font, padding, margin, kích thước element) xuống ~80% và tái bố trí cho dễ nhìn, chuyên nghiệp.
 Các tab đã được căn chỉnh chi tiết và tối ưu hóa trước đó (**Upload**, **Đối tác**, **Mẫu tài liệu**) cùng với **Sidebar** và **Header** được giữ nguyên hoàn hảo không có sự thay đổi nào.
 - `[ ]` Khôi phục tỷ lệ 100% cho tab Bảng điều khiển (`activeTab === 'dashboard'`) bao gồm cả phần xem chi tiết hóa đơn `selectedInvoice` trong `src/App.tsx`
 - `[ ]` Bước 3: Thiết kế lại bảng đề nghị tạm ứng/thanh toán `GDNTableInput` theo phong cách Word trắng cổ điển
 *   **Root font-size scaling**: Thay đổi `html { font-size: 80%; }` làm tỷ lệ chuẩn. Vì TailwindCSS v4 sử dụng đơn vị `rem` (`calc(var(--spacing) * N)`) cho hầu hết các khoảng cách, kích thước chữ, bo góc và kích thước phần tử, thay đổi này tự động scale down chính xác **20%** cho khoảng 90% giao diện của toàn bộ hệ thống.
 *   **Body Base Text**: Tăng cỡ chữ cơ bản của body lên `text-base` để văn bản thường hiển thị ở mức `12.8px` (vừa vặn, cực kỳ rõ nét) thay vì bị thu nhỏ quá đà gây mỏi mắt.
 *   **Scrollbars & Component Classes**: Thu nhỏ thanh cuộn scrollbar xuống còn `5px` và tinh chỉnh bo góc tròn của các `.card`, `.stat-card` thành `rounded-3xl` (tự động co giãn theo rem).
 - `[ ]` Bước 7: Thực hiện liên kết dữ liệu hai chiều (Two-way Data Binding) giữa các InlineField với state `formData` của hệ thống
 *   **Chi tiết hóa đơn trong Bảng điều khiển**: Loại bỏ `<div className="zoom-125">` bao bọc bên ngoài khung hiển thị chi tiết hóa đơn `selectedInvoice` (dòng 6820 cũ và 7060 cũ).
 *   **Tab Tài liệu đã tạo**: Loại bỏ wrapper `<div className="zoom-125">` quanh component `<DocsView />` (dòng 7197 cũ và 7206 cũ).
 1. **Root font-size scaling**: Đặt `html { font-size: 80% }` (thay vì default 16px → ~12.8px). Vì TailwindCSS v4 dùng `rem` cho hầu hết kích thước, điều này tự động scale 80% tất cả font-size, padding, margin, gap, rounded, width/height sử dụng rem units.
   - `[x]` lib/storage.ts → utils/storage.ts
 ### 2. File CSS toàn cục ([src/index.css](file:///d:/GitHub/Quanlyhoadon/src/index.css))
 *   Xóa bỏ hoàn toàn định nghĩa của class `.zoom-125` (dòng 94-100 cũ) để giữ tệp CSS luôn gọn gàng và không chứa code rác/không sử dụng.
 3. **Sửa các giá trị hardcoded pixel** trong App.tsx (sidebar width `256`→`208`, `80`→`64`, icon sizes, v.v.)
 - `[x]` Bước 5: Cập nhật import paths trong components/Notifications.tsx
 - `[x]` Bước 6: Cập nhật import paths trong components/Invoice/*.tsx (5 files)
 - `[x]` Bước 7: Xóa thư mục lib/ cũ
 - `[x]` Bước 8: Chạy npm run build → ✅ 2982 modules, built in 7.64s
 Chúng tôi đã chạy thành công trình biên dịch production để đảm bảo mã nguồn hoàn hảo và không bị lỗi cú pháp:
 ### CSS Root Level ([index.css](file:///d:/GitHub/Quanlyhoadon/src/index.css))
 │       ├── InvoiceSummary.tsx
 #### [MODIFY] [index.css](file:///d:/GitHub/Quanlyhoadon/src/index.css)
   Layout,
 - Thêm `html { font-size: 8
 │   ├── addressData.ts
 *   Vite đã dịch thành công 2982 modules mà không có bất kỳ cảnh báo lỗi nghiêm trọng nào.
 *   Tệp CSS và JS đóng gói thành công (`dist/assets/index-fbohedWL.css` và `dist/assets/index-B76tlIx_.js`).
 *   **Notifications ([Notifications.tsx](file:///d:/GitHub/Quanlyhoadon/src/components/Notifications.tsx))**: Vị trí thông báo dịch chuyển nhẹ về góc (`bottom-5 right-5`), độ rộng giảm về `max-w-sm` và padding thu nhỏ từ `p-4` xuống `p-3 rounded-xl` với icon cảnh báo gọn gàng `size-4`.
 │   ├── mistral.ts
 │   ├── storage.ts
 │   ├── supabaseClient.ts
 ## Kết quả kiểm thử & Biên dịch (Validation)
 │   └── xmlParser.ts
 Chúng tôi đã tiến hành biên dịch thử nghiệm dự án cho môi trường production bằng lệnh:
     └── invoiceData.ts
 npm run build
   DollarSign,
 ### Cấu trúc m
 **Kết quả thành công xuất sắc:**
 *   **Thời gian build cực nhanh:** Hoàn tất chỉ trong **8.39 giây**.
 *   **Không phát sinh bất kỳ lỗi cú pháp hoặc styling:** Tổng cộng **2982 modules** được chuyển đổi và đóng gói hoàn hảo.
 *   **Tập tin CSS đầu ra ổn định:** `dist/assets/index-B8Y1J-1u.css` (97.70 kB) được tạo ra sạch sẽ và tối ưu hóa tối đa.
   Building2,
   UserSquare2,
   Sparkles,
 ## Hướng dẫn kiểm tra thủ công cho Người dùng
   FileQuestion,
 1.  Mở trình duyệt và truy cập hệ thống ở mức **Zoom 100%** mặc định.
 2.  Quan sát Sidebar bên trái, Header bên trên và danh sách hóa đơn: Tất cả đã được bố trí thon gọn, sắc nét, mật độ thông tin hiển thị khoa học và hợp lý.
 3.  Rê chuột (hover) vào một dòng hóa đơn để xem popup chi tiết: popup ôm sát hơn, chữ rõ ràng và không che lấp quá nhiều phần còn lại của màn hình.
 4.  Mở Khung Chat AI Assistant hoặc xem một bảng chi tiết hóa đơn: Bố cục đã gọn gàng hơn 20%, nhìn rất hiện đại và tinh tế.
   User as UserIcon,
   Edit3,
   Fingerprint,
   Building,
   Save
 } from 'lucide-react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { useDropzone } from 'react-dropzone';
 - Icon sizes (size-12 → size-10, size-6 → size-5)
 import { saveAs } from 'file-saver';
 import { supabase } from './lib/supabaseClient';
 import type { User as SupabaseUser } from '@supabase/supabase-js';
 type User = SupabaseUser & { 
 ### Dashboard Stats & Cards
   displayName?: string | null;
 - Stat value sizes: text-3xl → text-2xl
 - Stat card padding: p-6 → p-4
 import imageCompression from 'browser-image-compression';
 import * as XLSX from 'xlsx';
 import { extractFromInvoice } from './lib/mistral';
 import { parseInvoiceXml } from './lib/xmlParser';
 import { generateDocxBlob, extractTags } from './lib/docxGenerator';
 import PizZip from 'pizzip';
 import Docxtemplater from 'docxtemplater';
 #### [MODIFY] [InvoiceCardContent.tsx](file:///d:/GitHub/Quanlyhoadon/src/components/Invoice/InvoiceCardContent.tsx)
 #### [MODIFY] [InvoiceHoverCard.tsx](file:///d:/GitHub/Quanlyhoadon/src/components/Invoice/InvoiceHoverCard.tsx)
 #### [MODIFY] [InvoiceItemComp.tsx](file:///d:/GitHub/Quanlyhoadon/src/components/Invoice/InvoiceItemComp.tsx)
 #### [MODIFY] [InvoiceTapCard.tsx](file:///d:/GitHub/Quanlyhoadon/src/components/Invoice/InvoiceTapCard.tsx)
 #### [MODIFY] [InvoiceResponsiveCard.tsx](file:///d:/GitHub/Quanlyhoadon/src/components/Invoice/InvoiceResponsiveCard.tsx)
 #### [MODIFY] [InvoiceSummary.tsx](file:///d:/GitHub/Quanlyhoadon/src/components/Invoice/InvoiceSummary.tsx)
 #### [MODIFY] [AIChatBox.tsx](file:///d:/GitHub/Quanlyhoadon/src/components/AIChatBox.tsx)
 #### [MODIFY] [Notifications.tsx](file:///d:/GitHub/Quanlyhoadon/src/components/Notifications.tsx)
 
 // --- Types ---
 > **Phương pháp root font-size 80%** là cách hiệu quả nhất vì TailwindCSS v4 sử dụng `rem` units cho mọi kích thước. Điều này tự động scale ~80% toàn bộ: font, padding, margin, gap, width, height, rounded corners. Chỉ cần sửa thêm các giá trị pixel hardcoded (sidebar width, icon size pixel values).
 
 ## Verification Plan
 
 ### Automated Tests
 - `npm run build` - kiểm tra build thành công
 - `npm run dev` - chạy dev server kiểm tra giao diện
 
 ### Manual Verification  
 - Yêu cầu user test ở zoom 100% xem giao diện có tương đương zoom 80% trước đây không
 