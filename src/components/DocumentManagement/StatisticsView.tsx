import { useState, useEffect } from 'react';
import { BarChart3, Download, Upload, FolderArchive, Calendar, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useToast } from '../Notifications';
import { DocumentStatistics } from '../../types/documentTypes';

interface StatisticsViewProps {
  ownerId: string;
}

export function StatisticsView({ ownerId }: StatisticsViewProps) {
  const { toast } = useToast();
  const [stats, setStats] = useState<DocumentStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, [ownerId]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/statistics/documents', {
        headers: { 'x-custom-user-id': ownerId }
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast('Không thể tải thống kê', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="size-7 text-primary" />
          Thống kê
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-20 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    subtitle 
  }: { 
    title: string; 
    value: number; 
    icon: any; 
    color: string;
    subtitle?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-dim text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value.toLocaleString('vi-VN')}</p>
          {subtitle && (
            <p className="text-text-dim text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          'size-12 rounded-xl flex items-center justify-center',
          color === 'blue' && 'bg-blue-500/20 text-blue-400',
          color === 'green' && 'bg-green-500/20 text-green-400',
          color === 'orange' && 'bg-orange-500/20 text-orange-400',
          color === 'purple' && 'bg-purple-500/20 text-purple-400'
        )}>
          <Icon className="size-6" />
        </div>
      </div>
    </motion.div>
  );

  // Prepare chart data
  const maxMonthlyCount = Math.max(
    ...stats.incomingByMonth.map(m => m.count),
    ...stats.outgoingByMonth.map(m => m.count),
    1
  );

  const maxFieldCount = Math.max(
    ...[...stats.incomingByField, ...stats.outgoingByField].map(f => f.count),
    1
  );

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    return `${monthNames[parseInt(m) - 1]}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="size-7 text-primary" />
          Thống kê
        </h1>
        <p className="text-text-dim text-sm mt-1">
          Tổng quan về văn bản và hồ sơ
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng văn bản đến"
          value={stats.totalIncoming}
          icon={Download}
          color="blue"
          subtitle={`${stats.incomingThisMonth} tháng này`}
        />
        <StatCard
          title="Tổng văn bản đi"
          value={stats.totalOutgoing}
          icon={Upload}
          color="green"
          subtitle={`${stats.outgoingThisMonth} tháng này`}
        />
        <StatCard
          title="Tổng hồ sơ"
          value={stats.totalArchives}
          icon={FolderArchive}
          color="orange"
        />
        <StatCard
          title="Văn bản tháng này"
          value={stats.incomingThisMonth + stats.outgoingThisMonth}
          icon={Calendar}
          color="purple"
          subtitle={`${stats.incomingThisMonth} đến + ${stats.outgoingThisMonth} đi`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            Văn bản theo tháng (12 tháng gần nhất)
          </h3>
          <div className="space-y-4">
            {/* Incoming */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-blue-400">Văn bản đến</span>
                <span className="text-text-dim">{stats.incomingByMonth.reduce((a, b) => a + b.count, 0)}</span>
              </div>
              <div className="flex items-end gap-1 h-24">
                {stats.incomingByMonth.map((month, i) => (
                  <div 
                    key={month.month} 
                    className="flex-1 bg-blue-500/20 rounded-t relative group"
                    style={{ height: `${(month.count / maxMonthlyCount) * 100}%`, minHeight: month.count > 0 ? '4px' : '0' }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-card-dark rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-border-dark">
                      <span className="text-blue-400">{month.count}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-1 mt-2">
                {stats.incomingByMonth.map((month) => (
                  <div key={month.month} className="flex-1 text-center text-xs text-text-dim">
                    {formatMonth(month.month)}
                  </div>
                ))}
              </div>
            </div>

            {/* Outgoing */}
            <div className="pt-4 border-t border-border-dark">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-green-400">Văn bản đi</span>
                <span className="text-text-dim">{stats.outgoingByMonth.reduce((a, b) => a + b.count, 0)}</span>
              </div>
              <div className="flex items-end gap-1 h-24">
                {stats.outgoingByMonth.map((month, i) => (
                  <div 
                    key={month.month} 
                    className="flex-1 bg-green-500/20 rounded-t relative group"
                    style={{ height: `${(month.count / maxMonthlyCount) * 100}%`, minHeight: month.count > 0 ? '4px' : '0' }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-card-dark rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-border-dark">
                      <span className="text-green-400">{month.count}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-1 mt-2">
                {stats.outgoingByMonth.map((month) => (
                  <div key={month.month} className="flex-1 text-center text-xs text-text-dim">
                    {formatMonth(month.month)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Field Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">
            Văn bản theo lĩnh vực
          </h3>
          
          {stats.incomingByField.length === 0 && stats.outgoingByField.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-text-dim">
              Chưa có dữ liệu
            </div>
          ) : (
            <div className="space-y-6">
              {/* Incoming by Field */}
              <div>
                <h4 className="text-sm text-blue-400 mb-3">Văn bản đến</h4>
                <div className="space-y-2">
                  {stats.incomingByField.length === 0 ? (
                    <p className="text-text-dim text-sm">Không có dữ liệu</p>
                  ) : (
                    stats.incomingByField.map(item => (
                      <div key={item.field} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-text-dim truncate">{item.field}</span>
                          <span className="text-white font-medium">{item.count}</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(item.count / maxFieldCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Outgoing by Field */}
              <div className="pt-4 border-t border-border-dark">
                <h4 className="text-sm text-green-400 mb-3">Văn bản đi</h4>
                <div className="space-y-2">
                  {stats.outgoingByField.length === 0 ? (
                    <p className="text-text-dim text-sm">Không có dữ liệu</p>
                  ) : (
                    stats.outgoingByField.map(item => (
                      <div key={item.field} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-text-dim truncate">{item.field}</span>
                          <span className="text-white font-medium">{item.count}</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${(item.count / maxFieldCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Legend */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="size-3 bg-blue-500 rounded-full" />
            <span className="text-text-dim">Văn bản đến</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 bg-green-500 rounded-full" />
            <span className="text-text-dim">Văn bản đi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
