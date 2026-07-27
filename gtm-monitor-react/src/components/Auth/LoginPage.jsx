import { useState } from 'react';

export default function LoginPage({ branches = [], onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Forgot Password State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetFullName, setResetFullName] = useState('');
  
  // Daftar 6 branch resmi (urut berdasarkan ID 1-6)
  const OFFICIAL_BRANCHES = [
    'MAGELANG',
    'PEKALONGAN',
    'PURWOKERTO',
    'SEMARANG',
    'SURAKARTA',
    'YOGYAKARTA',
  ];

  const availableBranches = OFFICIAL_BRANCHES;

  const [resetBranchName, setResetBranchName] = useState(availableBranches[0]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Silakan masukkan username dan password Anda.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onLoginSuccess(data.token, data.user);
      } else {
        setError(data.message || 'Login gagal. Periksa kembali username dan password Anda.');
      }
    } catch (err) {
      console.error(err);
      setError('Gagal terhubung ke server. Pastikan server backend sedang aktif.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetUsername || !resetFullName || !resetBranchName || !newPassword || !confirmPassword) {
      setError('Semua kolom kredensial dan password baru wajib diisi.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Password baru dan konfirmasi password tidak cocok.');
      return;
    }

    if (newPassword.length < 4) {
      setError('Password baru minimal terdiri dari 4 karakter.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3001/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: resetUsername,
          fullName: resetFullName,
          branchName: resetBranchName,
          newPassword
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage(data.message || 'Password berhasil diperbarui! Silakan masuk dengan password baru Anda.');
        setIsForgotPassword(false);
        setUsername(resetUsername);
        setPassword('');
        // Reset forgot password fields
        setResetUsername('');
        setResetFullName('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.message || 'Gagal mereset password. Pastikan kredensial yang Anda masukkan cocok.');
      }
    } catch (err) {
      console.error(err);
      setError('Gagal terhubung ke server backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', padding: '20px' }}>
      
      <div style={{ width: '100%', maxWidth: '420px', padding: '20px', animation: 'fadeIn 0.4s ease-out' }}>
        
        {/* Header / Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#C8102E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 900, margin: '0 auto 14px', boxShadow: '0 8px 16px -4px rgba(200,16,46,0.3)', letterSpacing: '-1px' }}>
            GTM
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
            GTM Activity Monitor
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
            {isForgotPassword ? 'Reset Password / Lupa Password' : 'Portal Monitoring Kegiatan & Kapasitas ODP'}
          </p>
        </div>

        {/* Global Success Banner */}
        {successMessage && (
          <div style={{ padding: '12px 16px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.2s' }}>
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* FORM 1: LOGIN UTAMA */}
        {!isForgotPassword ? (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Username
              </label>
              <input 
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={loading}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', transition: 'all 0.2s', background: '#ffffff', color: '#0f172a' }}
                onFocus={e => { e.target.style.borderColor = '#C8102E'; e.target.style.outline = 'none'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Password
              </label>
              <input 
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', transition: 'all 0.2s', background: '#ffffff', color: '#0f172a' }}
                onFocus={e => { e.target.style.borderColor = '#C8102E'; e.target.style.outline = 'none'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
              />
            </div>

            {/* Tombol Lupa Password di antara bar Password & Tombol Login (Sebelah Kanan) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError(null);
                  setSuccessMessage(null);
                }}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: '#C8102E', 
                  fontSize: '12.5px', 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  padding: 0 
                }}
                onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
              >
                Lupa Password?
              </button>
            </div>

            {error && (
              <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.2s' }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '14px', 
                background: loading ? '#94a3b8' : '#C8102E', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '10px', 
                fontWeight: 800, 
                fontSize: '15px', 
                cursor: loading ? 'not-allowed' : 'pointer', 
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 10px 20px -5px rgba(200,16,46,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {loading ? 'Sedang Masuk...' : 'Masuk'}
            </button>
          </form>
        ) : (
          /* FORM 2: FORGOT / RESET PASSWORD */
          <form onSubmit={handleResetSubmit} style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Username Akun
              </label>
              <input 
                type="text"
                placeholder="Masukkan username Anda"
                value={resetUsername}
                onChange={e => setResetUsername(e.target.value)}
                disabled={loading}
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 15px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13.5px', background: '#ffffff', color: '#0f172a' }}
                onFocus={e => { e.target.style.borderColor = '#C8102E'; e.target.style.outline = 'none'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Nama Lengkap
              </label>
              <input 
                type="text"
                placeholder="Masukkan Nama Lengkap terdaftar"
                value={resetFullName}
                onChange={e => setResetFullName(e.target.value)}
                disabled={loading}
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 15px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13.5px', background: '#ffffff', color: '#0f172a' }}
                onFocus={e => { e.target.style.borderColor = '#C8102E'; e.target.style.outline = 'none'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Branch
              </label>
              <select
                value={resetBranchName}
                onChange={e => setResetBranchName(e.target.value)}
                disabled={loading}
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 15px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13.5px', background: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                {availableBranches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Password Baru
              </label>
              <input 
                type="password"
                placeholder="Buat password baru"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                disabled={loading}
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 15px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13.5px', background: '#ffffff', color: '#0f172a' }}
                onFocus={e => { e.target.style.borderColor = '#C8102E'; e.target.style.outline = 'none'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Konfirmasi Password Baru
              </label>
              <input 
                type="password"
                placeholder="Ketik ulang password baru"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                disabled={loading}
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 15px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13.5px', background: '#ffffff', color: '#0f172a' }}
                onFocus={e => { e.target.style.borderColor = '#C8102E'; e.target.style.outline = 'none'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
              />
            </div>

            {error && (
              <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.2s' }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                }}
                disabled={loading}
                style={{ 
                  flex: 1, 
                  padding: '13px', 
                  background: '#f8fafc', 
                  color: '#475569', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '10px', 
                  fontWeight: 700, 
                  fontSize: '14px', 
                  cursor: 'pointer' 
                }}
              >
                Batal
              </button>

              <button 
                type="submit" 
                disabled={loading}
                style={{ 
                  flex: 1.4, 
                  padding: '13px', 
                  background: loading ? '#94a3b8' : '#C8102E', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '10px', 
                  fontWeight: 800, 
                  fontSize: '14px', 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  boxShadow: loading ? 'none' : '0 8px 16px -4px rgba(200,16,46,0.3)' 
                }}
              >
                {loading ? 'Memproses...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
