import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Users,
  Files,
  Search,
  Database,
  Cpu,
  ChevronLeft,
  ChevronRight,
  X,
  PlusSquare,
  Landmark,
  FolderArchive,
  Zap,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useToast } from './Notifications';
import { Tab } from '../types/appTypes';

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

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  user: User | null;
  isPinned: boolean;
  setIsPinned: (v: boolean) => void;
  onOpenQuotation?: () => void;
  isQuotationOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  user,
  isPinned,
  setIsPinned,
  onOpenQuotation,
  isQuotationOpen
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const isExpanded = isPinned || isHovered;

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        if (!isPinned && isHovered) {
          setIsHovered(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPinned, isHovered]);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Bảng điều khiển' },
    { id: 'upload', icon: UploadCloud, label: 'Tải lên hóa đơn' },
    { id: 'partners', icon: Users, label: 'Đối tác' },
    { id: 'contract', icon: PlusSquare, label: 'Tạo hợp đồng' },
    { id: 'contract_upload', icon: UploadCloud, label: 'Tải lên hợp đồng' },
    { id: 'docs', icon: Files, label: 'Tài liệu đã tạo' },
    { id: 'tax-lookup', icon: Search, label: 'Tra cứu thuế' },
    { id: 'transactions', icon: Landmark, label: 'Giao dịch ngân hàng' },
    { id: 'system', icon: Database, label: 'Theo dõi hệ thống' },
    { id: 'agent-hub', icon: Cpu, label: 'Cấu hình Agent Hub' },
    { id: 'dossier', icon: FolderArchive, label: 'Hồ sơ' },
  ];

  const { toast } = useToast();

  const handleLogin = async () => {
    if (isIframeMode()) {
      window.location.reload();
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      console.log("[DEBUG] Attempting Google Sign-In with Popup...");
      await signInWithPopup(auth, provider);
      console.log("[DEBUG] Google Popup Sign-In successful!");
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        console.warn("[DEBUG] Popup blocked or cancelled. Falling back to Redirect...");
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectErr: any) {
          console.error("[DEBUG] Google Redirect Sign-In error:", redirectErr);
          toast(`Lỗi đăng nhập: ${redirectErr.message}`, "error");
        }
      } else {
        console.error("[DEBUG] Google Popup Sign-In error:", error);
        toast(`Lỗi đăng nhập: ${error.message}`, "error");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <motion.aside
      ref={sidebarRef}
      animate={{ width: isExpanded ? 256 : 80 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onMouseEnter={() => !isPinned && setIsHovered(true)}
      onMouseLeave={() => !isPinned && setIsHovered(false)}
      className="hidden md:flex bg-sidebar-dark text-text-dim flex-col h-full shrink-0 relative z-50 shadow-2xl transition-width duration-150 border-r border-border-dark"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsPinned(!isPinned);
        }}
        className="absolute -right-3 top-20 size-6 bg-primary text-white rounded-full flex items-center justify-center shadow-lg z-10 hover:bg-primary-hover hover:scale-110 active:scale-90 transition-all cursor-pointer"
      >
        {isPinned ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
      </button>

      <div className={cn(
        "border-b border-border-dark flex items-center transition-all duration-300",
        !isExpanded ? "p-4 justify-center" : "p-6 justify-between"
      )}>
        <div className="flex items-center gap-3 overflow-hidden shrink-0">
          <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black text-xl shadow-inner border border-primary/20 shrink-0 aspect-square">AX</div>
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-black text-white tracking-tighter text-xl whitespace-nowrap"
            >
              DocuForge AI
            </motion.span>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => {
          const isItemActive = activeTab === item.id || 
            (item.id === 'contract' && (activeTab === 'quick-contract' || activeTab === 'quotation'));
          
          return (
            <div key={item.id} className="relative group/item">
              <button
                onClick={() => setActiveTab(item.id as Tab)}
                className={cn(
                  "sidebar-link w-full flex items-center transition-all duration-200 relative",
                  !isExpanded ? "justify-center p-3" : "justify-start p-3",
                  isItemActive && "sidebar-link-active"
                )}
              >
                {isItemActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon className={cn("size-5 shrink-0 transition-transform", isItemActive && "scale-110")} />
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="ml-3 font-bold text-base whitespace-nowrap tracking-tight"
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>

            {item.id === 'contract' && isExpanded && (
              <div className="pl-8 pr-2 mt-1 space-y-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('quick-contract');
                  }}
                  className={cn(
                    "w-full text-left py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border",
                    activeTab === 'quick-contract'
                      ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                      : "bg-transparent text-text-dim hover:text-white hover:bg-white/5 border-transparent"
                  )}
                >
                  <Zap size={10} className="text-blue-400" />
                  Tạo hợp đồng nhanh
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenQuotation?.();
                  }}
                  className={cn(
                    "w-full text-left py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border",
                    isQuotationOpen
                      ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                      : "bg-transparent text-text-dim hover:text-white hover:bg-white/5 border-transparent"
                  )}
                >
                  <FileText size={10} className={isQuotationOpen ? "text-blue-400" : "text-text-dim"} />
                  Tạo báo giá
                </button>
              </div>
            )}

            {/* Tooltip or Popover when collapsed */}
            {!isExpanded && (
              item.id === 'contract' ? (
                <div className="absolute left-full top-0 ml-4 p-2 bg-card-dark text-white rounded-xl shadow-2xl opacity-0 group-hover/item:opacity-100 pointer-events-none group-hover/item:pointer-events-auto transition-all duration-200 translate-x-2 group-hover/item:translate-x-0 z-[100] border border-border-dark flex flex-col gap-1 min-w-[160px]">
                  <div className="px-2 py-1 text-[9px] font-black text-text-dim border-b border-border-dark/40 uppercase tracking-widest">Tạo hợp đồng</div>
                  <button
                    onClick={() => setActiveTab('contract')}
                    className={cn(
                      "w-full text-left py-1.5 px-2 rounded-lg text-xs font-bold transition-all",
                      activeTab === 'contract' ? "bg-primary/20 text-primary" : "hover:bg-white/5 text-text-dim hover:text-white"
                    )}
                  >
                    Soạn thảo chi tiết
                  </button>
                  <button
                    onClick={() => setActiveTab('quick-contract')}
                    className={cn(
                      "w-full text-left py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                      activeTab === 'quick-contract' ? "bg-blue-600/10 text-blue-400" : "hover:bg-white/5 text-text-dim hover:text-white"
                    )}
                  >
                    <Zap size={11} className="text-blue-400" />
                    Tạo hợp đồng nhanh
                  </button>
                  <button
                    onClick={() => {
                      onOpenQuotation?.();
                    }}
                    className={cn(
                      "w-full text-left py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                      isQuotationOpen ? "bg-blue-600/10 text-blue-400" : "hover:bg-white/5 text-text-dim hover:text-white"
                    )}
                  >
                    <FileText size={11} className={isQuotationOpen ? "text-blue-400" : "text-text-dim"} />
                    Tạo báo giá
                  </button>
                  <div className="absolute top-4 -left-1 size-2 bg-card-dark rotate-45 border-l border-b border-border-dark" />
                </div>
              ) : (
                <div className="absolute left-full ml-4 px-3 py-2 bg-card-dark text-white text-xs font-black rounded-xl shadow-2xl opacity-0 group-hover/item:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/item:translate-x-0 z-[100] whitespace-nowrap border border-border-dark uppercase tracking-widest">
                  {item.label}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 size-2 bg-card-dark rotate-45 border-l border-b border-border-dark" />
                </div>
              )
            )}
          </div>
        )})}
      </nav>

      <div className={cn(
        "border-t border-border-dark transition-all duration-300",
        !isExpanded ? "p-2 flex flex-col items-center" : "p-4"
      )}>
        {user ? (
          <div className={cn(
            "flex items-center gap-3 mb-4 rounded-2xl bg-white/5 transition-all duration-300",
            !isExpanded ? "flex-col p-1" : "flex-row p-2"
          )}>
            <div className="relative group/avatar">
              <img
                src={user.photoURL || ''}
                alt=""
                className="size-10 rounded-xl border border-border-dark hover:border-primary transition-all cursor-pointer shadow-lg shrink-0 object-cover aspect-square"
                referrerPolicy="no-referrer"
              />
              {!isExpanded && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-sidebar-dark text-white text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover/avatar:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/avatar:translate-x-0 z-[100] whitespace-nowrap border border-border-dark">
                  {user.displayName}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 size-2 bg-sidebar-dark rotate-45 border-l border-b border-border-dark" />
                </div>
              )}
            </div>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 min-w-0"
              >
                <div className="text-xs font-bold text-white truncate">{user.displayName}</div>
                <button onClick={handleLogout} className="text-[10px] text-text-dim hover:text-red-400 font-bold uppercase transition-colors">Đăng xuất</button>
              </motion.div>
            )}
            {!isExpanded && (
              <button onClick={handleLogout} className="p-2 hover:text-red-400 text-text-dim transition-colors" title="Đăng xuất">
                <X className="size-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative group/login">
            <button
              onClick={handleLogin}
              className={cn(
                "w-full bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20 transition-all mb-4 flex items-center justify-center shadow-lg active:scale-95",
                !isExpanded ? "p-3" : "py-3 px-4"
              )}
            >
              <Users className="size-5 shrink-0" />
              {isExpanded && <span className="ml-2">Đăng nhập</span>}
            </button>
            {isExpanded && (
              <p className="text-[9px] text-text-dim text-center px-1 mb-4 leading-normal opacity-50 select-none">
                *Nếu gặp lỗi, vui lòng cho phép cửa sổ bật lên (Popups) trên trình duyệt.
              </p>
            )}
            {!isExpanded && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-sidebar-dark text-white text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover/login:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/login:translate-x-0 z-[100] whitespace-nowrap border border-border-dark">
                Đăng nhập Google
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 size-2 bg-sidebar-dark rotate-45 border-l border-b border-border-dark" />
              </div>
            )}
          </div>
        )}

        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2"
          >
            <div className="text-[10px] text-text-dim uppercase font-bold mb-2 tracking-widest px-1">Hệ thống</div>
            <div className="flex items-center gap-2 text-xs text-white bg-sidebar-dark p-2 rounded-lg border border-border-dark">
              <div className={cn("size-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]", user ? "bg-green-500" : "bg-yellow-500")}></div>
              <span>{user ? "AI: Sẵn sàng" : "Đang chờ user"}</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.aside>
  );
};
