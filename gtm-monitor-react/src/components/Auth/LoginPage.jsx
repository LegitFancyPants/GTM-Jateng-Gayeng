import { useState } from 'react';
import { API_BASE_URL } from '../../apiConfig';

export default function LoginPage({ branches = [], onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        document.activeElement?.blur();
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
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
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
    <div style={{ width: '100%', padding: '36px 32px 32px 32px', boxSizing: 'border-box', background: '#ffffff', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Header / Circular Logo */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 900,
          margin: '0 auto 16px',
          boxShadow: '0 8px 24px rgba(200, 16, 46, 0.35)',
          letterSpacing: '-0.5px'
        }}>
          GTM
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px', fontFamily: "'Outfit', sans-serif" }}>
          GTM Activity Monitor
        </h1>
      </div>

      {/* Global Success Banner */}
      {successMessage && (
        <div style={{ padding: '12px 16px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '12px', fontSize: '13px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.2s' }}>
          <span>✅</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* LOGIN FORM */}
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
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', transition: 'all 0.2s', background: '#ffffff', color: '#0f172a' }}
            onFocus={e => { e.target.style.borderColor = '#C8102E'; e.target.style.outline = 'none'; }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
          />
        </div>

        <div style={{ marginBottom: '22px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input 
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 42px 12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', transition: 'all 0.2s', background: '#ffffff', color: '#0f172a' }}
              onFocus={e => { e.target.style.borderColor = '#C8102E'; e.target.style.outline = 'none'; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
            />
            {password.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  userSelect: 'none'
                }}
                tabIndex={-1}
                title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '12px', fontSize: '13px', fontWeight: 600, marginBottom: '20px', animation: 'fadeIn 0.2s', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '14px', 
            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '12px', 
            fontWeight: 800, 
            fontSize: '15px', 
            cursor: loading ? 'not-allowed' : 'pointer', 
            transition: 'all 0.25s ease',
            boxShadow: loading ? 'none' : '0 8px 24px rgba(200, 16, 46, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={e => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 12px 28px rgba(255, 94, 0, 0.4)';
            }
          }}
          onMouseLeave={e => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(200, 16, 46, 0.3)';
            }
          }}
        >
          {loading ? 'Sedang Masuk...' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}

