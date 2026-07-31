import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import BranchView from './components/BranchView';
import UploadView from './components/UploadView';
import AdminPanel from './components/AdminPanel';
import LoginPage from './components/Auth/LoginPage';
import { formatBranch, flatOdps, computeStats, BRANCH_COLORS } from './utils';
import { API_BASE_URL } from './apiConfig';
import './index.css';

function App() {
  const [branches, setBranches] = useState([]);
  const [importMeta, setImportMeta] = useState(null); // Jateng DIY summary dari ImportMeta
  const [view, setView] = useState('landing'); // landing, dashboard, branch, upload, admin
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeBranch, setActiveBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeDesignFilter, setTypeDesignFilter] = useState('ALL'); // ALL, Greenfield, Brownfield

  // Universal Auth State
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('gtm_user') || localStorage.getItem('gtm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('gtm_token') || localStorage.getItem('gtm_token') || null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const lastLoginTimestamp = useRef(0);

  const overviewTabRef = useRef(null);
  const monitoringTabRef = useRef(null);
  const activityTabRef = useRef(null);
  const controlTabRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const updateIndicator = useCallback((targetView = view) => {
    let target = null;
    if (targetView === 'landing') {
      target = overviewTabRef.current;
    } else if (targetView === 'dashboard' || targetView === 'branch') {
      target = monitoringTabRef.current;
    } else if (targetView === 'upload') {
      target = activityTabRef.current;
    } else if (targetView === 'admin') {
      target = controlTabRef.current;
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
  }, [view]);

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
  }, [view, loading, token, branches, updateIndicator]);

  const isAdmin = user && user.role === 'ADMIN';

  // Untuk halaman Upload Activity: Akun User (Non-Admin) HANYA menerima data branch tempat ia bertugas
  const uploadBranches = useMemo(() => {
    if (user && user.role === 'USER' && user.branchName) {
      const filtered = branches.filter(b => b.name === user.branchName);
      return filtered.length > 0 ? filtered : branches;
    }
    return branches;
  }, [branches, user]);

  // ─── PRE-COMPUTED DATA (dihitung 1x saat branches/typeDesignFilter berubah, reused saat ganti tab) ───
  const allOdps = useMemo(() => flatOdps(branches, typeDesignFilter), [branches, typeDesignFilter]);

  const kpiRaw = useMemo(() => computeStats(branches, typeDesignFilter), [branches, typeDesignFilter]);

  // Override KPI dengan nilai resmi dari file Excel (Jateng DIY summary) jika filter = ALL
  const kpi = useMemo(() => {
    if (typeDesignFilter === 'ALL' && importMeta && importMeta.occRate !== null) {
      return {
        ...kpiRaw,
        occRate: Math.round(importMeta.occRate * 1000) / 10,  // 0.121 -> 12.1
        totalAvai: importMeta.available || kpiRaw.totalAvai,
        totalUsed: importMeta.used || kpiRaw.totalUsed,
        totalPort: importMeta.total || kpiRaw.totalPort,
        odpCount: kpiRaw.odpCount,
        gapWoW: importMeta.gapWoW,
      };
    }
    return { ...kpiRaw, gapWoW: null };
  }, [kpiRaw, importMeta, typeDesignFilter]);

  const statusChips = useMemo(() => {
    const counts = { GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0, BLACK: 0 };
    allOdps.forEach(o => {
      const pct = o.total > 0 ? o.used / o.total : 0;
      const calcStatus = o.used === 0 ? 'BLACK' : pct < 0.25 ? 'GREEN' : pct < 0.50 ? 'YELLOW' : pct < 0.75 ? 'ORANGE' : 'RED';
      const status = (o.occStatus || calcStatus).toUpperCase();
      counts[status] = (counts[status] || 0) + 1;
    });
    return [
      { label: 'Green', count: counts.GREEN || 0, color: '#16a34a' },
      { label: 'Yellow', count: counts.YELLOW || 0, color: '#d97706' },
      { label: 'Orange', count: counts.ORANGE || 0, color: '#f97316' },
      { label: 'Red', count: counts.RED || 0, color: '#dc2626' },
      { label: 'Black', count: counts.BLACK || 0, color: '#334155' }
    ];
  }, [allOdps]);

  const ranking = useMemo(() => {
    return (branches || []).map(b => {
      const st = computeStats([b], typeDesignFilter);
      // Gunakan OCC BRANCH dari kolom Excel jika filter ALL dan b.occRate tersedia, jika tidak gunakan st.occRate
      const occRate = (typeDesignFilter === 'ALL' && b.occRate !== null && b.occRate !== undefined)
        ? Math.round(b.occRate * 1000) / 10
        : st.occRate;
      // Gunakan GAP WOW dari Excel (persentase delta) — bukan hash palsu
      const delta = (b.gapWoW !== null && b.gapWoW !== undefined)
        ? Math.round(b.gapWoW * 1000) / 10  // 0.058 -> 5.8, -0.076 -> -7.6
        : 0;
      const filteredProjs = (b && Array.isArray(b.projects))
        ? (typeDesignFilter === 'ALL' ? b.projects : b.projects.filter(p => (p.typeDesign || 'Greenfield') === typeDesignFilter))
        : [];
      return {
        name: b.name, occRate, projCount: filteredProjs.length, actPct: st.actCompletionPct,
        color: BRANCH_COLORS[b.name?.toString().trim().toUpperCase()] || BRANCH_COLORS[b.name] || '#64748b', delta
      };
    }).sort((a, b) => a.occRate - b.occRate);
  }, [branches, typeDesignFilter]);

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
    try {
      setLoading(true);
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const [dataRes, metaRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/data`, { headers }),
        fetch(`${API_BASE_URL}/api/import-meta`, { headers }).catch(() => null)
      ]);
      if (dataRes.ok) {
        const data = await dataRes.json();
        setBranches(data);
      }
      if (metaRes && metaRes.ok) {
        const meta = await metaRes.json();
        setImportMeta(meta);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Sesi pengguna tetap aktif selama tab browser masih dibuka
  // (Pengguna akan ter-logout otomatis hanya jika keluar dari tab/browser atau menekan Log Out di profil)

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
    sessionStorage.setItem('gtm_token', newToken);
    sessionStorage.setItem('gtm_user', JSON.stringify(newUser));
    localStorage.setItem('gtm_token', newToken);
    localStorage.setItem('gtm_user', JSON.stringify(newUser));
    
    // Semua akun (Admin & User) selalu masuk ke Dashboard terlebih dahulu
    navigateTo('dashboard', null, true);
  };

  const executeLogout = () => {
    setUser(null);
    setToken(null);
    setBranches([]);
    sessionStorage.removeItem('gtm_user');
    sessionStorage.removeItem('gtm_token');
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
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    navigateTo('dashboard', null);
  }, [user, navigateTo]);

  const goBranch = useCallback((name) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (!isAdmin) return;
    navigateTo('branch', name);
  }, [user, isAdmin, navigateTo]);

  const goUpload = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    navigateTo('upload', null);
  }, [user, navigateTo]);

  const goAdmin = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (!isAdmin) {
      alert('Akses ditolak. Hanya Administrator yang dapat membuka Admin Panel.');
      return;
    }
    navigateTo('admin', null);
  }, [user, isAdmin, navigateTo]);

  // Update activity field at PROJECT level
  // Update activity field at PROJECT level
  const updateActivityField = useCallback(async (branchName, projectName, actType, fieldKey, value) => {
    let targetStatus = 'upload';
    const b = branches.find(x => x.name === branchName);
    const p = b?.projects.find(x => x.name === projectName);
    let a = p?.activities?.find(x => x.type === actType);

    let hasDate = false;
    let hasPhoto = false;

    if (a) {
      hasDate = Boolean(a.planDate);
      hasPhoto = Boolean(a.photoUrl && a.photoUrl !== 'uploading...');
    }

    if (fieldKey === 'planDate') {
      hasDate = Boolean(value);
    } else if (fieldKey === 'photoUrl') {
      hasPhoto = Boolean(value && value !== 'uploading...');
    }

    if (a?.status === 'verified') {
      targetStatus = 'verified';
    } else if (actType === 'tsel_menyapa') {
      targetStatus = (hasDate && hasPhoto) ? 'upload' : 'belum';
    } else {
      targetStatus = value ? 'upload' : 'belum';
    }

    // Optimistic UI Update
    setBranches(prev => {
      const newBranches = JSON.parse(JSON.stringify(prev));
      const bDraft = newBranches.find(x => x.name === branchName);
      const pDraft = bDraft?.projects.find(x => x.name === projectName);
      if (pDraft) {
        if (!pDraft.activities) pDraft.activities = [];
        let aDraft = pDraft.activities.find(x => x.type === actType);
        if (!aDraft) {
          aDraft = { type: actType, status: 'belum' };
          pDraft.activities.push(aDraft);
        }
        if (fieldKey === 'planDate') {
          aDraft.planDate = value;
        } else {
          aDraft[fieldKey] = value;
          aDraft.keterangan = value;
          if (!aDraft.fields) aDraft.fields = {};
          aDraft.fields[fieldKey] = value;
        }

        if (aDraft.status !== 'verified') {
          aDraft.status = targetStatus;
        }
      }
      return newBranches;
    });

    try {
      const res = await fetch(`${API_BASE_URL}/api/activities`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          branchName,
          projectName,
          type: actType,
          status: targetStatus,
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
  }, [token, branches]);

  // Upload photo at PROJECT level
  const uploadPhoto = useCallback(async (branchName, projectName, actType, file) => {
    let targetStatus = 'upload';
    const b = branches.find(x => x.name === branchName);
    const p = b?.projects.find(x => x.name === projectName);
    let a = p?.activities?.find(x => x.type === actType);

    let hasDate = Boolean(a?.planDate);
    // Since we are uploading a photo, hasPhoto becomes true optimistically
    
    if (a?.status === 'verified') {
      targetStatus = 'verified';
    } else if (actType === 'tsel_menyapa') {
      targetStatus = hasDate ? 'upload' : 'belum';
    } else {
      targetStatus = 'upload';
    }

    // Optimistic UI Update
    setBranches(prev => {
      const newBranches = JSON.parse(JSON.stringify(prev));
      const bDraft = newBranches.find(x => x.name === branchName);
      const pDraft = bDraft?.projects.find(x => x.name === projectName);
      if (pDraft) {
        if (!pDraft.activities) pDraft.activities = [];
        let aDraft = pDraft.activities.find(x => x.type === actType);
        if (!aDraft) {
          aDraft = { type: actType, status: 'belum' };
          pDraft.activities.push(aDraft);
        }
        aDraft.photoUrl = 'uploading...';
        if (aDraft.status !== 'verified') {
          aDraft.status = targetStatus;
        }
      }
      return newBranches;
    });

    const formData = new FormData();
    formData.append('branchName', branchName);
    formData.append('projectName', projectName);
    formData.append('wokName', p?.wok || 'WOK');
    formData.append('type', actType);
    formData.append('status', targetStatus);
    formData.append('photo', file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/activities`, {
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
              if (a.status !== 'verified') {
                if (actType === 'tsel_menyapa') {
                  const hasDate = Boolean(a.planDate);
                  const hasPhoto = Boolean(a.photoUrl && a.photoUrl !== 'uploading...');
                  a.status = (hasDate && hasPhoto) ? 'upload' : 'belum';
                } else {
                  a.status = 'upload';
                }
              }
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
      const res = await fetch(`${API_BASE_URL}/api/verify`, {
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
  }, [isAdmin, token, fetchData]);

  const deletePhoto = useCallback(async (branchName, projectName, actType) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/activities/delete-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ branchName, projectName, type: actType })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchData();
        return true;
      } else {
        alert(`❌ ${data.message || 'Gagal menghapus foto.'}`);
        return false;
      }
    } catch (err) {
      console.error('Error deleting photo:', err);
      alert('❌ Terjadi kesalahan saat menghapus foto.');
      return false;
    }
  }, [token, fetchData]);

function LoadingScreen() {
  const [dotsCount, setDotsCount] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotsCount(prev => (prev % 3) + 1);
    }, 450);
    return () => clearInterval(interval);
  }, []);

  const dots = '.'.repeat(dotsCount);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', color: '#64748B', gap: '18px' }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: '18px',
        boxShadow: '0 8px 24px rgba(200, 16, 46, 0.35)',
        letterSpacing: '-0.5px'
      }}>
        GTM
      </div>
      <div style={{ fontWeight: 700, fontSize: '15px', color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>
        Memuat data dari server<span style={{ display: 'inline-block', width: '24px', textAlign: 'left' }}>{dots}</span>
      </div>
    </div>
  );
}

  // 1. Loading screen
  if (loading && branches.length === 0) {
    return <LoadingScreen />;
  }

  // 2. Login Modal Overlay (when triggered by user)
  const renderLoginModal = () => {
    if (!showLoginModal) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '440px', background: '#fff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
          <button 
            onClick={() => setShowLoginModal(false)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 10,
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: '#f1f5f9',
              color: '#64748b',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
          <LoginPage branches={branches} onLoginSuccess={(u, t) => { handleLoginSuccess(u, t); setShowLoginModal(false); }} />
        </div>
      </div>
    );
  };

  return (
    <div className="app-root-container">
      {renderLoginModal()}

      {/* ─── SINGLE UNIFIED PERSISTENT TOP NAVIGATION BAR (SEAMLESS ACROSS ALL PAGES) ─── */}
      <nav className="main-top-nav" style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #E2E8F0',
        padding: '16px 48px',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center'
      }}>
        {/* Left: LOGO BADGE GTM SAJA (Tanpa Teks) */}
        <div 
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', justifySelf: 'start' }} 
          onClick={() => setView('landing')}
          title="Klik untuk kembali ke Halaman Overview"
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '99px',
            background: 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '13px',
            color: '#FFFFFF',
            boxShadow: '0 4px 18px rgba(200, 16, 46, 0.35)',
            transition: 'transform 0.2s ease',
            flexShrink: 0
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            GTM
          </div>
        </div>

        {/* Center: Nav Menu Options (OVERVIEW, MONITORING, ACTIVITY, CONTROL Sejajar Tengah) */}
        <div className="nav-scroll-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '44px', justifySelf: 'center', paddingBottom: '4px' }}>
          <button
            ref={overviewTabRef}
            type="button"
            className="nav-tab-btn"
            onClick={() => setView('landing')}
            style={{
              background: 'none',
              border: 'none',
              color: view === 'landing' ? '#C8102E' : '#64748B',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '2px',
              cursor: 'pointer',
              transition: 'color 0.25s ease',
              padding: '6px 4px',
              outline: 'none'
            }}
            onMouseEnter={(e) => { if (view !== 'landing') e.currentTarget.style.color = '#FF5E00'; }}
            onMouseLeave={(e) => { if (view !== 'landing') e.currentTarget.style.color = '#64748B'; }}
          >
            OVERVIEW
          </button>

          <button
            ref={monitoringTabRef}
            type="button"
            className="nav-tab-btn"
            onClick={goDashboard}
            style={{
              background: 'none',
              border: 'none',
              color: (view === 'dashboard' || view === 'branch') ? '#C8102E' : '#64748B',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '2px',
              cursor: 'pointer',
              transition: 'color 0.25s ease',
              padding: '6px 4px',
              outline: 'none'
            }}
            onMouseEnter={(e) => { if (view !== 'dashboard' && view !== 'branch') e.currentTarget.style.color = '#FF5E00'; }}
            onMouseLeave={(e) => { if (view !== 'dashboard' && view !== 'branch') e.currentTarget.style.color = '#64748B'; }}
          >
            MONITORING
          </button>

          <button
            ref={activityTabRef}
            type="button"
            className="nav-tab-btn"
            onClick={goUpload}
            style={{
              background: 'none',
              border: 'none',
              color: view === 'upload' ? '#C8102E' : '#64748B',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '2px',
              cursor: 'pointer',
              transition: 'color 0.25s ease',
              padding: '6px 4px',
              outline: 'none'
            }}
            onMouseEnter={(e) => { if (view !== 'upload') e.currentTarget.style.color = '#FF5E00'; }}
            onMouseLeave={(e) => { if (view !== 'upload') e.currentTarget.style.color = '#64748B'; }}
          >
            ACTIVITY
          </button>

          {isAdmin && (
            <button
              ref={controlTabRef}
              type="button"
              className="nav-tab-btn"
              onClick={goAdmin}
              style={{
                background: 'none',
                border: 'none',
                color: view === 'admin' ? '#C8102E' : '#64748B',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '2px',
                cursor: 'pointer',
                transition: 'color 0.25s ease',
                padding: '6px 4px',
                outline: 'none'
              }}
              onMouseEnter={(e) => { if (view !== 'admin') e.currentTarget.style.color = '#FF5E00'; }}
              onMouseLeave={(e) => { if (view !== 'admin') e.currentTarget.style.color = '#64748B'; }}
            >
              CONTROL
            </button>
          )}

          {/* Continuous Smooth Sliding Active Underline Highlight Line */}
          <div 
            style={{
              position: 'absolute',
              bottom: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #C8102E 0%, #FF5E00 100%)',
              borderRadius: '99px',
              boxShadow: '0 0 10px rgba(255, 94, 0, 0.5)',
              transition: 'left 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity
            }}
          />
        </div>

        {/* Right: Action Button "MASUK" / Profile Avatar */}
        <div style={{ justifySelf: 'end' }}>
          {!user ? (
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              style={{
                padding: '10px 28px',
                borderRadius: '50px',
                border: 'none',
                background: 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '1.5px',
                cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(200, 16, 46, 0.3)',
                transition: 'all 0.25s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 94, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 4px 18px rgba(200, 16, 46, 0.3)';
              }}
            >
              MASUK
            </button>
          ) : (
            <div 
              onClick={() => setShowProfileModal(true)}
              className="profile-badge-btn" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '5px 14px', 
                borderRadius: '50px', 
                background: '#FAFAFC', 
                cursor: 'pointer',
                border: '1px solid #E2E8F0',
                transition: 'all 0.25s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FF5E00'; e.currentTarget.style.background = '#FFFFFF'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#FAFAFC'; }}
            >
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>
                {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
              </div>
              <div className="profile-badge-name" style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>{user.fullName || user.username}</div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content View Switcher */}
      <div className={view === 'landing' ? 'main-content-full' : 'main-content'}>
        <div className="fade-in" key={view}>
          {view === 'landing' && (
            <LandingPage
              onExplore={() => {
                if (!user) setShowLoginModal(true);
                else setView('dashboard');
              }}
              onLogin={() => setShowLoginModal(true)}
              onGoDashboard={goDashboard}
              onGoUpload={goUpload}
              kpi={kpi}
              importMeta={importMeta}
              branches={branches}
            />
          )}
          {view === 'dashboard' && (
            <Dashboard 
              branches={branches} 
              goBranch={goBranch} 
              kpi={kpi} 
              statusChips={statusChips} 
              ranking={ranking} 
              mapBounds={mapBounds} 
              mapPoints={mapPoints} 
              isAdmin={isAdmin} 
              typeDesignFilter={typeDesignFilter} 
              setTypeDesignFilter={setTypeDesignFilter} 
            />
          )}
          {view === 'branch' && (
            isAdmin ? (
              <BranchView 
                branches={branches} 
                activeBranch={activeBranch} 
                updateActivityField={updateActivityField} 
                uploadPhoto={uploadPhoto}
                verifyActivity={verifyActivity}
                deletePhoto={deletePhoto}
              />
            ) : (
              <Dashboard branches={branches} goBranch={goBranch} kpi={kpi} statusChips={statusChips} ranking={ranking} mapBounds={mapBounds} mapPoints={mapPoints} isAdmin={isAdmin} typeDesignFilter={typeDesignFilter} setTypeDesignFilter={setTypeDesignFilter} />
            )
          )}
          {view === 'upload' && (
            <UploadView 
              branches={uploadBranches} 
              initialBranch={activeBranch}
              updateActivityField={updateActivityField} 
              uploadPhoto={uploadPhoto}
              verifyActivity={isAdmin ? verifyActivity : null}
              deletePhoto={deletePhoto}
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
              deletePhoto={deletePhoto}
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
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
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
