import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ChevronRight,
  CircleDollarSign,
  Wifi,
  WifiOff,
  Info
} from 'lucide-react';

// --------------------------------------------------
// Kieu du lieu giao dich tu Casso
// --------------------------------------------------
interface GiaoDich {
  id: string;
  casso_id: number;
  tid: string | null;
  amount: number;
  description: string | null;
  when_date: string | null;
  bank_sub_acc_id: string | null;
  bank_code_name: string | null;
  match_status: 'matched' | 'unmatched';
  matched_invoice_id: string | null;
  created_at: string;
}

interface ThongTinKetNoi {
  id: string;
  account_no: string | null;
  bank_name: string | null;
  status: string;
  created_at: string;
}

interface TransactionsViewProps {
  ownerId: string;
}

// --------------------------------------------------
// Ham tien ich
// --------------------------------------------------

// Dinh dang so tien theo tieng Viet
function dinhDangSoTien(soTien: number): string {
  const soTienAbs = Math.abs(soTien);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(soTienAbs);
}

// Dinh dang thoi gian
function dinhDangThoiGian(dateStr: string | null): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// --------------------------------------------------
// Component chinh: Giao dien quan ly giao dich
// --------------------------------------------------
const TransactionsView: React.FC<TransactionsViewProps> = ({ ownerId }) => {
  const [daKetNoi, setDaKetNoi] = useState(false);
  const [thongTinKN, setThongTinKN] = useState<ThongTinKetNoi | null>(null);
  const [danhSachGd, setDanhSachGd] = useState<GiaoDich[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [dangKetNoi, setDangKetNoi] = useState(false);
  const [dangDongBo, setDangDongBo] = useState(false);
  const [thongBao, setThongBao] = useState<{ loai: 'success' | 'error' | 'info'; noi_dung: string } | null>(null);

  // Ref xu ly postMessage tu popup Cas Link
  const popupRef = useRef<Window | null>(null);

  // Ham hien thi thong bao tam thoi
  const hienThongBao = useCallback((loai: 'success' | 'error' | 'info', noi_dung: string) => {
    setThongBao({ loai, noi_dung });
    setTimeout(() => setThongBao(null), 4000);
  }, []);

  // Ham tai trang thai ket noi va danh sach giao dich tu backend
  const taiDuLieu = useCallback(async () => {
    try {
      setDangTai(true);
      const res = await fetch(`/api/casso/status?ownerId=${ownerId}`);
      const data = await res.json();

      setDaKetNoi(data.connected);
      setThongTinKN(data.connection);
      setDanhSachGd(data.transactions || []);
    } catch (err) {
      console.error('[CASSO] Loi tai du lieu:', err);
    } finally {
      setDangTai(false);
    }
  }, [ownerId]);

  useEffect(() => {
    taiDuLieu();
  }, [taiDuLieu]);

  // Lang nghe su kien postMessage tu popup Cas Link
  useEffect(() => {
    const xuLyMessage = async (event: MessageEvent) => {
      // Chi chap nhan message tu cung origin hoac tu Casso
      if (event.data?.type === 'CASSO_PUBLIC_TOKEN' && event.data?.publicToken) {
        const publicToken = event.data.publicToken;
        console.log('[CASSO] Nhan duoc publicToken tu popup:', publicToken);

        // Dong popup neu con mo
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }

        // Gui publicToken len backend de doi lay accessToken
        try {
          setDangKetNoi(true);
          const res = await fetch('/api/casso/token-exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicToken, ownerId })
          });

          const ketQua = await res.json();

          if (!res.ok) {
            hienThongBao('error', ketQua.error || 'Ket noi that bai. Vui long thu lai.');
            return;
          }

          hienThongBao('success', 'Ket noi tai khoan ngan hang thanh cong!');
          await taiDuLieu();

          // Tu dong dong bo luon sau khi ket noi
          await thucHienDongBo();

        } catch (err: any) {
          hienThongBao('error', 'Loi ket noi: ' + err.message);
        } finally {
          setDangKetNoi(false);
        }
      }

      if (event.data?.type === 'CASSO_ERROR') {
        hienThongBao('error', 'Ket noi bi huy. Vui long thu lai.');
        setDangKetNoi(false);
      }
    };

    window.addEventListener('message', xuLyMessage);
    return () => window.removeEventListener('message', xuLyMessage);
  }, [ownerId, taiDuLieu]);

  // Ham ket noi ngan hang: goi backend lay grantToken, mo popup Cas Link
  const ketNoiNganHang = async () => {
    try {
      setDangKetNoi(true);
      hienThongBao('info', 'Dang khoi tao cua so ket noi...');

      const res = await fetch('/api/casso/grant-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (!res.ok || !data.grantToken) {
        hienThongBao('error', data.error || 'Khong the khoi tao ket noi. Kiem tra lai cau hinh CASSO.');
        setDangKetNoi(false);
        return;
      }

      // Mo popup Cas Link voi grantToken
      const casLinkUrl = `https://cas.so/general/link?token=${data.grantToken}`;
      const popupOptions = 'width=480,height=720,left=400,top=100,scrollbars=yes,resizable=yes';
      const popup = window.open(casLinkUrl, 'CasLink', popupOptions);
      popupRef.current = popup;

      if (!popup) {
        hienThongBao('error', 'Trinh duyet da chan popup. Vui long cho phep popup tu trang nay.');
        setDangKetNoi(false);
        return;
      }

      // Theo doi khi nguoi dung dong popup ma khong hoan tat
      const kiemTraPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(kiemTraPopup);
          setDangKetNoi(false);
        }
      }, 1000);

    } catch (err: any) {
      hienThongBao('error', 'Loi: ' + err.message);
      setDangKetNoi(false);
    }
  };

  // Ham dong bo thu cong
  const thucHienDongBo = async () => {
    try {
      setDangDongBo(true);
      const res = await fetch('/api/casso/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId })
      });

      const ketQua = await res.json();

      if (!res.ok) {
        hienThongBao('error', ketQua.error || 'Dong bo that bai');
        return;
      }

      hienThongBao('success', ketQua.message || 'Dong bo thanh cong');
      await taiDuLieu();
    } catch (err: any) {
      hienThongBao('error', 'Loi dong bo: ' + err.message);
    } finally {
      setDangDongBo(false);
    }
  };

  // Ham ngat ket noi
  const ngatKetNoi = async () => {
    if (!window.confirm('Ban co chac muon ngat ket noi tai khoan ngan hang?')) return;

    try {
      await fetch('/api/casso/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId })
      });
      hienThongBao('info', 'Da ngat ket noi tai khoan ngan hang');
      await taiDuLieu();
    } catch (err: any) {
      hienThongBao('error', 'Loi ngat ket noi: ' + err.message);
    }
  };

  // Tinh tong thu / chi
  const tongThu = danhSachGd.filter(g => g.amount > 0).reduce((s, g) => s + g.amount, 0);
  const tongChi = danhSachGd.filter(g => g.amount < 0).reduce((s, g) => s + Math.abs(g.amount), 0);
  const soKhop = danhSachGd.filter(g => g.match_status === 'matched').length;

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">

      {/* Toast thong bao */}
      {thongBao && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all duration-300 ${
            thongBao.loai === 'success' ? 'bg-green-900/90 text-green-300 border border-green-700' :
            thongBao.loai === 'error'   ? 'bg-red-900/90 text-red-300 border border-red-700' :
                                          'bg-blue-900/90 text-blue-300 border border-blue-700'
          }`}
        >
          {thongBao.loai === 'success' && <CheckCircle2 size={16} />}
          {thongBao.loai === 'error' && <AlertCircle size={16} />}
          {thongBao.loai === 'info' && <Info size={16} />}
          {thongBao.noi_dung}
        </div>
      )}

      {/* ---- Header ---- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
            <Landmark size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Giao dich ngan hang</h1>
            <p className="text-xs text-gray-500">Dong bo tu dong qua Casso (cas.so)</p>
          </div>
        </div>

        {/* Badge trang thai ket noi */}
        <div className="flex items-center gap-2">
          {dangTai ? (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Loader2 size={12} className="animate-spin" /> Dang tai...
            </span>
          ) : daKetNoi ? (
            <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-900/30 border border-green-700/50 px-3 py-1.5 rounded-full">
              <Wifi size={12} /> Da ket noi
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/50 border border-gray-700 px-3 py-1.5 rounded-full">
              <WifiOff size={12} /> Chua ket noi
            </span>
          )}
        </div>
      </div>

      {/* ---- Panel hanh dong ---- */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="text-sm text-gray-400 space-y-0.5">
          {daKetNoi && thongTinKN ? (
            <>
              <div className="text-white font-medium">
                {thongTinKN.bank_name || 'Tai khoan ngan hang'}
                {thongTinKN.account_no && (
                  <span className="ml-2 text-xs text-gray-500 font-mono">{thongTinKN.account_no}</span>
                )}
              </div>
              <div className="text-xs">
                Ket noi luc: {dinhDangThoiGian(thongTinKN.created_at)}
              </div>
            </>
          ) : (
            <div>
              Chua co tai khoan ngan hang nao duoc ket noi.<br />
              <span className="text-xs text-gray-600">Nhan "Ket noi ngan hang" de bat dau.</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!daKetNoi ? (
            <button
              onClick={ketNoiNganHang}
              disabled={dangKetNoi}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-all"
            >
              {dangKetNoi ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
              {dangKetNoi ? 'Dang ket noi...' : 'Ket noi ngan hang'}
            </button>
          ) : (
            <>
              <button
                onClick={thucHienDongBo}
                disabled={dangDongBo}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all border border-gray-700"
              >
                {dangDongBo ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                {dangDongBo ? 'Dang dong bo...' : 'Dong bo thu cong'}
              </button>
              <button
                onClick={ngatKetNoi}
                className="flex items-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm font-medium rounded-xl transition-all border border-red-800/50"
              >
                <Link2Off size={15} />
                Ngat ket noi
              </button>
            </>
          )}
        </div>
      </div>

      {/* ---- Thong ke tong quan ---- */}
      {daKetNoi && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { nhan: 'Tong giao dich', gia_tri: danhSachGd.length, don_vi: 'GD', mau: 'text-white' },
            { nhan: 'Tong thu', gia_tri: dinhDangSoTien(tongThu), mau: 'text-green-400' },
            { nhan: 'Tong chi', gia_tri: dinhDangSoTien(tongChi), mau: 'text-red-400' },
            { nhan: 'Da doi soat', gia_tri: soKhop, don_vi: 'HD', mau: 'text-indigo-400' }
          ].map((item) => (
            <div key={item.nhan} className="bg-gray-900/50 border border-gray-800 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">{item.nhan}</div>
              <div className={`text-base font-bold ${item.mau}`}>
                {item.gia_tri}{item.don_vi && <span className="text-xs font-normal ml-1 text-gray-500">{item.don_vi}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Bang giao dich ---- */}
      {dangTai ? (
        <div className="flex items-center justify-center py-16 text-gray-600">
          <Loader2 className="animate-spin mr-2" size={20} /> Dang tai du lieu...
        </div>
      ) : !daKetNoi ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-800/80 border border-gray-700 flex items-center justify-center">
            <CircleDollarSign size={32} className="text-gray-600" />
          </div>
          <div>
            <p className="text-gray-400 font-medium">Chua ket noi tai khoan ngan hang</p>
            <p className="text-gray-600 text-sm mt-1">Ket noi de tu dong dong bo giao dich va doi soat hoa don</p>
          </div>
          <button
            onClick={ketNoiNganHang}
            disabled={dangKetNoi}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all mt-2"
          >
            <Link2 size={15} />
            Ket noi ngay
          </button>
        </div>
      ) : danhSachGd.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <Clock size={32} className="mb-3" />
          <p>Chua co giao dich nao.</p>
          <button onClick={thucHienDongBo} className="mt-3 text-sm text-indigo-400 hover:underline">
            Dong bo ngay
          </button>
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
          {/* Tieu de bang */}
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">
              Lich su giao dich ({danhSachGd.length} GD gan nhat)
            </span>
            <button
              onClick={thucHienDongBo}
              disabled={dangDongBo}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={dangDongBo ? 'animate-spin' : ''} />
              Lam moi
            </button>
          </div>

          {/* Danh sach */}
          <div className="divide-y divide-gray-800/60">
            {danhSachGd.map((gd) => (
              <div
                key={gd.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/30 transition-colors group"
              >
                {/* Icon loai giao dich */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  gd.amount > 0 ? 'bg-green-900/40' : 'bg-red-900/40'
                }`}>
                  {gd.amount > 0
                    ? <ArrowDownLeft size={14} className="text-green-400" />
                    : <ArrowUpRight size={14} className="text-red-400" />
                  }
                </div>

                {/* Noi dung va thoi gian */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 truncate">
                    {gd.description || 'Khong co noi dung'}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-600">{dinhDangThoiGian(gd.when_date)}</span>
                    {gd.bank_code_name && (
                      <span className="text-xs text-gray-700 font-mono uppercase">{gd.bank_code_name}</span>
                    )}
                    {gd.tid && (
                      <span className="text-xs text-gray-700 font-mono hidden md:inline">{gd.tid}</span>
                    )}
                  </div>
                </div>

                {/* So tien */}
                <div className={`text-sm font-semibold shrink-0 ${
                  gd.amount > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {gd.amount > 0 ? '+' : '-'}{dinhDangSoTien(gd.amount)}
                </div>

                {/* Trang thai doi soat */}
                <div className="shrink-0">
                  {gd.match_status === 'matched' ? (
                    <span className="flex items-center gap-1 text-xs text-indigo-400 bg-indigo-900/30 border border-indigo-700/40 px-2 py-1 rounded-full">
                      <CheckCircle2 size={10} />
                      Da khop
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-800/50 border border-gray-700 px-2 py-1 rounded-full">
                      <Clock size={10} />
                      Chua khop
                    </span>
                  )}
                </div>

                <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-500 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chu thich ve Webhook */}
      {daKetNoi && (
        <div className="flex items-start gap-2 p-3 bg-blue-900/10 border border-blue-800/30 rounded-xl text-xs text-blue-400">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>
            Giao dich moi se duoc tu dong cap nhat qua Webhook ma khong can nhan "Dong bo".
            De bat Webhook, cau hinh URL <code className="font-mono bg-blue-900/30 px-1 rounded">POST /api/webhook-casso</code> trong Casso Console.
          </span>
        </div>
      )}
    </div>
  );
};

export default TransactionsView;
