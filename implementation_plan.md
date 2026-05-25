# Kế hoạch thực hiện: Sửa lỗi Tệp Word, Nâng cấp Quản lý Tài chính & Đồng bộ Cloud Google Drive

Kế hoạch này phác thảo các sửa đổi kỹ thuật nhằm giải quyết lỗi hỏng tệp Word tải xuống, nâng cấp modal tài chính với lịch sử đợt tạm ứng, đồng bộ tệp hóa đơn từ tab Tạo hợp đồng, cơ cấu lại thư mục Apps Script và đồng bộ hóa thao tác xóa tệp trực tiếp trên Google Drive.

## Nội dung cần người dùng duyệt

> [!IMPORTANT]
> - ** apps script update**: Khi thay đổi cấu trúc thư mục GAS sang `"Lưu Trữ Hợp Đồng"` và tích hợp chức năng xóa đồng thời, bạn cần cập nhật mã nguồn GAS trong Google Drive Script Editor của mình bằng nội dung file `GOOGLE_APPS_SCRIPT_REFERENCE.gs` cập nhật sau khi hoàn thành.
> - **Bản sao lưu**: Toàn bộ thay đổi sẽ được thực hiện trực tiếp trên `src/App.tsx` và `GOOGLE_APPS_SCRIPT_REFERENCE.gs` trong workspace của bạn một cách an toàn nhất.

## Đề xuất Thay đổi

---

### 1. Sửa lỗi tệp Word hỏng (.docx) khi tải về

#### [MODIFY] [App.tsx](file:///d:/GitHub/Quanlyhoadon/src/App.tsx)
- Thay đổi tùy chọn sinh tệp zip trong `generateDocxBlobForContract` và `downloadContract` từ `type: 'blob'` sang `type: 'uint8array'` để tạo cấu trúc binary thô nguyên bản chuẩn xác.
- Tự đóng gói mảng Uint8Array bằng `new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })` trước khi thực hiện tải xuống qua `saveAs`. Điều này giúp khắc phục hoàn toàn hiện tượng Microsoft Word báo lỗi "Word encountered an error" do định dạng file không tương thích.
- Cải tiến `downloadContract` sử dụng chung nhân sinh tệp `generateDocxBlobForContract` đã được chuẩn hóa để loại bỏ code dư thừa và các lỗi phát sinh.

---

### 2. Vá lỗi hiển thị dữ liệu Hợp đồng từ tab Tạo hợp đồng (Metadata Binding)

#### [MODIFY] [App.tsx](file:///d:/GitHub/Quanlyhoadon/src/App.tsx)
- Cải tiến 3 hàm bóc tách dữ liệu (`getContractValue`, `getContractNumber`, `getContractSignDate`) ở file scope:
  - Chuẩn hóa toàn bộ khóa (keys) của dữ liệu `formData` thành chữ hoa và loại bỏ tất cả các ký tự đặc biệt như dấu gạch dưới (`_`), khoảng trắng.
  - Áp dụng cơ chế tìm kiếm mờ (fuzzy search) thông minh để khớp nối chính xác các biến thể của các tag như `GIATRI`, `GIATRIHOPDONG`, `GIATRI_HD`, `SO_HD`, `SO_HD_CM`, `NGAY_KY`, `NGAYKY`, v.v.
  - Bảo đảm dữ liệu từ tab Tạo hợp đồng luôn liên kết hoàn hảo sang sub-tab Quản lý hợp đồng mà không sợ lệch khóa tag.

---

### 3. Nâng cấp Modal Quản lý Tài chính & Lịch sử Đợt tạm ứng

#### [MODIFY] [App.tsx](file:///d:/GitHub/Quanlyhoadon/src/App.tsx)
- **Đồng bộ hóa hóa đơn tự động**:
  - Cập nhật `handleContractInvoiceIntegration` trong tab Tạo hợp đồng: Khi tích hợp hóa đơn, danh sách hóa đơn đã chọn sẽ được chuyển đổi tự động thành mảng các hàng hóa đơn và lưu trữ dưới dạng chuỗi JSON trong `formData._invoicesList`.
  - Khi người dùng mở Modal tài chính, bảng `"DANH SÁCH HÓA ĐƠN"` sẽ tự động tải các hóa đơn được chọn này từ `_invoicesList` và tự động tính toán lại Tổng giá trị hợp đồng dựa trên dữ liệu thực tế này.
- **Bảng Lịch sử Đợt tạm ứng (Tính năng mới)**:
  - Thêm cột lịch sử tạm ứng nằm ngay dưới phần nhập thông tin tạm ứng.
  - Người dùng điền số tiền tạm ứng, ngày, chứng từ và nội dung rồi bấm nút `"Thêm đợt tạm ứng"` (hoặc nhấn phím **Enter**), thông tin này sẽ được lưu thành một đối tượng trong mảng trạng thái `advanceHistory`.
  - Bảng lịch sử đợt tạm ứng hỗ trợ xem danh sách đợt tạm ứng đã lưu và hỗ trợ nút xóa đợt tạm ứng nhanh.
  - Tổng số tiền tạm ứng trong ô `"TỔNG SỐ TIỀN ĐÃ TẠM ỨNG"` sẽ được tính tự động từ tổng của tất cả các đợt tạm ứng trong lịch sử này.
  - Lưu trữ mảng lịch sử dưới dạng chuỗi JSON trong `formData._advanceHistoryList` và cập nhật tổng tạm ứng vào `formData._advanceAmount` để đồng bộ hoàn toàn với dashboard chính.

---

### 4. Tái cấu trúc thư mục GAS & Xóa tệp đồng thời trên Drive

#### [MODIFY] [GOOGLE_APPS_SCRIPT_REFERENCE.gs](file:///d:/GitHub/Quanlyhoadon/GOOGLE_APPS_SCRIPT_REFERENCE.gs)
- Đổi tên thư mục con mặc định dành cho hợp đồng trong hàm `getOrCreateFolderStructure` từ `"Hợp Đồng Đã Tạo"` thành `"Lưu Trữ Hợp Đồng"`.
- Bổ sung hành động `"delete_contract_folder"` trong Apps Script:
  - Tiếp nhận `folderName`, `fileId`, và `pdfFileId` từ yêu cầu.
  - Xóa vĩnh viễn tệp Word (`fileId`), tệp PDF quét (`pdfFileId`) và thư mục hợp đồng chuyên dụng (`folderName`) khỏi Google Drive của người dùng (`setTrashed(true)`).

#### [MODIFY] [App.tsx](file:///d:/GitHub/Quanlyhoadon/src/App.tsx)
- Nâng cấp hàm `handleDeleteContract`: Khi xóa hợp đồng locally khỏi Supabase, hệ thống sẽ đồng thời gửi một yêu cầu bất đồng bộ sang GAS endpoint kích hoạt xóa tương ứng tệp và thư mục trên Google Drive, giữ bộ nhớ lưu trữ Cloud hoàn toàn đồng bộ và tối ưu.

---

### 5. Sửa lỗi hiển thị tên file dài trong giao diện expanded card

#### [MODIFY] [App.tsx](file:///d:/GitHub/Quanlyhoadon/src/App.tsx)
- Loại bỏ thuộc tính `truncate` và `overflow-hidden` khỏi thẻ span hiển thị tên file `.docx` và file bản quét PDF trong Box 1.
- Áp dụng các thuộc tính CSS `whitespace-normal break-all` để tên file dài có thể tự động xuống dòng và hiển thị đầy đủ, không bị che khuất tên của các đối tác quan trọng.

---

## Kế hoạch Kiểm tra

### Kiểm tra tự động
- Chạy lệnh biên dịch và kiểm tra kiểu tĩnh của TypeScript:
  ```bash
  npx tsc --noEmit
  ```
- Đảm bảo biên dịch thành công 100% không có bất kỳ lỗi cú pháp hoặc kiểu dữ liệu nào.

### Kiểm tra thủ công
1. Thử tải tệp Word `.docx` của hợp đồng bằng nút in (Printer) trong danh sách và mở trực tiếp bằng Microsoft Word xem có hết lỗi hỏng tệp hay không.
2. Tạo hợp đồng mới trong tab Tạo hợp đồng và kiểm tra xem Mã HĐ, Giá trị HĐ, Ngày ký có được ánh xạ hiển thị tự động trên dòng quản lý hợp đồng hay không.
3. Mở Modal tài chính của hợp đồng mới, xem danh sách hóa đơn đã tích hợp có tự hiển thị hay không.
4. Thử thêm nhiều đợt tạm ứng, kiểm tra tính toán tổng tiền tạm ứng và đợt tạm ứng hiển thị trong danh sách lịch sử.
5. Thử xóa hợp đồng và kiểm tra trên Google Drive xem thư mục con của hợp đồng đó đã được xóa đồng thời hay chưa.
6. Xem giao diện tên file dài của hợp đồng xem đã tự xuống dòng đẹp mắt chưa.
