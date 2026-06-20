import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

/**
 * Trang callback sau khi nguoi dung hoan tat lien ket tai khoan
 * trong cua so popup Cas Link.
 *
 * Quy trinh:
 * 1. Cas Link chuyen huong ve trang nay voi query param ?publicToken=...
 * 2. Trang nay doc publicToken tu URL
 * 3. Gui publicToken ve cua so cha qua window.postMessage
 * 4. Tu dong dong popup
 */
const CasCallback: React.FC = () => {
  const [trangThai, setTrangThai] = useState<'loading' | 'success' | 'error'>('loading');
  const [thongBao, setThongBao] = useState('Dang xu ly ket noi...');

  useEffect(() => {
    // Doc publicToken tu URL query string
    const params = new URLSearchParams(window.location.search);
    const publicToken = params.get('publicToken');
    const loi = params.get('error');

    if (loi) {
      setTrangThai('error');
      setThongBao('Ket noi bi huy hoac co loi xay ra. Vui long thu lai.');
      // Tu dong dong popup sau 3 giay
      setTimeout(() => {
        if (window.opener) {
          window.opener.postMessage({ type: 'CASSO_ERROR', error: loi }, '*');
        }
        window.close();
      }, 3000);
      return;
    }

    if (!publicToken) {
      setTrangThai('error');
      setThongBao('Khong nhan duoc token. Vui long thu lai.');
      setTimeout(() => window.close(), 3000);
      return;
    }

    // Gui publicToken ve cua so cha
    if (window.opener) {
      window.opener.postMessage(
        { type: 'CASSO_PUBLIC_TOKEN', publicToken },
        '*'
      );
      setTrangThai('success');
      setThongBao('Ket noi thanh cong! Cua so se tu dong dong...');
    } else {
      // Neu khong co cua so cha (mo truc tiep), luu vao localStorage
      localStorage.setItem('casso_public_token_pending', publicToken);
      setTrangThai('success');
      setThongBao('Da nhan token. Ban co the dong cua so nay.');
    }

    // Tu dong dong popup sau 2 giay
    setTimeout(() => window.close(), 2000);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f0f0f',
        color: '#f5f5f5',
        fontFamily: 'Inter, system-ui, sans-serif',
        gap: '16px',
        padding: '24px'
      }}
    >
      {/* Logo / Brand */}
      <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px', letterSpacing: '2px', textTransform: 'uppercase' }}>
        Quan Ly Ho So
      </div>

      {/* Icon trang thai */}
      {trangThai === 'loading' && (
        <Loader2 size={48} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
      )}
      {trangThai === 'success' && (
        <CheckCircle2 size={48} style={{ color: '#22c55e' }} />
      )}
      {trangThai === 'error' && (
        <XCircle size={48} style={{ color: '#ef4444' }} />
      )}

      {/* Tieu de */}
      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
        {trangThai === 'loading' && 'Dang xu ly...'}
        {trangThai === 'success' && 'Ket noi thanh cong!'}
        {trangThai === 'error' && 'Ket noi that bai'}
      </h2>

      {/* Thong bao */}
      <p style={{ color: '#aaa', fontSize: '14px', margin: 0, textAlign: 'center', maxWidth: '300px' }}>
        {thongBao}
      </p>

      {/* Indicator dong popup */}
      {trangThai === 'success' && (
        <p style={{ color: '#555', fontSize: '12px', marginTop: '8px' }}>
          Cua so se tu dong dong sau 2 giay...
        </p>
      )}

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CasCallback;
