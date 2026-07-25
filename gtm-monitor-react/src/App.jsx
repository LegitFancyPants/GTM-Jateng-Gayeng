import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import BranchView from './components/BranchView';
import UploadView from './components/UploadView';
import AdminPanel from './components/AdminPanel';
import LoginPage from './components/Auth/LoginPage';
import SignUpPage from './components/Auth/SignUpPage';
import { formatBranch } from './utils';
import './index.css';

function App() {
  const [branches, setBranches] = useState([]);
  const [view, setView] = useState('dashboard'); // dashboard, branch, upload, admin
  const [activeBranch, setActiveBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  // Universal Auth State
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gtm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('gtm_token') || null);
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isAdmin = user && user.role === 'ADMIN';

  const fetchData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/api/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      } else if (res.status === 401) {
        // Token expired or invalid
        handleLogout(false);
      }
    } catch (err) {
      console.error('Failed to fetch data from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // 15-Minute Inactivity Auto-Logout Timer
  useEffect(() => {
    if (!user || !token) return;

    let timeoutId;
    const INACTIVITY_TIME = 15 * 60 * 1000; // 15 menit

    const handleTimeout = () => {
      alert('⏰ Sesi Anda telah berakhir karena tidak ada aktivitas selama 15 menit. Silakan login kembali.');
      handleLogout(false);
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleTimeout, INACTIVITY_TIME);
    };

    // Set initial timer
    resetTimer();

    // Event listeners for activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user, token]);

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('gtm_token', newToken);
    localStorage.setItem('gtm_user', JSON.stringify(newUser));
    
    if (newUser.role === 'USER' && newUser.branchName) {
      setView('branch');
      setActiveBranch(newUser.branchName);
    } else {
      setView('dashboard');
    }
  };

  const handleLogout = (showAlert = true) => {
    if (showAlert) {
      const confirmLogout = window.confirm('Apakah Anda yakin ingin keluar dari portal?');
      if (!confirmLogout) return;
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('gtm_user');
    localStorage.removeItem('gtm_token');
    setView('dashboard');
    setAuthView('login');
    setShowProfileModal(false);
  };

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
    if (!isAdmin) {
      alert('Akses ditolak. Hanya Administrator yang dapat membuka Admin Panel.');
      return;
    }
    setView('admin');
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
      const res = await fetch('http://localhost:3001/api/activities', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          branchName,
          projectName,
          type: actType,
          status: 'upload',
          [fieldKey === 'planDate' ? 'planDate' : 'actualDate']: value
        })
      });
      if (res.ok) {
        fetchData();
      } else if (res.status === 403 || res.status === 401) {
        const errData = await res.json();
        alert(`❌ ${errData.error || errData.message}`);
        fetchData(); // revert optimistic update
      }
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
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (res.ok) {
        fetchData();
      } else if (res.status === 403 || res.status === 401) {
        const errData = await res.json();
        alert(`❌ ${errData.error || errData.message}`);
        fetchData();
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
    }
  };

  // Verify activity at PROJECT level (Admin only)
  const verifyActivity = async (branchName, projectName, actType) => {
    if (!isAdmin) return;

    try {
      const res = await fetch('http://localhost:3001/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

  // 1. Auth Gate / Routing
  if (!user || !token) {
    if (authView === 'signup') {
      return <SignUpPage branches={branches} onLoginSuccess={handleLoginSuccess} goLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onLoginSuccess={handleLoginSuccess} goSignUp={() => setAuthView('signup')} />;
  }

  // 2. Loading screen when logged in
  if (loading && branches.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#C8102E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '20px', animation: 'pulse 1.5s infinite' }}>GTM</div>
        <div style={{ fontWeight: 600, fontSize: '15px' }}>⏳ Memuat data dari server...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Top Bar Header */}
      <div className="header-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '16px', letterSpacing: '-0.5px', boxShadow: '0 4px 10px rgba(200,16,46,0.3)' }}>GTM</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>GTM Activity Monitor</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              {isAdmin ? '🛡️ Administrator Control Panel' : `Branch: ${formatBranch(user.branchName)}`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {view !== 'upload' && view !== 'admin' && (
            <button 
              onClick={goUpload} 
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>+</span> Upload Activity
            </button>
          )}

          {isAdmin && view !== 'admin' && (
            <button
              onClick={goAdmin}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>⚙️</span> Admin Panel
            </button>
          )}

          {/* Profile Icon Button */}
          <button
            onClick={() => setShowProfileModal(true)}
            title="Informasi Akun & Logout"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '1.5px solid #cbd5e1',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#C8102E'; e.currentTarget.style.background = '#fff'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
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
            {view === 'branch' ? activeBranch : view === 'upload' ? 'Upload Activity' : 'Admin Control Center'}
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
              token={token} 
              branches={branches}
              onUpdate={fetchData} 
              goDashboard={goDashboard} 
              onLogout={() => handleLogout(true)}
              verifyActivity={verifyActivity}
              updateActivityField={updateActivityField}
              uploadPhoto={uploadPhoto}
            />
          )}
        </div>
      </div>

      {/* User Profile Modal / Popup */}
      {showProfileModal && (
        <div onClick={() => setShowProfileModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px', animation: 'fadeIn 0.2s' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '300px', padding: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', textAlign: 'center', animation: 'fadeIn 0.2s' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: isAdmin ? '#fee2e2' : '#f1f5f9', color: isAdmin ? '#C8102E' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', margin: '0 auto 12px', border: '1px solid #cbd5e1' }}>
              {isAdmin ? '🛡️' : '👤'}
            </div>
            
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>{user.fullName}</h3>
            <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '14px', fontWeight: 500 }}>@{user.username}</div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '6px', textAlign: 'left', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Hak Akses:</span>
                <span style={{ fontWeight: 700, color: isAdmin ? '#C8102E' : '#0f172a' }}>{isAdmin ? 'Master Admin' : 'Tim Daerah'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Branch:</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>{isAdmin ? 'Semua Branch' : formatBranch(user.branchName)}</span>
              </div>
            </div>

            {/* Small Log out button at bottom left */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  handleLogout(true);
                }}
                style={{
                  padding: '2px 4px',
                  border: 'none',
                  background: 'transparent',
                  color: '#64748b',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'color 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseOut={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.textDecoration = 'none'; }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
