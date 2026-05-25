import React, { useState } from 'react';
import { sampleInvoices, ExtendedInvoiceItem } from './demoData';
import { DashboardInvoiceList } from './DashboardInvoiceList';
import { Settings, Play, RefreshCw, Terminal, Eye, Sliders, Smartphone, Monitor } from 'lucide-react';
import './DashboardInvoice.css';

export const DashboardDemoPage: React.FC = () => {
  const [invoices, setInvoices] = useState<ExtendedInvoiceItem[]>(sampleInvoices);
  const [accordionMode, setAccordionMode] = useState(false);
  const [lazyRender, setLazyRender] = useState(true);
  const [simulatedMobile, setSimulatedMobile] = useState(false);
  const [logs, setLogs] = useState<string[]>(['[Hệ thống] Demo Page khởi chạy thành công. Bắt đầu tương tác...']);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const handleUpdateInvoice = (id: string, updatedData: any) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        addLog(`Cập nhật hóa đơn ${inv.invoiceNumber} (${inv.companyName}): Ghi chú mới - "${updatedData.notes}"`);
        return { ...inv, ...updatedData };
      }
      return inv;
    }));
  };

  const handleDeleteInvoice = (id: string) => {
    const target = invoices.find(inv => inv.id === id);
    if (!target) return;
    
    if (confirm(`Bạn có chắc chắn muốn xóa hóa đơn số ${target.invoiceNumber}?`)) {
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      addLog(`Đã xóa hóa đơn số ${target.invoiceNumber} (${target.companyName}) khỏi danh sách.`);
    }
  };

  const handleGenerateDoc = (invoice: ExtendedInvoiceItem) => {
    addLog(`Đang tạo biên bản đối chiếu kỹ thuật cho hóa đơn số ${invoice.invoiceNumber}...`);
    alert(`[MÔ PHỎNG] Tạo biên bản thành công cho ${invoice.companyName}\nMã hóa đơn: ${invoice.id}`);
  };

  const handleResetData = () => {
    setInvoices(sampleInvoices);
    setLogs([]);
    addLog('[Hệ thống] Đã cài đặt lại toàn bộ dữ liệu 10 hóa đơn mẫu gốc.');
  };

  const pdfFiles = invoices.filter(i => i.type === 'PDF');
  const xmlFiles = invoices.filter(i => i.type === 'XML');

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6 space-y-6 scroll-smooth">
      {/* 1. Header Banner */}
      <div className="bg-card-dark border border-border-dark p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 size-72 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 bg-primary/20 text-primary text-[10px] font-black tracking-widest rounded-full uppercase border border-primary/30">
              Demo Sandbox
            </span>
            <span className="text-[10px] text-text-dim font-bold">Phiên bản 1.0.0</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight uppercase">Trình Giả Lập Dòng Mở Rộng</h1>
          <p className="text-xs text-text-dim">Môi trường kiểm thử độc lập cho tính năng Expandable Row dành riêng cho Dashboard.</p>
        </div>
        <button 
          onClick={handleResetData}
          className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-wider rounded-xl border border-border-dark flex items-center gap-2 hover-scale-btn shadow-md shrink-0"
        >
          <RefreshCw size={14} className="animate-spin-slow" />
          Đặt Lại Dữ Liệu
        </button>
      </div>

      {/* 2. Controls & Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Config Panel */}
        <div className="lg:col-span-2 bg-card-dark border border-border-dark p-6 rounded-3xl space-y-6 shadow-xl">
          <div className="flex items-center gap-2.5 border-b border-border-dark pb-3">
            <Sliders size={18} className="text-primary" />
            <h2 className="text-sm font-black uppercase tracking-wider">Cấu Hình Tính Năng Dashboard</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Accordion Mode Toggle */}
            <div className="bg-black/30 p-4 rounded-2xl border border-border-dark flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Accordion Mode</h3>
                <p className="text-[11px] text-text-dim mt-1">Chỉ cho phép duy nhất 1 dòng mở rộng tại một thời điểm.</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-text-dim">Trạng thái: {accordionMode ? 'BẬT' : 'TẮT'}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={accordionMode}
                    onChange={(e) => {
                      setAccordionMode(e.target.checked);
                      addLog(`Đã chuyển đổi Accordion Mode sang: ${e.target.checked ? 'BẬT' : 'TẮT'}`);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
            </div>

            {/* Lazy Render Toggle */}
            <div className="bg-black/30 p-4 rounded-2xl border border-border-dark flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Lazy Rendering</h3>
                <p className="text-[11px] text-text-dim mt-1">Chỉ render phần HTML chi tiết vào DOM khi dòng được click mở rộng.</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-text-dim">Trạng thái: {lazyRender ? 'BẬT' : 'TẮT'}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={lazyRender}
                    onChange={(e) => {
                      setLazyRender(e.target.checked);
                      addLog(`Đã chuyển đổi Lazy Rendering sang: ${e.target.checked ? 'BẬT' : 'TẮT'}`);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
            </div>

            {/* Simulator Viewport Toggle */}
            <div className="bg-black/30 p-4 rounded-2xl border border-border-dark flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Giả Lập Thiết Bị</h3>
                <p className="text-[11px] text-text-dim mt-1">Simulate chiều rộng màn hình di động (&lt; 768px) để kiểm tra Modal Fallback.</p>
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setSimulatedMobile(!simulatedMobile);
                    addLog(`Đã chuyển đổi chế độ xem sang giả lập: ${!simulatedMobile ? 'DI ĐỘNG' : 'MÁY TÍNH'}`);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase border transition-all ${
                    simulatedMobile 
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
                      : 'bg-white/5 text-stone-300 border-border-dark'
                  }`}
                >
                  {simulatedMobile ? <Smartphone size={12} /> : <Monitor size={12} />}
                  {simulatedMobile ? 'MÀN HÌNH DI ĐỘNG' : 'MÀN HÌNH LỚN'}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Diagnostic Status Box */}
        <div className="bg-card-dark border border-border-dark p-6 rounded-3xl flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2.5 border-b border-border-dark pb-3">
              <Eye size={18} className="text-primary" />
              <h2 className="text-sm font-black uppercase tracking-wider">Trạng Thái Kiểm Thử</h2>
            </div>
            <ul className="text-xs space-y-2 mt-4 text-text-dim">
              <li className="flex justify-between"><span className="font-semibold">Tổng số tệp PDF:</span> <span className="text-white font-bold">{pdfFiles.length}</span></li>
              <li className="flex justify-between"><span className="font-semibold">Tổng số tệp XML:</span> <span className="text-white font-bold">{xmlFiles.length}</span></li>
              <li className="flex justify-between"><span className="font-semibold">Phạm vi tác động:</span> <span className="text-emerald-400 font-bold">100% CÔ LẬP DASHBOARD</span></li>
              <li className="flex justify-between">
                <span className="font-semibold">Bàn phím hỗ trợ:</span> 
                <span className="px-2 py-0.5 bg-white/5 border border-border-dark rounded text-[10px] font-bold text-white uppercase">Tab / Space / Enter</span>
              </li>
            </ul>
          </div>
          
          <div className="pt-4 border-t border-border-dark mt-4 text-[10px] text-text-dim leading-snug">
            💡 <strong>Hướng dẫn nhanh:</strong> Click chuột trái vào bất kỳ dòng nào bên dưới để xem hiệu ứng mở rộng chi tiết. Nhấp Tab để di chuyển tiêu điểm, nhấn Enter hoặc Space để kích hoạt.
          </div>
        </div>

      </div>

      {/* 3. The Active Lists Component Sandbox */}
      <div className={`mx-auto transition-all duration-300 ${simulatedMobile ? 'max-w-[420px] border-4 border-white/20 rounded-[48px] p-4 bg-black shadow-2xl relative' : 'w-full'}`}>
        
        {simulatedMobile && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-white/20 rounded-full z-20 pointer-events-none" />
        )}

        <div className="grid grid-cols-1 gap-6">
          
          {/* Unified Column (PDF & XML) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-primary animate-pulse shadow-md shadow-primary" />
                <h3 className="font-black text-xs text-text-dim uppercase tracking-wider">Danh sách hóa đơn hệ thống (PDF & XML) ({invoices.length})</h3>
              </div>
            </div>
            <div className="bg-card-dark/40 border border-border-dark p-4 rounded-3xl min-h-[300px]">
              {invoices.length === 0 ? (
                <div className="text-center py-20 text-xs italic text-text-dim uppercase">Hết dữ liệu</div>
              ) : (
                <DashboardInvoiceList 
                  invoices={invoices}
                  accordionMode={accordionMode}
                  lazyRender={lazyRender}
                  mobileFallbackThreshold={simulatedMobile ? 9999 : 768} // Force modal if simulated mobile
                  onDelete={handleDeleteInvoice}
                  onGenerateDoc={handleGenerateDoc}
                  onUpdate={handleUpdateInvoice}
                />
              )}
            </div>
          </section>

        </div>
      </div>

      {/* 4. Action Activity Log Monitor */}
      <div className="bg-card-dark border border-border-dark rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-border-dark bg-white/[0.01] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-primary animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-wider">Nhật Ký Tương Tác Hệ Thống (Console Outputs)</h3>
          </div>
          <button 
            onClick={() => setLogs([])}
            className="text-[10px] font-black text-text-dim hover:text-white uppercase tracking-wider"
          >
            Dọn sạch log
          </button>
        </div>
        <div className="p-4 bg-black/80 font-mono text-[11px] text-green-400 space-y-1.5 h-[160px] overflow-y-auto custom-scrollbar">
          {logs.length === 0 ? (
            <div className="text-text-dim/40 italic">Chưa có tương tác nào được ghi nhận.</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="leading-relaxed whitespace-pre-wrap select-text">{log}</div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
