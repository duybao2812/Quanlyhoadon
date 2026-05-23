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

// Khởi tạo Supabase client dùng chung cho toàn bộ dự án
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
