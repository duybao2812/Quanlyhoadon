import React, { useState } from 'react';
import {
  Users,
  Search,
  MapPin,
  Plus,
  Edit2,
  Building2,
  CreditCard,
  UserCheck,
  Hash,
  History,
  User as UserIcon,
  Edit3,
  Trash2,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { smartConvertAddress } from '../../lib/addressConverter';
import { cn } from '../../lib/utils';
import { useToast } from '../Notifications';
import { Partner } from '../../types/appTypes';
import { supabase } from '../../services/supabaseClient';

interface PartnersViewProps {
  partners: Partner[];
  onEdit: (p: Partner) => void;
  onBatchEdit: () => void;
  onDelete: (id: string) => void;
}

export const PartnersView: React.FC<PartnersViewProps> = ({
  partners,
  onEdit,
  onBatchEdit,
  onDelete
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddressTool, setShowAddressTool] = useState(false);
  const [convInput, setConvInput] = useState('');
  const [convResult, setConvResult] = useState<any>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; partner: Partner | null } | null>(null);

  const filteredPartners = partners.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.taxCode.includes(searchTerm) ||
    (p.representative && p.representative.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleContextMenu = (e: React.MouseEvent, partner: Partner) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, partner });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleConvert = (val: string) => {
    setConvInput(val);
    if (val.trim().length > 5) {
      setConvResult(smartConvertAddress(val));
    } else {
      setConvResult(null);
    }
  };

  return (
    <div className="space-y-6" onClick={closeContextMenu}>
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center bg-card-dark p-4 sm:p-5 rounded-xl border border-border-dark shadow-2xl gap-4">
        <div className="flex items-center gap-3 sm:gap-4 select-none">
          <div className="size-8 sm:size-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
            <Users className="size-4 sm:size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-black text-white tracking-tighter uppercase">Đối tác & Khách hàng</h2>
            <div className="text-[8px] sm:text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mt-0.5 sm:mt-1">
              {partners.length} Công ty liên kết
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative w-full sm:w-72 group">
            <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-primary transition-all" />
            <input
              type="text"
              placeholder="Tìm kiếm đối tác..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-2.5 bg-sidebar-dark border border-border-dark rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all w-full text-white placeholder:text-text-dim shadow-inner"
            />
          </div>
          <div className="hidden sm:block w-px h-8 bg-border-dark" />
          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto lg:flex lg:w-auto lg:gap-3 items-center shrink-0">
            <button
              type="button"
              onClick={() => setShowAddressTool(!showAddressTool)}
              className={cn(
                "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-2 sm:px-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all border shadow-sm cursor-pointer select-none active:scale-95 touch-none",
                showAddressTool
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                  : "bg-white/5 border-border-dark text-text-dim hover:text-white hover:bg-white/10"
              )}
            >
              <MapPin className="size-3.5 sm:size-4 shrink-0" />
              <span className="truncate">AI Address</span>
            </button>
            <button
              type="button"
              onClick={() => onEdit({ id: 'new', name: '', taxCode: '', address: '' })}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-2 sm:px-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-xs font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-white transition-all border border-primary/10 shadow-sm cursor-pointer select-none active:scale-95 touch-none"
            >
              <Plus className="size-3.5 sm:size-4 shrink-0" />
              <span className="truncate">THÊM MỚI</span>
            </button>
            <button
              type="button"
              onClick={onBatchEdit}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-2 sm:px-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-xs font-black uppercase tracking-wider bg-white/5 border border-border-dark hover:bg-white/10 text-white transition-all shadow-sm cursor-pointer select-none active:scale-95 touch-none"
            >
              <Edit2 className="size-3.5 sm:size-4 shrink-0" />
              <span className="truncate">CHỈNH SỬA</span>
            </button>
          </div>
        </div>
      </div>

      {/* Address Converter Tool - 3 Parts Output */}
      <AnimatePresence>
        {showAddressTool && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-8 bg-sidebar-dark border-border-dark shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 size-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <MapPin className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-widest">Chuyển đổi địa chỉ 2 cấp</h3>
                    <p className="text-text-dim text-[10px] font-bold uppercase tracking-widest mt-1">Chuẩn hóa dữ liệu theo nghị định mới nhất 2025</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-text-dim uppercase tracking-widest px-1">Nhập địa chỉ cần phân tách</div>
                  <textarea
                    value={convInput}
                    onChange={(e) => handleConvert(e.target.value)}
                    placeholder="Ví dụ: Ấp 5, Phạm Văn Hai, Bình Chánh, TP.HCM..."
                    className="w-full px-4 py-4 bg-white/5 border border-border-dark rounded-xl text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all min-h-[120px] resize-none text-white"
                  />
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-black text-text-dim uppercase tracking-widest px-1">Phân tách thông minh (Real-time)</div>
                  {convResult ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 border border-border-dark rounded-2xl">
                          <div className="text-[9px] font-bold text-text-dim uppercase mb-2">1. Xã/Phường gốc</div>
                          <div className="text-sm font-black text-white">{convResult.oldWard}</div>
                        </div>
                        <div className="p-4 bg-white/5 border border-border-dark rounded-2xl">
                          <div className="text-[9px] font-bold text-text-dim uppercase mb-2">2. Địa chỉ cũ (3 cấp)</div>
                          <div className="text-xs font-bold text-text-dim leading-relaxed">
                            {convResult.oldFullAddress || `${convResult.detail ? convResult.detail + ', ' : ''}${convResult.oldWard}, ${convResult.oldDistrict}, ${convResult.province}`}
                          </div>
                        </div>
                      </div>

                      <div className="p-5 bg-orange-500/5 border border-orange-500/20 rounded-2xl shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <CheckCircle2 className="size-16 text-orange-500" />
                        </div>
                        <div className="text-[9px] font-black text-orange-500 uppercase mb-2 tracking-widest">3. Kết quả đã chuyển đổi (Sang 2 cấp)</div>
                        <div className="text-base font-black text-white mb-3 leading-relaxed">{convResult.fullAddress}</div>
                        <div className="flex gap-2">
                          <div className={cn(
                            "rounded px-2 py-1 text-[10px] font-bold border uppercase tracking-tighter",
                            convResult.isConverted ? "bg-primary/20 text-primary border-primary/30" : "bg-white/5 text-text-dim border-border-dark"
                          )}>
                            {convResult.isConverted ? "Khớp bảng ánh xạ 2025" : "Chưa có dữ liệu chính xác"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 border-2 border-dashed border-border-dark rounded-2xl flex flex-col items-center justify-center text-text-dim gap-2">
                      <MapPin className="size-8 opacity-20" />
                      <div className="text-xs font-bold uppercase tracking-widest opacity-40">Chờ nhập dữ liệu…</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Partners Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPartners.length === 0 ? (
          <div className="p-12 text-center bg-card-dark/40 border border-border-dark rounded-3xl opacity-40 col-span-full py-24 flex flex-col items-center justify-center gap-3">
            <Users className="size-12 text-white" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Chưa có dữ liệu đối tác</p>
          </div>
        ) : (
          filteredPartners.map((partner) => (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onEdit(partner)}
              onContextMenu={(e) => handleContextMenu(e, partner)}
              className="p-6 rounded-[32px] bg-card-dark border border-white/10 hover:border-primary/50 transition-all duration-300 flex flex-col gap-4 shadow-xl active:scale-[0.98] cursor-pointer group relative overflow-hidden h-full justify-between"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10 flex flex-col gap-3.5 h-full justify-between">
                {/* Top Row: Logo, Name, Tax Code & Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-12 rounded-[18px] bg-primary/10 text-primary font-black text-lg flex items-center justify-center border border-primary/20 shrink-0 uppercase shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                      {partner.name ? partner.name.charAt(0) : '?'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white group-hover:text-primary transition-colors text-sm sm:text-base tracking-tight leading-snug truncate">
                        {partner.name || '---'}
                      </h3>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-lg mt-1 group-hover:border-primary/20">
                        <Hash className="size-2.5 text-primary/60" />
                        <span className="text-[9px] font-black text-text-dim uppercase tracking-wider">MST: {partner.taxCode || '---'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEdit(partner); }}
                      className="size-8 bg-white/5 border border-white/10 text-text-dim rounded-xl flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all shadow-md active:scale-90"
                    >
                      <Edit3 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (confirm(`Bạn có chắc chắn muốn xóa đối tác "${partner.name}"?`)) {
                          onDelete(partner.id);
                        }
                      }}
                      className="size-8 bg-red-500/5 border border-red-500/10 text-text-dim rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-md active:scale-90"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Middle Row: Representative and Bank Info */}
                <div className="grid grid-cols-2 gap-3.5 py-3 border-y border-white/5">
                  {/* Representative */}
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-text-dim uppercase tracking-widest block">Đại diện</span>
                    <div className="flex items-center gap-1.5">
                      <div className="size-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <UserIcon className="size-3 text-text-dim" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-bold text-xs truncate">
                          {(() => {
                            const g = partner.gender?.toLowerCase();
                            if (g === 'nam' || g === 'm' || g === 'male' || g === 'ông') return 'Ông ';
                            if (g === 'nữ' || g === 'f' || g === 'female' || g === 'bà') return 'Bà ';
                            return '';
                          })()}{partner.representative || '---'}
                        </div>
                        <div className="text-[8px] text-text-dim uppercase font-black truncate">{partner.position || 'Giám đốc'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-text-dim uppercase tracking-widest block">Tài khoản</span>
                    <div className="min-w-0">
                      <div className="text-white font-bold text-xs truncate flex items-center gap-1">
                        <CreditCard className="size-3 text-primary/60 shrink-0" />
                        {partner.accountNumber || '---'}
                      </div>
                      <div className="text-[8px] text-text-dim uppercase font-black truncate pl-4">{partner.bankName || '---'}</div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Contact Info & Map Pin Address */}
                <div className="space-y-2.5 mt-1">
                  <div className="flex gap-2 items-start">
                    <History className="size-3.5 text-text-dim shrink-0 mt-0.5" />
                    <div className="text-[11px] font-bold text-text-dim leading-relaxed">
                      <span className="text-[8px] font-black text-primary/40 uppercase block tracking-widest">Địa chỉ gốc</span>
                      <span className="line-clamp-2">{partner.address || '---'}</span>
                    </div>
                  </div>
                  {partner.addressPostMerger && (
                    <div className="flex gap-2 items-start p-2.5 bg-primary/5 rounded-xl border border-primary/20">
                      <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="text-[11px] font-black text-primary leading-relaxed">
                        <span className="text-[8px] font-black text-primary/60 uppercase block tracking-widest">Địa chỉ mới (2025)</span>
                        <span className="line-clamp-2">{partner.addressPostMerger}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Context Menu Thật sự */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[9999] bg-card-dark border border-border-dark shadow-2xl rounded-xl py-2 w-44 overflow-hidden"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 border-b border-border-dark mb-1">
              <div className="text-[9px] font-bold text-text-dim uppercase truncate" title={contextMenu.partner?.name}>
                {contextMenu.partner?.name}
              </div>
            </div>
            <button
              onClick={() => {
                if (contextMenu.partner) onEdit(contextMenu.partner);
                closeContextMenu();
              }}
              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-primary/20 hover:text-primary flex items-center gap-3 transition-colors font-medium"
            >
              <Edit2 className="size-4" />
              Chỉnh sửa
            </button>
            <button
              onClick={() => {
                if (contextMenu.partner) {
                  if (confirm(`Bạn có chắc chắn muốn xóa đối tác "${contextMenu.partner.name}"?`)) {
                    onDelete(contextMenu.partner.id);
                  }
                }
                closeContextMenu();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-3 transition-colors font-medium"
            >
              <Trash2 className="size-4" />
              Xóa đối tác
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
