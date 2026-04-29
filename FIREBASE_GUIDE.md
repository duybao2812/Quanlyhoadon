# HƯỚNG DẪN LẤY THÔNG SỐ FIREBASE & THIẾT LẬP

Để ứng dụng của bạn hoạt động, bạn cần cấu hình Firebase theo các bước sau:

### 1. Lấy Firebase Config Object
1. Truy cập [Firebase Console](https://console.firebase.google.com/).
2. Chọn dự án của bạn (hoặc tạo mới).
3. Nhấp vào biểu tượng **Răng cưa (Project Settings)** ở menu bên trái.
4. Cuộn xuống phần **Your apps**. Nếu chưa có app nào, hãy nhấp vào biểu tượng **Web (</>)** để tạo.
5. Sau khi đăng ký app, bạn sẽ thấy đoạn mã `firebaseConfig`. Hãy copy các thông số:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

### 2. Thiết lập Firestore Database
1. Ở menu bên trái, chọn **Build > Firestore Database**.
2. Nhấp vào **Create database**.
3. Chọn vị trí (Location) gần bạn (ví dụ: `asia-southeast1`).
4. Chọn **Start in test mode** để bắt đầu nhanh (Lưu ý: Bạn nên cập nhật Rules sau 30 ngày).

### 3. Thiết lập Firebase Rules (Quan trọng)
Dán đoạn mã sau vào tab **Rules** trong Firestore để đảm bảo bảo mật cơ bản:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /invoices/{invoiceId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
    match /partners/{partnerId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
  }
}
```

### 4. Bật Google Authentication
1. Chọn **Build > Authentication**.
2. Vào tab **Sign-in method**.
3. Nhấp vào **Add new provider** và chọn **Google**.
4. Bật (Enable) và chọn email hỗ trợ dự án. Lưu lại.
