import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import BranchView from './components/BranchView';
import UploadView from './components/UploadView';
import AdminPanel from './components/AdminPanel';
import LoginPage from './components/Auth/LoginPage';
import { formatBranch, flatOdps, computeStats, BRANCH_COLORS } from './utils';
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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const lastLoginTimestamp = useRef(0);

  const dashboardTabRef = useRef(null);
  const uploadTabRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const updateIndicator = (targetView = view) => {
    let target = null;
    if (targetView === 'dashboard' || targetView === 'branch') {
      target = dashboardTabRef.current;
    } else if (targetView === 'upload') {
      target = uploadTabRef.current;
    }

    if (target && target.offsetWidth > 0) {
      setIndicatorStyle({
        left: target.offsetLeft,
        width: target.offsetWidth,
        opacity: 1
      });
    } else {
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
    }
  };

  useLayoutEffect(() => {
    updateIndicator();
    const timer = setTimeout(() => updateIndicator(), 50);
    const timer2 = setTimeout(() => updateIndicator(), 200);
    window.addEventListener('resize', updateIndicator);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [view, loading, token, branches]);

  const isAdmin = user && user.role === 'ADMIN';

  // ─── PRE-COMPUTED DATA (dihitung 1x saat branches berubah, reused saat ganti tab) ───
  const allOdps = useMemo(() => flatOdps(branches), [branches]);

  const kpi = useMemo(() => computeStats(branches), [branches]);

  const statusChips = useMemo(() => {
    const counts = { GREEN: 0, YELLOW: 0, BLACK: 0, RED: 0 };
    allOdps.forEach(o => {
      const pct = o.total > 0 ? o.used / o.total : 0;
      const status = o.used === 0 ? 'BLACK' : pct < 0.5 ? 'GREEN' : pct < 0.75 ? 'YELLOW' : 'RED';
      counts[status] = (counts[status] || 0) + 1;
    });
    return [
      { label: 'Green', count: counts.GREEN, color: '#16a34a' },
      { label: 'Yellow', count: counts.YELLOW, color: '#d97706' },
      { label: 'Black', count: counts.BLACK, color: '#334155' }
    ];
  }, [allOdps]);

  const ranking = useMemo(() => {
    return (branches || []).map(b => {
      const st = computeStats([b]);
      const hash = (str) => { let h = 0; for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); };
      const delta = (hash(b.name || '') % 14) - 5;
      const projCount = (b && Array.isArray(b.projects)) ? b.projects.length : 0;
      return {
        name: b.name, occRate: st.occRate, projCount, actPct: st.actCompletionPct,
        color: BRANCH_COLORS[b.name?.toString().trim().toUpperCase()] || BRANCH_COLORS[b.name] || '#64748b', delta
      };
    }).sort((a, b) => a.occRate - b.occRate);
  }, [branches]);

  const { mapBounds, mapPoints } = useMemo(() => {
    const lats = allOdps.map(o => o.lat).filter(Number.isFinite);
    const lons = allOdps.map(o => o.lon).filter(Number.isFinite);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const calculatedBounds = (lats.length > 0 && lons.length > 0 && Number.isFinite(minLat) && Number.isFinite(maxLat) && (minLat !== maxLat || minLon !== maxLon))
      ? [[minLat, minLon], [maxLat, maxLon]]
      : [[-7.5, 109], [-6.5, 111]];
    
    // Sample max 120 ODP points per branch for fast map rendering (~720 markers total)
    const validOdps = allOdps.filter(o => Number.isFinite(o.lat) && Number.isFinite(o.lon));
    const branchBuckets = {};
    validOdps.forEach(o => {
      if (!branchBuckets[o.branch]) branchBuckets[o.branch] = [];
      if (branchBuckets[o.branch].length < 120) {
        branchBuckets[o.branch].push(o);
      }
    });

    const sampledOdps = Object.values(branchBuckets).flat();
    const points = sampledOdps.map(o => ({
      lat: o.lat, lon: o.lon,
      color: BRANCH_COLORS[o.branch?.toString().trim().toUpperCase()] || BRANCH_COLORS[o.branch] || '#64748b',
      key: o.odp, branch: o.branch
    }));
    return { mapBounds: calculatedBounds, mapPoints: points };
  }, [allOdps]);

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

  // Browser Back/Forward (popstate) Navigation Handler
  useEffect(() => {
    if (!user || !token) return;

    // Initial state setup for browser history
    if (!window.history.state) {
      window.history.replaceState({ view, activeBranch }, '');
    }

    const handlePopState = (event) => {
      if (event.state && event.state.view) {
        setView(event.state.view);
        setActiveBranch(event.state.activeBranch || null);
      } else {
        setView('dashboard');
        setActiveBranch(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, token, view, activeBranch]);

  const navigateTo = useCallback((newView, newBranch = null, replace = false) => {
    updateIndicator(newView);
    setView(newView);
    setActiveBranch(newBranch);
    const stateObj = { view: newView, activeBranch: newBranch };
    if (replace) {
      window.history.replaceState(stateObj, '');
    } else {
      window.history.pushState(stateObj, '');
    }
  }, []);

  const handleLoginSuccess = (newToken, newUser) => {
    document.activeElement?.blur();
    lastLoginTimestamp.current = Date.now();
    setShowProfileModal(false);
    setShowLogoutConfirmModal(false);
    setBranches([]);
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('gtm_token', newToken);
    localStorage.setItem('gtm_user', JSON.stringify(newUser));
    
    // Semua akun (Admin & User) selalu masuk ke Dashboard terlebih dahulu
    navigateTo('dashboard', null, true);
  };

  const executeLogout = () => {
    setUser(null);
    setToken(null);
    setBranches([]);
    localStorage.removeItem('gtm_user');
    localStorage.removeItem('gtm_token');
    setView('dashboard');
    setActiveBranch(null);
    setShowProfileModal(false);
    setShowLogoutConfirmModal(false);
    window.history.replaceState(null, '');
  };

  const handleLogout = (showAlert = true) => {
    if (typeof showAlert !== 'boolean') showAlert = true;
    // Mencegah munculnya pop-up konfirmasi logout akibat retargeting event Enter/fokus otomatis dalam 1 detik setelah login
    if (showAlert && Date.now() - lastLoginTimestamp.current < 1000) {
      return;
    }
    if (showAlert) {
      setShowLogoutConfirmModal(true);
      return;
    }
    executeLogout();
  };

  const goDashboard = useCallback(() => {
    navigateTo('dashboard', null);
  }, [navigateTo]);

  const goBranch = useCallback((name) => {
    navigateTo('branch', name);
  }, [navigateTo]);

  const goUpload = useCallback(() => {
    navigateTo('upload', null);
  }, [navigateTo]);

  const goAdmin = useCallback(() => {
    if (!isAdmin) {
      alert('Akses ditolak. Hanya Administrator yang dapat membuka Admin Panel.');
      return;
    }
    navigateTo('admin', null);
  }, [isAdmin, navigateTo]);

  // Update activity field at PROJECT level
  const updateActivityField = useCallback(async (branchName, projectName, actType, fieldKey, value) => {
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
        if (fieldKey === 'planDate') {
          a.planDate = value;
        } else {
          a[fieldKey] = value;
          a.keterangan = value;
          if (!a.fields) a.fields = {};
          a.fields[fieldKey] = value;
        }
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
          ...(fieldKey === 'planDate' ? { planDate: value } : { keterangan: value })
        })
      });
      if (res.ok) {
        fetchData();
        return true;
      } else if (res.status === 403 || res.status === 401) {
        const errData = await res.json();
        alert(`❌ ${errData.error || errData.message}`);
        fetchData(); // revert optimistic update
        return false;
      }
    } catch (err) {
      console.error('Error saving activity:', err);
      return false;
    }
    return true;
  }, [token]);

  // Upload photo at PROJECT level
  const uploadPhoto = useCallback(async (branchName, projectName, actType, file) => {
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
        const resData = await res.json();
        const realPhotoUrl = resData?.activity?.photoUrl;
        setBranches(prev => {
          const newBranches = JSON.parse(JSON.stringify(prev));
          const b = newBranches.find(x => x.name === branchName);
          const p = b?.projects.find(x => x.name === projectName);
          if (p) {
            let a = p.activities?.find(x => x.type === actType);
            if (a) {
              a.photoUrl = realPhotoUrl || a.photoUrl;
              a.status = 'upload';
            }
          }
          return newBranches;
        });
        fetchData();
      } else if (res.status === 403 || res.status === 401) {
        const errData = await res.json();
        alert(`❌ ${errData.error || errData.message}`);
        fetchData();
      } else {
        fetchData();
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      fetchData();
    }
  }, [token]);

  // Verify activity at PROJECT level (Admin only)
  const verifyActivity = useCallback(async (branchName, projectName, actType) => {
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
  }, [isAdmin, token]);

  // 1. Auth Gate / Routing
  if (!user || !token) {
    return <LoginPage branches={branches} onLoginSuccess={handleLoginSuccess} />;
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
      <div className="header-container" style={{ position: 'relative' }}>
        {/* Left: Brand Logo & Title */}
        <div 
          onClick={goDashboard} 
          title="Klik untuk kembali ke Halaman Awal (Dashboard)"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '14px', 
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'opacity 0.15s ease'
          }}
          onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '16px', letterSpacing: '-0.5px', boxShadow: '0 4px 10px rgba(200,16,46,0.3)' }}>GTM</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>GTM Activity Monitor</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              {isAdmin ? 'Administrator Control Panel' : `Branch: ${formatBranch(user.branchName)}`}
            </div>
          </div>
        </div>

        {/* Center: Symmetrically Centered Navigation Tabs */}
        <div 
          style={{ 
            position: 'absolute', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '32px',
            height: '100%'
          }}
        >
          <button 
            type="button"
            ref={dashboardTabRef}
            onClick={goDashboard} 
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 4px',
              fontSize: '14.5px',
              fontWeight: (view === 'dashboard' || view === 'branch') ? 700 : 500,
              color: (view === 'dashboard' || view === 'branch') ? '#C8102E' : '#64748b',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              outline: 'none'
            }}
            onMouseOver={e => { if (view !== 'dashboard' && view !== 'branch') e.currentTarget.style.color = '#0f172a'; }}
            onMouseOut={e => { if (view !== 'dashboard' && view !== 'branch') e.currentTarget.style.color = '#64748b'; }}
          >
            Dashboard
          </button>

          <button 
            type="button"
            ref={uploadTabRef}
            onClick={goUpload} 
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 4px',
              fontSize: '14.5px',
              fontWeight: view === 'upload' ? 700 : 500,
              color: view === 'upload' ? '#C8102E' : '#64748b',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              outline: 'none'
            }}
            onMouseOver={e => { if (view !== 'upload') e.currentTarget.style.color = '#0f172a'; }}
            onMouseOut={e => { if (view !== 'upload') e.currentTarget.style.color = '#64748b'; }}
          >
            Upload Activity
          </button>

          {/* Sliding underline highlight line */}
          <div 
            style={{
              position: 'absolute',
              bottom: 0,
              height: '3px',
              backgroundColor: '#C8102E',
              borderRadius: '3px 3px 0 0',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity
            }}
          />
        </div>

        {/* Right: Profile Button */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
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
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#C8102E'; e.currentTarget.style.background = '#fff'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="fade-in" key={view}>
          {view === 'dashboard' && <Dashboard branches={branches} goBranch={goBranch} kpi={kpi} statusChips={statusChips} ranking={ranking} mapBounds={mapBounds} mapPoints={mapPoints} />}
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
              kpi={kpi}
            />
          )}
        </div>
      </div>

      {/* User Profile Flyout Dropdown */}
      {showProfileModal && (
        <>
          {/* Transparent Backdrop Overlay to close on outside click */}
          <div 
            onClick={() => setShowProfileModal(false)} 
            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
          />
          
          <div className="profile-dropdown-card">
            {/* Header info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px 14px 12px', borderBottom: '1px solid #f1f5f9' }}>
              <div className="profile-avatar-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>

              <div style={{ overflow: 'hidden', textAlign: 'left' }}>
                <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.fullName}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginTop: '1px' }}>
                  @{user.username}
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div style={{ padding: '12px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Branch</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {isAdmin ? 'Semua Branch' : formatBranch(user.branchName)}
                </span>
              </div>
            </div>

            {/* Action Items List */}
            <div style={{ paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileModal(false);
                    goAdmin();
                  }}
                  className="profile-menu-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06-.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span>Admin Panel</span>
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>→</span>
                </button>
              )}

              {/* Log Out Item with Red Door Icon */}
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  handleLogout(true);
                }}
                className="profile-menu-item logout"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Log Out</span>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Custom Logout Confirmation Modal */}
      {showLogoutConfirmModal && (
        <div 
          onClick={() => setShowLogoutConfirmModal(false)}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(15, 23, 42, 0.45)', 
            backdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 300, 
            padding: '20px', 
            animation: 'fadeIn 0.2s ease-in-out' 
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: '#ffffff', 
              borderRadius: '16px', 
              width: '100%', 
              maxWidth: '340px', 
              padding: '24px', 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', 
              border: '1px solid #e2e8f0', 
              textAlign: 'center', 
              animation: 'flyoutSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)' 
            }}
          >
            <div 
              style={{ 
                width: '52px', 
                height: '52px', 
                borderRadius: '50%', 
                background: '#fef2f2', 
                color: '#dc2626', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 16px', 
                border: '1px solid #fee2e2' 
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
              Konfirmasi Log Out
            </h3>
            
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 22px', lineHeight: 1.5 }}>
              Apakah Anda yakin ingin keluar dari Portal GTM Activity Monitor?
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowLogoutConfirmModal(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
              >
                Batal
              </button>

              <button
                onClick={executeLogout}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #dc2626',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#b91c1c'; e.currentTarget.style.borderColor = '#b91c1c'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.borderColor = '#dc2626'; }}
              >
                Ya, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
