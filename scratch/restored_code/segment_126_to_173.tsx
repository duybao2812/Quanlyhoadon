 | `components/Invoice/InvoiceItemComp.tsx` | `../../lib/utils` | `../../utils/utils` |
 | `components/Invoice/InvoiceSummary.tsx` | `../../lib/formatter` | `../../utils/formatter` |
 | `components/Invoice/InvoiceTapCard.tsx` | `../../lib/utils` | `../../utils/utils` |
 
 ### Bước 4: Xóa thư mục `lib/` (sau khi xác nhận tất cả đã di chuyển)
 
 ### Bước 5: Chạy `npm run build` để xác minh không có lỗi
 
 ---
 
 ## Kết quả cuối cùng
 
 ```
 src/
 ├── assets/                    ← Chuẩn bị cho images/icons tương lai
 ├── components/                ← Reusable UI components
 │   ├── AIChatBox.tsx
 │   ├── Notifications.tsx
 │   └── Invoice/
 ├── context/                   ← Chuẩn bị cho React Context tương lai
 ├── hooks/                     ← Chuẩn bị cho custom hooks tương lai
 ├── services/                  ← API & external services
 │   ├── mistral.ts
 │   └── supabaseClient.ts
 ├── types/                     ← TypeScript types
 │   └── invoiceData.ts
 ├── utils/                     ← Helper functions & utilities
 │   ├── addressConverter.ts
 │   ├── addressData.ts
 │   ├── contractUtils.ts
   numberToVietnameseWords 
 } from './lib/contractUtils';
 │   ├── storage.ts
 const Sidebar = ({ 
 │   └── xmlParser.ts
   setActiveTab, 
 ├── index.css
   isPinned, 
   setIsPinned 
 }: { 
 ## Verification Plan
 
 ### Automated Tests
 - `npm run build` — Xác minh biên dịch thành công sau khi tái cấu trúc
 
 ### Manual Verification
 - Chạy `npm run dev` và kiểm tra toàn bộ 6 tab hoạt động bình thường
 