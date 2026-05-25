# Tài Liệu Hướng Dẫn: Tính Năng Dòng Mở Rộng Dashboard (Expandable Row)

Tài liệu này cung cấp toàn bộ đặc tả kỹ thuật, cách cấu hình, các sự kiện tiếp cận (accessibility) và hiệu năng dành cho tính năng **Dòng Mở Rộng (Expandable Row)** được cô lập hoàn toàn bên trong tab **Dashboard (Bảng điều khiển)**.

---

## 1. Cấu Trúc Thư Mục & Tệp Tin

Toàn bộ giải pháp được thiết kế tự đóng gói (self-contained) tại thư mục `src/components/Dashboard` để tránh lỗi hồi quy (regression) và bảo vệ an toàn 100% cho các module khác trong hệ thống:

- `DashboardInvoiceList.tsx`: Component quản lý danh sách các hóa đơn, kiểm tra kích thước màn hình để kích hoạt modal fallback, và hiển thị cảnh báo hiệu năng khi danh sách &gt; 200 items.
- `DashboardInvoiceRow.tsx`: Component render dòng tóm tắt và khối chi tiết động bên dưới, hỗ trợ phím di chuyển, nhãn ARIA và tích hợp chỉnh sửa ghi chú cục bộ.
- `DashboardInvoiceModal.tsx`: Hộp thoại modal hiển thị thông tin chi tiết trên các thiết bị di động hẹp.
- `DashboardInvoice.css`: Tập hợp các class CSS tạo hiệu ứng đóng mở mượt mà bằng công nghệ Grid Row GPU-accelerated.
- `demoData.ts`: Danh sách 10 hóa đơn mẫu phong phú bằng tiếng Việt có đính kèm hàng hóa, tệp tin mẫu và ghi chú chi tiết.
- `DashboardDemoPage.tsx`: Sandbox tương tác trực quan để thử nghiệm các cấu hình và thiết bị khác nhau.

---

## 2. Đặc Tả Component & Cấu Hình Local

### A. Component `DashboardInvoiceList`

| Thuộc tính (Prop) | Kiểu Dữ Liệu | Giá Trị Mặc Định | Ý Nghĩa / Cách Sử Dụng |
| :--- | :--- | :--- | :--- |
| `invoices` | `ExtendedInvoiceItem[]` | *(Bắt buộc)* | Danh sách các hóa đơn cần hiển thị. |
| `accordionMode` | `boolean` | `false` | Nếu `true`, khi click mở dòng mới, các dòng đang mở khác sẽ tự động đóng lại. |
| `lazyRender` | `boolean` | `true` | Nếu `true`, phần HTML chi tiết chỉ được render vào DOM khi người dùng nhấp mở dòng. |
| `mobileFallbackThreshold` | `number` | `768` | Ngưỡng chiều rộng màn hình (pixels). Dưới ngưỡng này, hệ thống tự động mở Modal chi tiết thay vì inline. |
| `onDelete` | `(id: string) => void` | *(Bắt buộc)* | Hàm xử lý sự kiện xóa hóa đơn. |
| `onGenerateDoc` | `(inv: ExtendedInvoiceItem) => void` | `undefined` | Hàm kích hoạt việc tạo Biên Bản Đối Chiếu từ dữ liệu hóa đơn. |
| `onUpdate` | `(id: string, data: any) => void` | `undefined` | Hàm lưu trữ/cập nhật thông tin hóa đơn (như thay đổi Ghi chú). |

---

## 3. Khả Năng Tiếp Cận (Accessibility - ARIA)

Component tuân thủ nghiêm ngặt chuẩn **WAI-ARIA** dành cho các nút bấm thu gọn/mở rộng (disclosure controls) và bảo toàn tính dễ tiếp cận đối với các thiết bị đọc màn hình (Screen Readers):

1. **Markup Trực Quan**:
   - Dòng tóm tắt (Trigger) được thiết lập `role="button"` và `tabIndex={0}` để bàn phím có thể Focus bình thường.
   - Thêm thuộc tính `aria-expanded="true | false"` phản ánh chính xác trạng thái mở rộng của dòng theo thời gian thực.
   - Thuộc tính `aria-controls="panel-{invoice.id}"` trỏ chính xác đến `id` của bảng chi tiết.
2. **Hỗ Trợ Bàn Phím**:
   - Khi dòng tóm tắt được focus, người dùng có thể nhấn phím **Space** hoặc **Enter** để đóng/mở dòng nhanh chóng.
   - Luồng Tab (`tabindex` order) được bảo toàn tự nhiên, cho phép người dùng nhấn phím Tab để đi sâu vào các nút bên trong bảng chi tiết (như nút Lưu ghi chú, tải file đính kèm) một cách tuần tự.
3. **Chống Kích Hoạt Nhầm**:
   - Các nút chức năng nằm trên dòng tóm tắt (như nút Xóa) được thiết lập `e.stopPropagation()` để khi nhấn vào chúng, dòng hóa đơn không bị đóng/mở ngoài ý muốn.

---

## 4. Chuyển Động CSS Siêu Mượt (Smooth Animations)

Để đảm bảo hiệu năng tối đa và chuyển động trơn tru 60fps khi thay đổi kích thước từ `0` đến `auto`, chúng tôi áp dụng kỹ thuật **CSS Grid Auto-Row**:

```css
.dashboard-details-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 280ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.dashboard-details-panel.open {
  grid-template-rows: 1fr;
}
```

### An Toàn Với Sức Khỏe Người Dùng:
Hệ thống tự động lắng nghe cấu hình hệ điều hành của người dùng. Nếu người dùng bật tính năng **Giảm chuyển động (Prefers-reduced-motion)**, mọi chuyển động mở rộng và xoay icon chevron sẽ tự động được tắt ngay lập tức:

```css
@media (prefers-reduced-motion: reduce) {
  .dashboard-details-panel {
    transition: none !important;
  }
}
```

---

## 5. Khuyến Nghị Hiệu Năng & Ảo Hóa Cho Danh Sách Lớn (> 200 items)

Khi số lượng hóa đơn vượt quá **200 dòng**, việc vẽ đồng thời hàng trăm DOM Nodes (đặc biệt khi mở rộng nhiều dòng có bảng sản phẩm chi tiết) có thể gây ra hiện tượng giảm khung hình (FPS drop) khi cuộn trang.

### Giải Pháp Đề Xuất (Virtualization):
1. **Nguyên lý hoạt động**: Chỉ vẽ lên màn hình các dòng hóa đơn đang hiển thị trong khung nhìn của trình duyệt (Viewport), các dòng nằm ngoài sẽ bị hủy và tái sử dụng khi cuộn tới.
2. **Khuyên dùng thư viện**:
   - `react-window` (Nhẹ nhàng, hiệu năng cực cao và dễ tích hợp).
   - `react-virtualized` (Đầy đủ chức năng hơn cho các bảng phức tạp).
3. **Mã nguồn tích hợp ảo hóa mẫu**:
   ```tsx
   import { FixedSizeList as List } from 'react-window';

   const VirtualizedList = ({ invoices, rowHeight = 70 }) => (
     <List
       height={600}
       itemCount={invoices.length}
       itemSize={rowHeight}
       width="100%"
     >
       {({ index, style }) => (
         <div style={style}>
           <DashboardInvoiceRow invoice={invoices[index]} />
         </div>
       )}
     </List>
   );
   ```
