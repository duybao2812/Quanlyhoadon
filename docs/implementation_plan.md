# Kế Hoạch - OCR Hợp Đồng Chạy Ngầm & Xử Lý Nhiều File

Kế hoạch nâng cấp tính năng OCR hợp đồng PDF nhằm hỗ trợ chạy ngầm hoàn toàn khi người dùng chuyển tab, hỗ trợ tải lên và xử lý hàng loạt nhiều tệp tin (chờ 60s giữa các tệp), hiển thị nhãn "Mới" cho các tệp vừa hoàn tất, loại bỏ các đồng hồ hiển thị thời gian ở footer, và đồng bộ màu sắc biểu tượng (icon) hợp đồng theo loại mẫu.

---

## Các Thay Đổi Được Đề Xuất

### 1. Loại Bỏ Thời Gian Đếm Ở Footer
- **Tệp tin**: [App.tsx](file:///d:/GitHub/Quanlyhoadon/src/App.tsx)
- **Hành động**: Loại bỏ việc hiển thị "thời gian đã qua" và "thời gian dự kiến còn lại" ở footer. Footer chỉ giữ lại:
  - Đèn trạng thái & Nhãn OCR
  - Thanh tiến độ (đổi màu theo status: cam/đỏ/xanh)
  - Phần trăm hoàn thành (`%`)
  - Số giai đoạn (`STG X/Y` hoặc thông tin tiến độ file như `Hoàn thành 1/3 file`)
  - Nút đóng `✕` khi có lỗi.

---

### 2. Quản Lý Hàng Đợi OCR Ngầm Trên Parent Component (App)
- **Tệp tin**: [App.tsx](file:///d:/GitHub/Quanlyhoadon/src/App.tsx)
- **Mô tả**: Di chuyển logic chạy `extractFromContract` từ `ContractUploadView.tsx` lên cấp cha `App.tsx` để tiến trình không bị hủy khi đổi tab (unmount).
- **Trạng thái lưu trữ**:
  ```typescript
  const [ocrQueue, setOcrQueue] = useState<{
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'completed' | 'error';
    error?: string;
    result?: any;
  }[]>([]);
  const [currentOcrIndex, setCurrentOcrIndex] = useState<number>(-1);
  const [isCooldown, setIsCooldown] = useState<boolean>(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [showOcrBatchCompleteModal, setShowOcrBatchCompleteModal] = useState<boolean>(false);
  const [batchOcrCount, setBatchOcrCount] = useState<number>(0);
  const [newlyOcrContractIds, setNewlyOcrContractIds] = useState<string[]>([]);
  ```

- **Logic xử lý**:
  - Khi người dùng bấm "Trích xuất" từ `ContractUploadView`, callback `onStartOcr(files)` được kích hoạt.
  - Hàng đợi `ocrQueue` được nạp danh sách tệp. Thiết lập chạy tuần tự bắt đầu từ file đầu tiên.
  - Khi hoàn thành 1 file:
    - Nếu có **nhiều hơn 1 file** trong hàng đợi, hoặc **người dùng đã chuyển tab khác** (không còn ở `'contract_upload'`): Hệ thống tự động lưu hợp đồng vào database thông qua API Supabase và cập nhật danh sách (`fetchContracts`), sau đó thêm ID vào danh sách `newlyOcrContractIds`.
    - Nếu chỉ có **1 file** và người dùng **vẫn ở trên tab** `'contract_upload'`: Giữ nguyên hành vi hiện tại (hiển thị form kết quả bóc tách để người dùng kiểm tra và bấm "Lưu" thủ công).
  - Khoảng nghỉ giữa các file (nếu có file tiếp theo): Chờ **60 giây** trước khi chạy tệp tiếp theo để tránh quá tải giới hạn API. Đồng hồ đếm ngược chờ 60s sẽ hiển thị ở footer.
  - Khi hoàn thành toàn bộ hàng đợi: Hiển thị popup modal thông báo chốt hoàn tất hàng loạt với nút bấm "Đi tới Quản lý hợp đồng" (cập nhật hash URL sang `#/dashboard/Quan-ly-hop-dong/`).
  - Hỗ trợ tự động lưu hợp đồng chưa lưu nếu người dùng chuyển tab khi file đơn lẻ đã hoàn thành bóc tách.

---

### 3. Đồng Bộ Hóa Trạng Thái Trong `ContractUploadView`
- **Tệp tin**: [ContractUploadView.tsx](file:///d:/GitHub/Quanlyhoadon/src/components/Contract/ContractUploadView.tsx)
- **Hành động**:
  - Cho phép chọn nhiều file PDF cùng lúc ở dropzone.
  - Thêm các prop nhận trạng thái từ `App`: `onStartOcr`, `isProcessing`, `ocrProgress`, `ocrResult`, `ocrError`, `onClearOcr`.
  - Đồng bộ `ocrResult` và `ocrError` vào state nội bộ để render form hiển thị kết quả chỉnh sửa như cũ.
  - Tích hợp gọi `onStartOcr` khi nhấn nút "Đọc và trích xuất dữ liệu".

---

### 4. Thiết Kế Nhãn "Mới" Cho Hợp Đồng Vừa OCR
- **Tệp tin**: [App.tsx](file:///d:/GitHub/Quanlyhoadon/src/App.tsx)
- **Mô tả**:
  - Đối với các hợp đồng vừa bóc tách hoàn thành trong phiên làm việc, lưu trữ ID trong `newlyOcrContractIds` state.
  - Ở `ContractManagementCard`, hiển thị thêm nhãn nhấp nháy `"Mới"` màu đỏ hồng (`bg-rose-500/20 border-rose-500/30 text-rose-400`) bên cạnh nhãn "Hồ sơ AI".
  - Nhãn này **chỉ hiển thị 1 lần**: Khi người dùng rời khỏi tab `"contract"` (Quản lý hợp đồng) sang tab khác, hệ thống sẽ tự động dọn dẹp danh sách `newlyOcrContractIds = []`. Do đó khi quay lại hoặc F5 sẽ mất nhãn này.

---

### 5. Điều Chỉnh Màu Sắc Biểu Tượng (Icon) Hợp Đồng
- **Tệp tin**: [App.tsx](file:///d:/GitHub/Quanlyhoadon/src/App.tsx) - hàm `getContractIcon`
- **Hành động**: Thay đổi ưu tiên hiển thị màu sắc biểu tượng theo loại mẫu hợp đồng thay vì ép buộc màu tím cho toàn bộ file quét AI.
  - **HĐ Ca Máy (`HDCM`)**: Icon màu Cam (kèm biểu tượng Cog), nếu quét bởi AI thì biểu tượng góc dưới bên phải đổi thành Sparkles (màu Cam).
  - **HĐ Thi Công (`HDTC`)**: Icon màu Xanh Dương (kèm biểu tượng Construction), nếu quét bởi AI thì biểu tượng góc đổi thành Sparkles (màu Xanh Dương).
  - **HĐ Vật Tư / Loại khác**: Icon màu Xanh Lá (kèm biểu tượng Box), nếu quét bởi AI thì biểu tượng góc đổi thành Sparkles (màu Xanh Lá).

---

## Quy Trình Xác Minh & Kiểm Thử

### Kiểm Thử Tự Động
- Chạy lệnh `npm run build` để kiểm tra toàn bộ lỗi kiểu dữ liệu TypeScript và biên dịch bundle.

### Kiểm Thử Thủ Công
1. **Kiểm tra tắt đồng hồ**: Xác nhận footer không còn hiển thị thời gian chạy hoặc ước tính, chỉ có tiến trình phần trăm và message.
2. **Kiểm tra chạy ngầm đơn lẻ**: Tải lên 1 file, click trích xuất, chuyển ngay sang tab đối tác/dashboard. Chờ footer chuyển sang màu xanh thông báo hoàn thành, sau đó chuyển sang "Quản lý hợp đồng" kiểm tra xem hợp đồng đã tự động lưu chưa và có nhãn "Mới" không.
3. **Kiểm tra chạy ngầm hàng loạt (nhiều file)**: Tải lên 3 file PDF cùng lúc, bắt đầu trích xuất. Xác nhận tiến trình chạy tuần tự, có hiển thị thời gian chờ 60s giữa các tệp. Đợi hoàn thành tất cả, xác nhận hiển thị popup hoàn thành và nút bấm chuyển hướng hoạt động tốt.
4. **Kiểm tra biến mất nhãn Mới**: Xem nhãn "Mới", sau đó click sang tab Dashboard rồi quay lại, xác nhận nhãn biến mất.
5. **Kiểm tra màu sắc Icon**: Xác nhận hợp đồng thi công quét bởi AI hiển thị màu xanh dương chủ đạo với Sparkles xanh dương ở góc, không còn màu tím.
