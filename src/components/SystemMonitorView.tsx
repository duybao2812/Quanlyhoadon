import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  Database, 
  RefreshCw, 
  AlertTriangle, 
  HardDrive, 
  TrendingUp, 
  ShieldAlert,
  Server,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from './Notifications';
import { formatVNNumber } from '../lib/utils';

interface UsageData {
  total_bytes: number;
  total_mb: number;
  usage_percentage: number;
}

interface TableDetail {
  table_name: string;
  estimated_rows: number;
  data_size_mb: number;
  index_size_mb: number;
  total_size_mb: number;
}

export const SystemMonitorView = () => {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [tables, setTables] = useState<TableDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof TableDetail; direction: 'asc' | 'desc' }>({
    key: 'total_size_mb',
    direction: 'desc'
  });
  
  const { toast } = useToast();

  const fetchData = useCallback(async (showSilent = false) => {
    if (!showSilent) setIsLoading(true);
    try {
      // 1. Lấy dữ liệu dung lượng tổng quan
      const { data: usageData, error: usageError } = await supabase.rpc('get_supabase_usage');
      if (usageError) throw usageError;
      if (usageData && usageData.length > 0) {
        setUsage(usageData[0]);
      }

      // 2. Lấy dữ liệu chi tiết từng bảng
      const { data: tableData, error: tableError } = await supabase.rpc('get_table_storage_details');
      if (tableError) throw tableError;
      if (tableData) {
        setTables(tableData);
      }
      
      if (showSilent) {
        toast("Đã làm mới dữ liệu hệ thống thành công!", "success");
      }
    } catch (err: any) {
      console.error("Lỗi khi tải dữ liệu giám sát hệ thống:", err);
      toast("Lỗi tải thông tin giám sát: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (key: keyof TableDetail) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTables = React.useMemo(() => {
    const sortable = [...tables];
    sortable.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      if (typeof valA === 'string') {
        return sortConfig.direction === 'asc' 
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      } else {
        return sortConfig.direction === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });
    return sortable;
  }, [tables, sortConfig]);

  const getProgressColorClass = (percentage: number) => {
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getSystemStatus = (percentage: number) => {
    if (percentage > 90) return { label: 'Cực kỳ Nguy hiểm', color: 'text-red-500', desc: 'Dung lượng sắp đầy, một số tính năng ghi dữ liệu và AI sẽ bị chặn để bảo vệ hệ thống.' };
    if (percentage > 80) return { label: 'Cảnh báo', color: 'text-amber-500', desc: 'Dung lượng sắp vượt ngưỡng an toàn. Vui lòng dọn dẹp các tệp tin hoặc hóa đơn cũ.' };
    return { label: 'Hoạt động Tốt', color: 'text-emerald-500', desc: 'Dung lượng hệ thống trong ngưỡng an toàn cực kỳ ổn định.' };
  };

  return (
    <div className="space-y-6 text-white pb-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-sidebar-dark p-6 rounded-3xl border border-border-dark shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 text-primary">
            <Server className="size-8 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Giám sát và Theo dõi Hệ thống</h2>
            <p className="text-xs text-text-dim mt-1">Quản lý hiệu năng, dung lượng lưu trữ database Supabase (Hạn mức Free 500MB)</p>
          </div>
        </div>
        <button 
          onClick={() => fetchData(true)} 
          disabled={isLoading}
          className="btn-primary py-3 px-5 flex items-center gap-2"
        >
          <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {isLoading && !usage ? (
        <div className="card p-12 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="size-10 text-primary animate-spin" />
          <span className="text-sm font-semibold text-text-dim">Đang thu thập thông tin lưu trữ từ Supabase...</span>
        </div>
      ) : (
        <>
          {/* Overview Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Storage Progress Card */}
            <div className="card p-6 md:col-span-2 space-y-6 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">Dung lượng đĩa tổng quan</span>
                  <div className="text-2xl font-black flex items-baseline gap-1 mt-1">
                    <span>{usage ? usage.total_mb.toFixed(2) : '0.00'}</span>
                    <span className="text-xs font-bold text-text-dim">MB</span>
                    <span className="text-text-dim mx-2">/</span>
                    <span>500.00</span>
                    <span className="text-xs font-bold text-text-dim">MB</span>
                  </div>
                </div>
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                  <HardDrive className="size-5" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-text-dim">Đã sử dụng</span>
                  <span className={usage && usage.usage_percentage > 80 ? (usage.usage_percentage > 90 ? 'text-red-500 font-extrabold animate-pulse' : 'text-amber-500 font-extrabold') : 'text-emerald-500'}>
                    {usage ? usage.usage_percentage.toFixed(2) : '0.00'}%
                  </span>
                </div>
                <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(usage ? usage.usage_percentage : 0, 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${getProgressColorClass(usage ? usage.usage_percentage : 0)}`}
                  />
                </div>
              </div>
            </div>

            {/* System Status Card */}
            <div className="card p-6 flex flex-col justify-between min-h-[220px] relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">Trạng thái hệ thống</span>
                  {usage && (
                    <div className={`text-xl font-black ${getSystemStatus(usage.usage_percentage).color} flex items-center gap-1.5 mt-1`}>
                      {usage.usage_percentage > 80 ? (
                        usage.usage_percentage > 90 ? <ShieldAlert className="size-5 animate-pulse" /> : <AlertTriangle className="size-5" />
                      ) : (
                        <Database className="size-5" />
                      )}
                      <span>{getSystemStatus(usage.usage_percentage).label}</span>
                    </div>
                  )}
                </div>
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                  <TrendingUp className="size-5" />
                </div>
              </div>
              
              <p className="text-xs text-text-dim font-medium leading-relaxed mt-4">
                {usage ? getSystemStatus(usage.usage_percentage).desc : ''}
              </p>
            </div>
          </div>

          {/* Table Usage Details */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              <h3 className="text-md font-black uppercase tracking-tight">Chi tiết dung lượng từng bảng</h3>
            </div>
            
            <div className="overflow-x-auto rounded-2xl border border-border-dark">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-sidebar-dark text-text-dim text-[10px] uppercase font-black tracking-widest border-b border-border-dark">
                    <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('table_name')}>
                      <div className="flex items-center gap-1">Tên bảng <ArrowUpDown className="size-3" /></div>
                    </th>
                    <th className="p-4 text-right cursor-pointer hover:text-white" onClick={() => handleSort('estimated_rows')}>
                      <div className="flex items-center justify-end gap-1">Số dòng dự tính <ArrowUpDown className="size-3" /></div>
                    </th>
                    <th className="p-4 text-right cursor-pointer hover:text-white" onClick={() => handleSort('data_size_mb')}>
                      <div className="flex items-center justify-end gap-1">Dung lượng dữ liệu <ArrowUpDown className="size-3" /></div>
                    </th>
                    <th className="p-4 text-right cursor-pointer hover:text-white" onClick={() => handleSort('index_size_mb')}>
                      <div className="flex items-center justify-end gap-1">Dung lượng Index <ArrowUpDown className="size-3" /></div>
                    </th>
                    <th className="p-4 text-right cursor-pointer hover:text-white" onClick={() => handleSort('total_size_mb')}>
                      <div className="flex items-center justify-end gap-1">Tổng dung lượng <ArrowUpDown className="size-3" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark font-medium">
                  {sortedTables.map((t) => (
                    <tr key={t.table_name} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4 text-white font-bold group-hover:text-primary transition-colors">{t.table_name}</td>
                      <td className="p-4 text-right text-text-dim">{formatVNNumber(t.estimated_rows)}</td>
                      <td className="p-4 text-right text-text-dim">{t.data_size_mb.toFixed(2)} MB</td>
                      <td className="p-4 text-right text-text-dim">{t.index_size_mb.toFixed(2)} MB</td>
                      <td className="p-4 text-right text-white font-bold">{t.total_size_mb.toFixed(2)} MB</td>
                    </tr>
                  ))}
                  {sortedTables.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-text-dim">Không có dữ liệu thống kê</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
