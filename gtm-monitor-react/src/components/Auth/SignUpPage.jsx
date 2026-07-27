import { useState } from 'react';

export default function SignUpPage({ branches = [], onLoginSuccess, goLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // Daftar 6 branch resmi (urut berdasarkan ID 1-6)
  const OFFICIAL_BRANCHES = [
    'MAGELANG',
    'PEKALONGAN',
    'PURWOKERTO',
    'SEMARANG',
    'SURAKARTA',
    'YOGYAKARTA',
  ];

  // Selalu gunakan daftar resmi agar urutan dan isi konsisten
  const availableBranches = OFFICIAL_BRANCHES;

  const [branchName, setBranchName] = useState(availableBranches[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || !fullName || !branchName) {
      setError('Semua kolom harus diisi lengkap.');
      return;
    }

    if (password.length < 4) {
      setError('Password minimal terdiri dari 4 karakter.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, fullName, branchName })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onLoginSuccess(data.token, data.user);
      } else {
        setError(data.message || 'Gagal mendaftar. Silakan coba username lain.');
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
      
      <div style={{ width: '100%', maxWidth: '440px', padding: '20px', animation: 'fadeIn 0.4s ease-out' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#C8102E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 900, margin: '0 auto 14px', boxShadow: '0 8px 16px -4px rgba(200,16,46,0.3)', letterSpacing: '-1px' }}>
            GTM
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Daftar Akun Tim
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, fontWeight: 500 }}>
            Akun langsung aktif untuk verifikasi & input kegiatan
          </p>
        </div>

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Nama Lengkap
            </label>
            <input 
              type="text"
              placeholder="Contoh: Budi Santoso"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              disabled={loading}
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 15px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', background: '#ffffff', color: '#0f172a', transition: 'all 0.2s' }}
              onFocus={e => { e.target.style.borderColor = '#C8102E'; e.target.style.outline = 'none'; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Pilih Branch
            </label>
            <select
              value={branchName}
              onChange={e => setBranchName(e.target.value)}
              disabled={loading}
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 15px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', background: '#ffffff', color: '#0f172a', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onFocus={e => { e.target.style.borderColor = '#C8102E'; e.target.style.outline = 'none'; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
            >
              {availableBranches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Username
            </label>
            <input 
              type="text"
              placeholder="Contoh: budi_pwk"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 15px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', background: '#ffffff', color: '#0f172a', transition: 'all 0.2s' }}
              onFocus={e => { e.target.style.borderColor = '#C8102E'; e.target.style.outline = 'none'; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
            />
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Password
            </label>
            <input 
              type="password"
              placeholder="Minimal 4 karakter"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 15px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', background: '#ffffff', color: '#0f172a', transition: 'all 0.2s' }}
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
            {loading ? '⏳ Membuka Akun...' : 'Daftar & Login'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
            Sudah memiliki akun?{' '}
            <button 
              onClick={goLogin}
              style={{ background: 'transparent', border: 'none', color: '#C8102E', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '13.5px' }}
            >
              Kembali ke Login
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
