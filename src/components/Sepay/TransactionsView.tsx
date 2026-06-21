import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  RefreshCw,
  Link2,
  Link2Off,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Info,
  Check
} from 'lucide-react';
import { useToast } from '../Notifications';

interface SepayAccount {
  id: string;
  owner_id: string;
  bank_name: string;
  account_number: string;
  created_at: string;
}

interface SepayTransaction {
  id: string;
  owner_id: string | null;
  gateway: string;
  transaction_date: string;
  account_number: string;
  sub_account: string | null;
  amount_in: number;
  amount_out: number;
  accumulated: number;
  code: string | null;
  content: string;
  reference_number: string;
  body: string | null;
  matched_invoice_id: string | null;
  match_status: 'matched' | 'unmatched';
  created_at: string;
}

interface TransactionsViewProps {
  ownerId: string;
}

// Định dạng số tiền VND
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

// Định dạng ngày hiển thị
function formatDisplayDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ ownerId }) => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<SepayAccount[]>([]);
  const [transactions, setTransactions] = useState<SepayTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // States cho Form liên kết tài khoản mới
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);

  // Danh sách ngân hàng phổ biến
  const popularBanks = [
    'Vietcombank', 'MBBank', 'Techcombank', 'VietinBank', 
    'BIDV', 'ACB', 'VPBank', 'Sacombank', 'TPBank', 'VIB'
  ];

  // Tải dữ liệu từ backend
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/sepay/status?ownerId=${ownerId}`);
      if (!res.ok) {
        let errMsg = 'Không thể kết nối đến máy chủ.';
        try {
          const errData = await res.json();
          if (errData && (errData.details || errData.error)) {
            errMsg = errData.details || errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      setAccounts(data.accounts || []);
      setTransactions(data.transactions || []);
    } catch (err: any) {
      console.error('[SEPAY] Lỗi tải dữ liệu:', err);
      toast('Lỗi khi tải lịch sử giao dịch: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [ownerId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Làm mới giao dịch thủ công (tải lại DB local)
  const handleRefresh = async () => {
    setIsSyncing(true);
    await fetchData();
    setIsSyncing(false);
    toast('Đã làm mới dữ liệu giao dịch.', 'success');
  };

  // Đăng ký liên kết tài khoản ngân hàng mới
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName || !newAccountNumber.trim()) {
      toast('Vui lòng nhập đầy đủ thông tin tài khoản.', 'error');
      return;
    }

    try {
      setIsSubmittingAccount(true);
      const res = await fetch('/api/sepay/register-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId,
          bankName: newBankName,
          accountNumber: newAccountNumber.trim()
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.details || result.error || 'Đăng ký tài khoản thất bại.');

      toast('Liên kết tài khoản ngân hàng thành công!', 'success');
      setNewAccountNumber('');
      setNewBankName('');
      setShowAddForm(false);
      fetchData();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  // Hủy liên kết tài khoản ngân hàng
  const handleRemoveAccount = async (accountNumber: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn ngắt liên kết số tài khoản ${accountNumber}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/sepay/unregister-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId,
          accountNumber
        })
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.details || result.error || 'Hủy liên kết thất bại.');
      }

      toast('Đã ngắt liên kết tài khoản ngân hàng.', 'info');
      fetchData();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  // Thống kê sơ bộ
  const totalIn = transactions.reduce((sum, tx) => sum + Number(tx.amount_in), 0);
  const totalOut = transactions.reduce((sum, tx) => sum + Number(tx.amount_out), 0);
  const matchedCount = transactions.filter(tx => tx.match_status === 'matched').length;

  return (
    <div className="space-y-6 overflow-y-auto h-full p-2 scroll-smooth max-w-6xl mx-auto">
      
      {/* LOCAL TESTING TUNNEL GUIDE BANNER */}
      <div className="flex items-start gap-4 p-5 bg-[#FF7A00]/10 border border-[#FF7A00]/20 rounded-3xl text-sm relative overflow-hidden backdrop-blur-md shadow-lg">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF7A00]/5 rounded-full blur-2xl" />
        <AlertCircle size={20} className="text-[#FF7A00] shrink-0 mt-0.5" />
        <div className="space-y-1.5 text-white">
          <h4 className="font-bold uppercase tracking-wider text-xs text-[#FF7A00]">Hướng dẫn chạy thử Webhook tại Localhost</h4>
          <p className="text-xs text-text-dim leading-relaxed">
            Vì hệ thống đang chạy ở môi trường cục bộ (localhost:3000), SePay không thể trực tiếp gửi webhook. Bạn hãy thực hiện các bước sau để test:
          </p>
          <ol className="list-decimal list-inside text-xs text-text-dim space-y-1 mt-1 pl-1">
            <li>Mở Terminal và chạy tunnel qua Cloudflare/Ngrok: <code className="bg-black/40 text-[#FF7A00] px-1.5 py-0.5 rounded font-mono">ngrok http 3000</code></li>
            <li>Copy URL công khai được tạo ra (ví dụ: <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">https://abc.ngrok-free.app</code>)</li>
            <li>Truy cập SePay Dashboard, tạo Webhook và dán URL: <code className="bg-black/40 px-1.5 py-0.5 rounded text-white font-mono">https://abc.ngrok-free.app/api/sepay-webhook</code></li>
            <li>Tại tab bảo mật của Webhook, thêm API Key và điền giá trị đó vào biến môi trường <code className="bg-black/40 px-1.5 py-0.5 rounded text-[#FF7A00] font-mono">SEPAY_WEBHOOK_KEY</code> trong tệp <code className="bg-black/40 px-1.5 py-0.5 rounded text-white font-mono">.env</code></li>
            <li>Nhấn nút <strong>"Gửi thử"</strong> trên SePay Dashboard để bắn giao dịch giả lập về máy local và theo dõi kết quả đối soát.</li>
          </ol>
        </div>
      </div>

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-dark pb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary">
            <Landmark size={20} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white uppercase tracking-wider">Giao dịch ngân hàng</h1>
            <p className="text-xs text-text-dim">Nhận biến động số dư tự động qua Webhook SePay</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading || isSyncing}
            className="btn-secondary flex items-center gap-2 text-xs"
          >
            {isSyncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            LÀM MỚI DỮ LIỆU
          </button>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center gap-1.5 text-xs"
          >
            <Plus size={14} />
            LIÊN KẾT TÀI KHOẢN
          </button>
        </div>
      </div>

      {/* ADD ACCOUNT POPUP/FORM */}
      {showAddForm && (
        <form onSubmit={handleAddAccount} className="bg-sidebar-dark/40 border border-border-dark p-5 rounded-3xl space-y-4 shadow-xl">
          <h3 className="text-xs font-black uppercase text-white tracking-widest">Liên kết tài khoản ngân hàng nhận tiền</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-dim uppercase">Ngân hàng</label>
              <select
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-border-dark rounded-xl text-xs focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 text-white"
                required
              >
                <option value="" className="bg-[#1E1E1E]">-- Chọn ngân hàng --</option>
                {popularBanks.map(bank => (
                  <option key={bank} value={bank} className="bg-[#1E1E1E]">{bank}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-dim uppercase">Số tài khoản</label>
              <input
                type="text"
                placeholder="Nhập số tài khoản ngân hàng chính xác..."
                value={newAccountNumber}
                onChange={(e) => setNewAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-4 py-3 bg-black/40 border border-border-dark rounded-xl text-xs focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 text-white placeholder:text-text-dim font-mono"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 bg-white/5 border border-border-dark text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmittingAccount}
              className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              {isSubmittingAccount ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Lưu liên kết
            </button>
          </div>
        </form>
      )}

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white/[0.01] border border-border-dark/40 p-4 rounded-3xl shadow-lg backdrop-blur-md">
        {[
          { label: 'Tài khoản ngân hàng', value: accounts.length, unit: 'tài khoản', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: Landmark },
          { label: 'Tổng tiền ghi có (Thu)', value: formatCurrency(totalIn), unit: '', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: ArrowDownLeft },
          { label: 'Tổng tiền ghi nợ (Chi)', value: formatCurrency(totalOut), unit: '', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', icon: ArrowUpRight },
          { label: 'Giao dịch đã đối soát', value: matchedCount, unit: 'hóa đơn', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', icon: CheckCircle2 },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-sidebar-dark/45 border border-border-dark hover:border-primary/25 transition-all duration-300 group"
            >
              <div className={`p-2.5 rounded-xl shrink-0 border flex items-center justify-center ${stat.color}`}>
                <Icon size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-text-dim leading-none">{stat.label}</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-sm font-extrabold tracking-tight text-white">{stat.value}</span>
                  {stat.unit && <span className="text-[8px] font-bold text-text-dim/60 uppercase">{stat.unit}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* LINKED ACCOUNTS LIST */}
      <div className="bg-sidebar-dark/30 border border-border-dark rounded-3xl p-5 space-y-4">
        <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
          <span className="size-2 rounded-full bg-blue-500 shadow-md shadow-blue-500/50" />
          Danh sách tài khoản ngân hàng đã liên kết
        </h3>
        
        {accounts.length === 0 ? (
          <div className="text-center py-6 text-xs text-text-dim italic">
            Chưa có tài khoản ngân hàng nào được đăng ký liên kết. Nhấn nút "Liên kết tài khoản" để kết nối.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between p-3.5 bg-black/30 border border-border-dark rounded-2xl group hover:border-primary/20 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Landmark size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white uppercase tracking-wide truncate">{acc.bank_name}</p>
                    <p className="text-[11px] font-bold text-text-dim font-mono tracking-wider mt-0.5">{acc.account_number}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => handleRemoveAccount(acc.account_number)}
                  className="p-1.5 bg-white/5 border border-border-dark text-text-dim hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                  title="Ngắt liên kết"
                >
                  <Link2Off size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TRANSACTIONS HISTORIC TABLE */}
      <div className="bg-sidebar-dark/30 border border-border-dark rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-border-dark flex items-center justify-between bg-card-dark/30">
          <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse" />
            Nhật ký biến động số dư SePay Webhook
          </h3>
          <span className="text-[10px] text-text-dim font-bold uppercase">Tối đa 50 giao dịch gần nhất</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-xs text-text-dim gap-2">
            <Loader2 className="animate-spin text-primary" size={16} /> Đang tải lịch sử giao dịch...
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20 text-xs text-text-dim italic uppercase tracking-wider">
            Chưa phát sinh giao dịch nào được ghi nhận qua Webhook.
          </div>
        ) : (
          <div className="divide-y divide-border-dark/60 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-black/20 text-text-dim font-black uppercase text-[9px] tracking-wider border-b border-border-dark/60">
                  <th className="px-5 py-3.5">Thời gian</th>
                  <th className="px-5 py-3.5">Ngân hàng</th>
                  <th className="px-5 py-3.5">Nội dung chuyển khoản</th>
                  <th className="px-5 py-3.5 text-right">Số tiền</th>
                  <th className="px-5 py-3.5 text-center">Đối soát</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark/30 font-medium">
                {transactions.map((tx) => {
                  const isCredit = Number(tx.amount_in) > 0;
                  const displayAmount = isCredit ? tx.amount_in : tx.amount_out;
                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* THỜI GIAN */}
                      <td className="px-5 py-4 white-space-nowrap">
                        <p className="text-xs text-white font-bold">{formatDisplayDate(tx.transaction_date)}</p>
                        <p className="text-[9px] text-text-dim font-mono mt-0.5">Ref: {tx.reference_number || '---'}</p>
                      </td>
                      
                      {/* NGÂN HÀNG & ACCOUNT NUMBER */}
                      <td className="px-5 py-4">
                        <p className="text-xs text-white font-black uppercase tracking-wide">{tx.gateway}</p>
                        <p className="text-[10px] text-text-dim font-mono mt-0.5">{tx.account_number}</p>
                      </td>
                      
                      {/* NỘI DUNG CHUYỂN KHOẢN */}
                      <td className="px-5 py-4 max-w-sm">
                        <p className="text-xs text-white leading-relaxed line-clamp-2" title={tx.content}>
                          {tx.content}
                        </p>
                        {tx.code && (
                          <span className="inline-flex mt-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase tracking-wider rounded">
                            Mã: {tx.code}
                          </span>
                        )}
                      </td>
                      
                      {/* SỐ TIỀN */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <span className={`text-xs font-extrabold ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isCredit ? '+' : '-'}{formatCurrency(displayAmount)}
                        </span>
                        <p className="text-[9px] text-text-dim font-mono mt-0.5">Dư: {formatCurrency(tx.accumulated)}</p>
                      </td>
                      
                      {/* TRẠNG THÁI ĐỐI SOÁT */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        {tx.match_status === 'matched' ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-bold">
                            <CheckCircle2 size={11} />
                            Đã khớp
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-border-dark text-text-dim rounded-full text-[10px] font-bold">
                            <Clock size={11} />
                            Chưa khớp
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER INFO */}
      <div className="flex items-start gap-3 p-4 bg-blue-900/10 border border-blue-800/20 text-blue-400 rounded-2xl text-xs font-semibold">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          Hệ thống sẽ tự động bắt bắt webhook khi ngân hàng của bạn nhận tiền và thực hiện đối soát tự động theo hai bước ưu tiên: (1) tìm theo Mã thanh toán trùng khớp + Số tiền tương ứng, (2) tìm kiếm mã Hóa đơn/Mã Hợp đồng chứa trong nội dung chuyển khoản + Số tiền tương ứng.
        </span>
      </div>
      
    </div>
  );
};

export default TransactionsView;
