 # Task: Thiết kế giao diện Tạo Hợp Đồng dạng Word Document & Inline Fields
 
 ## Danh sách công việc
 
 - `[ ]` Bước 1: Nghiên cứu các tag và cấu trúc của 4 mẫu văn bản (HDNT, HDTC, HDCM, GDNTT) trong App.tsx
 - `[ ]` Bước 2: Thiết kế component `InlineField` hỗ trợ co giãn chiều rộng tự động và hiển thị trực tiếp trên dòng chữ
 - `[ ]` Bước 3: Thiết kế lại bảng đề nghị tạm ứng/thanh toán `GDNTableInput` theo phong cách Word trắng cổ điển
 - `[ ]` Bước 4: Tái cấu trúc giao diện `ContractView` cột phải: Mô phỏng tờ giấy A4 trắng (`bg-white`), căn lề, viền bóng đổ, font chữ Serif trang trọng
 - `[ ]` Bước 5: Cấu trúc hóa nội dung chi tiết dạng văn bản hành chính cho mẫu `GDNTT` (Giấy đề nghị thanh toán/tạm ứng)
 - `[ ]` Bước 6: Cấu trúc hóa nội dung chi tiết dạng hợp đồng thương mại cho các mẫu còn lại (`HDNT`, `HDTC`, `HDCM`)
 - `[ ]` Bước 7: Thực hiện liên kết dữ liệu hai chiều (Two-way Data Binding) giữa các InlineField với state `formData` của hệ thống
 - `[ ]` Bước 8: Kiểm tra hoạt động của nút Xuất Hợp Đồng (.docx) và chức năng Tự động bóc tách từ hóa đơn
 - `[ ]` Bước 9: Chạy `npm run build` để kiểm tra lỗi biên dịch và xác minh hệ thống hoạt động hoàn hảo
 