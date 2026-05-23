import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const isElectron = (): boolean => {
  // Kiểm tra thông qua contextBridge đã cung cấp
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return true;
  }
  // Fallback kiểm tra qua userAgent
  return typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatVNNumber = (num: number | string | undefined) => {
  if (num === undefined || num === null || num === '') return '0';
  const n = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  if (isNaN(n)) return '0';
  return new Intl.NumberFormat('vi-VN').format(n);
};
