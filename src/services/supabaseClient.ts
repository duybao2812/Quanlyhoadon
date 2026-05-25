import { createClient } from '@supabase/supabase-js';

// Các biến môi trường của Vite bắt buộc phải có tiền tố VITE_
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase URL hoặc Anon Key chưa được cấu hình trong file .env!\n" +
    "Vui lòng thiết lập VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong file .env."
  );
}

// Biến lưu trữ UID người dùng động
let customUserId: string | null = null;

/**
 * Cập nhật động Firebase UID làm header bảo mật gửi kèm sang PostgreSQL RLS
 */
export function setCustomUserId(uid: string | null) {
  customUserId = uid;
}

// Custom Fetch Function để chèn thêm header bảo mật vào từng HTTP request một cách an toàn và năng động
const customFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const newInit = { ...init };
  const headers = new Headers(newInit.headers);
  if (customUserId) {
    headers.set('x-custom-user-id', customUserId);
  }
  newInit.headers = headers;
  return fetch(input, newInit);
};

// Khởi tạo Supabase client dùng chung cho toàn bộ dự án
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    global: {
      fetch: customFetch
    }
  }
);
