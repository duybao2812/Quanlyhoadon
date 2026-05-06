import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove unless loading
    if (type !== 'loading') {
      setTimeout(() => removeToast(id), 3000);
    }
    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast, removeToast, clearToasts }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={cn(
                "pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md",
                t.type === 'success' && "bg-emerald-500/90 border-emerald-400 text-white",
                t.type === 'error' && "bg-rose-500/90 border-rose-400 text-white",
                t.type === 'loading' && "bg-indigo-600/90 border-indigo-500 text-white",
                t.type === 'info' && "bg-slate-800/90 border-slate-700 text-white"
              )}
            >
              <div className="flex items-center gap-3">
                {t.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                {t.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
                {t.type === 'info' && <Info className="w-5 h-5 shrink-0" />}
                {t.type === 'loading' && <Loader2 className="w-5 h-5 animate-spin shrink-0" />}
                <p className="text-sm font-semibold leading-snug">{t.message}</p>
              </div>
              <button 
                onClick={() => removeToast(t.id)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
