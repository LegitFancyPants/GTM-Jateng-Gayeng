import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import BranchView from './components/BranchView';
import UploadView from './components/UploadView';
import AdminPanel from './components/AdminPanel';
import './index.css';

function App() {
  const [branches, setBranches] = useState([]);
  const [view, setView] = useState('dashboard'); // dashboard, branch, upload, admin
  const [activeBranch, setActiveBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  // Admin Auth State
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/api/data');
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch (err) {
      console.error('Failed to fetch data from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const goDashboard = () => {
    setView('dashboard');
    setActiveBranch(null);
  };

  const goBranch = (name) => {
    setView('branch');
    setActiveBranch(name);
  };

  const goUpload = () => {
    setView('upload');
  };

  const goAdmin = () => {
    setView('admin');
  };

  // Admin Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch('http://localhost:3001/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setIsAdmin(true);
        setAdminToken(result.token);
        setShowLoginModal(false);
        setPasswordInput('');
        goAdmin(); // Masuk ke tampilan admin
      } else {
        setLoginError('Password salah!');
      }
    } catch (err) {
      setLoginError('Gagal terhubung ke server.');
      console.error(err);
    }
  };

  // Update activity field at PROJECT level
  const updateActivityField = async (branchName, projectName, actType, fieldKey, value) => {
    // Optimistic UI Update
    setBranches(prev => {
      const newBranches = JSON.parse(JSON.stringify(prev));
      const b = newBranches.find(x => x.name === branchName);
      const p = b?.projects.find(x => x.name === projectName);
      if (p) {
        if (!p.activities) p.activities = [];
        let a = p.activities.find(x => x.type === actType);
        if (!a) {
          a = { type: actType, status: 'belum' };
          p.activities.push(a);
        }
        if (a.status === 'belum' && value) a.status = 'upload';
        if (fieldKey === 'planDate') a.planDate = value;
      }
      return newBranches;
    });

    try {
      await fetch('http://localhost:3001/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName,
          projectName,
          type: actType,
          status: 'upload',
          [fieldKey === 'planDate' ? 'planDate' : 'actualDate']: value
        })
      });
      fetchData();
    } catch (err) {
      console.error('Error saving activity:', err);
    }
  };

  // Upload photo at PROJECT level
  const uploadPhoto = async (branchName, projectName, actType, file) => {
    // Optimistic UI Update
    setBranches(prev => {
      const newBranches = JSON.parse(JSON.stringify(prev));
      const b = newBranches.find(x => x.name === branchName);
      const p = b?.projects.find(x => x.name === projectName);
      if (p) {
        if (!p.activities) p.activities = [];
        let a = p.activities.find(x => x.type === actType);
        if (!a) {
          a = { type: actType, status: 'belum' };
          p.activities.push(a);
        }
        a.status = 'upload';
        a.photoUrl = 'uploading...';
      }
      return newBranches;
    });

    const formData = new FormData();
    formData.append('branchName', branchName);
    formData.append('projectName', projectName);
    formData.append('type', actType);
    formData.append('status', 'upload');
    formData.append('photo', file);

    try {
      const res = await fetch('http://localhost:3001/api/activities', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
    }
  };

  // Verify activity at PROJECT level
  const verifyActivity = async (branchName, projectName, actType) => {
    if (!isAdmin) return;

    try {
      const res = await fetch('http://localhost:3001/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          branchName,
          projectName,
          type: actType
        })
      });
      if (res.ok) {
        // Optimistic UI Update
        setBranches(prev => {
          const newBranches = JSON.parse(JSON.stringify(prev));
          const b = newBranches.find(x => x.name === branchName);
          const p = b?.projects.find(x => x.name === projectName);
          if (p && p.activities) {
            const a = p.activities.find(x => x.type === actType);
            if (a) a.status = 'verified';
          }
          return newBranches;
        });
        fetchData();
      }
    } catch (err) {
      console.error('Error verifying activity:', err);
    }
  };

  if (loading && branches.length === 0) {
    return <div style={{ padding: '80px 0', textAlign: 'center', color: '#94a3b8' }}>⏳ Memuat data dari server...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="header-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.5px' }}>GTM</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>GTM Activity Monitor</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Region Control Panel — Occupancy ODP per Proyek</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {view !== 'upload' && view !== 'admin' && (
            <button 
              onClick={goUpload} 
              className="btn-primary"
            >
              + Upload Activity (Branch)
            </button>
          )}

          {/* Admin Icon Button */}
          <button
            onClick={() => {
              if (isAdmin) {
                goAdmin();
              } else {
                setShowLoginModal(true);
              }
            }}
            title={isAdmin ? "Masuk ke Admin Panel" : "Login Admin"}
            style={{
              background: isAdmin ? '#dcfce7' : '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '18px',
              transition: 'all 0.2s'
            }}
          >
            {isAdmin ? '🛡️' : '👤'}
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      {view !== 'dashboard' && (
        <div style={{ padding: '14px 32px 0', fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', animation: 'fadeIn 0.3s ease-in-out' }}>
          <span onClick={goDashboard} style={{ cursor: 'pointer', color: '#C8102E', fontWeight: 600 }}>Dashboard</span>
          <span>/</span>
          <span style={{ fontWeight: 600, color: '#334155' }}>
            {view === 'branch' ? activeBranch : view === 'upload' ? 'Upload Activity' : 'Admin Panel'}
          </span>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        <div className="fade-in" key={view}>
          {view === 'dashboard' && <Dashboard branches={branches} goBranch={goBranch} />}
          {view === 'branch' && (
            <BranchView 
              branches={branches} 
              activeBranch={activeBranch} 
              updateActivityField={updateActivityField} 
              uploadPhoto={uploadPhoto}
              verifyActivity={isAdmin ? verifyActivity : null} 
            />
          )}
          {view === 'upload' && (
            <UploadView 
              branches={branches} 
              updateActivityField={updateActivityField} 
              uploadPhoto={uploadPhoto}
              verifyActivity={isAdmin ? verifyActivity : null}
            />
          )}
          {view === 'admin' && (
            <AdminPanel 
              token={adminToken} 
              onUpdate={fetchData} 
              goDashboard={goDashboard} 
            />
          )}
        </div>
      </div>

      {/* Admin Login Modal */}
      {showLoginModal && (
        <div onClick={() => setShowLoginModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '380px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginTop: 0, marginBottom: '8px' }}>🔐 Login Admin Pusat</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Masukkan master password untuk mengakses fitur verifikasi dan update database Excel.</p>
            
            <form onSubmit={handleLogin}>
              <input 
                type="password" 
                placeholder="Master Password (cth: admin123)" 
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', marginBottom: '12px' }}
              />
              
              {loginError && (
                <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>
                  ❌ {loginError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowLoginModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#C8102E', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
                >
                  Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
