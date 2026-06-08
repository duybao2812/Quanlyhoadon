import { createClient } from '@supabase/supabase-js';

// Safe check for iframe/wallpaper environment that won't throw cross-origin errors
const isIframeMode = () => {
  try {
    return window.self !== window.top || 
           window.location.search.includes('wallpaper=true') ||
           window.location.search.includes('we=true') ||
           (window as any).wallpaperRequestResources !== undefined ||
           (window as any).wallpaperRegisterAudioListener !== undefined ||
           (window as any).wallpaperPropertyListener !== undefined ||
           (navigator.userAgent && navigator.userAgent.includes('WallpaperEngine'));
  } catch (e) {
    return true; // Cross-origin SecurityError means we are definitely inside an iframe
  }
};

// Các biến môi trường của Vite bắt buộc phải có tiền tố VITE_
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;

// Dung SERVICE_ROLE_KEY cho Wallpaper Engine de doc/ghi thong suot khong can RLS
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93Y3ByaWFicm1rZnVidXVsbXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA5NjA0NywiZXhwIjoyMDk0NjcyMDQ3fQ.02WFY00ZwneaO2vj1K13O2PKxSATwBddE53PKaMRZbM";
const supabaseAnonKey = isIframeMode() ? serviceRoleKey : ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY);

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
