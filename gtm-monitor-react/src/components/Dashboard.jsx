import { useState, useEffect, useMemo, memo } from 'react';

const BRANCH_WOK_MATRIX = [
  {
    branch: 'MAGELANG',
    woks: ['KEBUMEN', 'MAGELANG TEMANGGUNG']
  },
  {
    branch: 'PEKALONGAN',
    woks: ['BATANG', 'PEMALANG PURBALINGGA', 'TEGAL BREBES']
  },
  {
    branch: 'PURWOKERTO',
    woks: ['CILACAP BANYUMAS', 'WONOSOBO BANJARNEGARA']
  },
  {
    branch: 'SEMARANG',
    woks: ['DEMAK', 'JEPARA KUDUS - PATI', 'SEMARANG 1', 'SEMARANG 2']
  },
  {
    branch: 'SURAKARTA',
    woks: ['BOYOLALI', 'SRAGEN', 'SURAKARTA']
  },
  {
    branch: 'YOGYAKARTA',
    woks: ['YOGYA 1', 'YOGYA 2']
  }
];

const ACT_TYPES_ORDER = [
  { key: 'tsel_menyapa', shortLabel: 'Tsel Menyapa Warga' },
  { key: 'branding_outlet', shortLabel: 'Branding Downline/Outlet' },
  { key: 'bumdes', shortLabel: 'Kerjasama dengan BUMDES' },
  { key: 'rekrutmen_sf', shortLabel: 'Rekrutmen SF AKAMSI' },
  { key: 'open_table', shortLabel: 'Always ON Open Table' }
];

// Dynamic Color Helpers for Executive Summary Grand Total Row (Red -> Yellow -> Green)
function getDoneColor(val, max) {
  if (!max || max <= 0) return '#94A3B8';
  const ratio = Math.min(Math.max(val / max, 0), 1);
  if (ratio <= 0.5) {
    const t = ratio * 2;
    const r = Math.round(239 + (245 - 239) * t); // Red (#EF4444) to Yellow (#F59E0B)
    const g = Math.round(68 + (158 - 68) * t);
    const b = Math.round(68 + (11 - 68) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = (ratio - 0.5) * 2;
    const r = Math.round(245 + (74 - 245) * t);  // Yellow (#F59E0B) to Green (#4ADE80)
    const g = Math.round(158 + (222 - 158) * t);
    const b = Math.round(11 + (128 - 11) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function getNotYetColor(val, max) {
  if (!max || max <= 0) return '#94A3B8';
  // Dynamic range opposite of Done: max remaining -> Red, 0 remaining -> Green
  const doneEquivalent = Math.max(max - val, 0);
  return getDoneColor(doneEquivalent, max);
}

function getProgress35Color(pct) {
  const targetMax = 35; // Range 0% to 35%
  const ratio = Math.min(Math.max(pct / targetMax, 0), 1);
  return getDoneColor(ratio * 100, 100);
}

// Dashboard dibungkus React.memo agar TIDAK re-render saat menu profile di header dibuka/ditutup.
const Dashboard = memo(function Dashboard({ branches, goBranch, kpi, importMeta, statusChips, ranking, isAdmin, typeDesignFilter = 'ALL', setTypeDesignFilter }) {
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const lastUpdateFormatted = useMemo(() => {
    let rawDate = importMeta?.updatedAt || importMeta?.lastUpdate;

    if (!rawDate && branches && branches.length > 0) {
      let latestTime = 0;
      branches.forEach(b => {
        (b.projects || []).forEach(p => {
          (p.activities || []).forEach(a => {
            if (a.updatedAt) {
              const t = new Date(a.updatedAt).getTime();
              if (!isNaN(t) && t > latestTime) latestTime = t;
            }
            if (a.actualDate) {
              const t = new Date(a.actualDate).getTime();
              if (!isNaN(t) && t > latestTime) latestTime = t;
            }
          });
        });
      });
      if (latestTime > 0) {
        rawDate = new Date(latestTime);
      }
    }

    if (!rawDate) {
      rawDate = new Date();
    }

    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;

    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return `${d.getDate()} ${monthsIndo[d.getMonth()]} ${d.getFullYear()}`;
  }, [importMeta, branches]);

  useEffect(() => {
    const handleClickOutside = () => setIsStatusDropdownOpen(false);
    window.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const safeKpi = kpi || { occRate: 0, totalUsed: 0, totalPort: 0, totalAvai: 0, odpCount: 0, actCompletionPct: 0, actVerified: 0, actUploaded: 0, actBelum: 0 };
  const safeStatusChips = statusChips || [];
  const safeRanking = ranking || [];

  // Executive Summary Computation per Branch & WOK
  const executiveSummary = useMemo(() => {
    let grandTotalLop = 0;
    const grandTotalDone = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };
    const grandTotalNotYet = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };

    const rows = [];

    BRANCH_WOK_MATRIX.forEach(group => {
      const bData = (branches || []).find(b => (b.name || '').toString().trim().toUpperCase() === group.branch);
      const allProjects = bData?.projects || [];

      // Filter Greenfield Priority Projects
      const priorityProjects = allProjects.filter(p => {
        const isPriority = p.isPriority ?? (p.odpCount > 1 && p.occRate < 35);
        const isGreenfield = (p.typeDesign || 'Greenfield') === 'Greenfield';
        return isPriority && isGreenfield;
      });

      group.woks.forEach((wokName, wIdx) => {
        const wokProjects = priorityProjects.filter(p => {
          const pWok = (p.wok || '').toString().trim().toUpperCase();
          const cleanP = pWok.replace(/[\s-]/g, '');
          const cleanW = wokName.replace(/[\s-]/g, '');
          return pWok === wokName || cleanP === cleanW || cleanP.includes(cleanW) || cleanW.includes(cleanP);
        });

        const lopCount = wokProjects.length;
        grandTotalLop += lopCount;

        const done = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };
        const notYet = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };

        ACT_TYPES_ORDER.forEach(item => {
          const k = item.key;
          const verifiedCount = wokProjects.filter(p => p.activities?.some(a => a.type === k && a.status === 'verified')).length;
          done[k] = verifiedCount;
          notYet[k] = lopCount - verifiedCount;

          grandTotalDone[k] += verifiedCount;
          grandTotalNotYet[k] += lopCount - verifiedCount;
        });

        const totalDoneWok = ACT_TYPES_ORDER.reduce((s, item) => s + done[item.key], 0);
        const totalSlotsWok = lopCount * 5;
        const progressPct = totalSlotsWok > 0 ? Math.round((totalDoneWok / totalSlotsWok) * 1000) / 10 : 0;

        rows.push({
          branch: group.branch,
          wok: wokName,
          isFirstInBranch: wIdx === 0,
          isLastInBranch: wIdx === group.woks.length - 1,
          branchRowSpan: group.woks.length,
          lopCount,
          done,
          notYet,
          progressPct
        });
      });
    });

    const grandTotalDoneAll = ACT_TYPES_ORDER.reduce((s, item) => s + grandTotalDone[item.key], 0);
    const grandTotalSlotsAll = grandTotalLop * 5;
    const grandProgressPct = grandTotalSlotsAll > 0 ? Math.round((grandTotalDoneAll / grandTotalSlotsAll) * 1000) / 10 : 0;

    return {
      rows,
      grandTotalLop,
      grandTotalDone,
      grandTotalNotYet,
      grandProgressPct
    };
  }, [branches]);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* ─── 1. TOP HEADER & FILTER BAR (STYLE HARMONIZED WITH OVERVIEW) ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '3px', color: '#FF5E00', fontWeight: 800, marginBottom: '4px' }}>
            MONITORING DASHBOARD
          </div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
            Overview Kinerja Regional
          </h1>
          {lastUpdateFormatted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v4l3 3"></path>
                <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"></path>
              </svg>
              <span>Last update {lastUpdateFormatted}</span>
            </div>
          )}
        </div>

        {setTypeDesignFilter && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FAFAFC', padding: '5px', borderRadius: '50px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            {[
              { id: 'ALL', label: 'Semua Tipe' },
              { id: 'Greenfield', label: 'Greenfield' },
              { id: 'Brownfield', label: 'Brownfield' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTypeDesignFilter(f.id)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '50px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  background: typeDesignFilter === f.id ? 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)' : 'transparent',
                  color: typeDesignFilter === f.id ? '#FFFFFF' : '#64748B',
                  boxShadow: typeDesignFilter === f.id ? '0 4px 12px rgba(200, 16, 46, 0.3)' : 'none',
                  transition: 'all 0.25s ease'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── 2. KPI CARDS ROW (STYLE SELARAS DENGAN OVERVIEW) ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '28px'
      }}>
        {/* KPI 1: Total Occupancy Rate (Hero Accent Card) */}
        <div style={{
          background: 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)',
          color: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 6px 18px rgba(200, 16, 46, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            pointerEvents: 'none'
          }} />
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Total Occupancy Rate
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#FFFFFF', marginTop: '4px', letterSpacing: '-0.5px' }}>
              {safeKpi.occRate}<span style={{ fontSize: '18px', color: '#FFE600' }}>%</span>
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.9)', marginTop: '6px', fontWeight: 600 }}>
            {safeKpi.totalUsed.toLocaleString('id-ID')} / {safeKpi.totalPort.toLocaleString('id-ID')} port terpakai
          </div>
        </div>

        {/* KPI 2: Port Tersedia */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
          transition: 'transform 0.2s ease, border-color 0.2s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FF5E00'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = 'translateY(0px)'; }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Port Tersedia
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '4px', letterSpacing: '-0.5px' }}>
              {safeKpi.totalAvai.toLocaleString('id-ID')}
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px', fontWeight: 500 }}>
            dari total {safeKpi.totalPort.toLocaleString('id-ID')} port di {safeKpi.odpCount.toLocaleString('id-ID')} ODP
          </div>
        </div>

        {/* KPI 3: Status ODP & Dropdown Menu 5 Warna */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
          transition: 'transform 0.2s ease, border-color 0.2s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FF5E00'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = 'translateY(0px)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Status ODP
              </div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '4px', letterSpacing: '-0.5px' }}>
                {safeKpi.odpCount.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Dropdown Button Status Warna ODP */}
            <div style={{ position: 'relative' }}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsStatusDropdownOpen(!isStatusDropdownOpen);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '50px',
                  border: '1px solid #E2E8F0',
                  fontSize: '11px',
                  background: '#FAFAFC',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: isStatusDropdownOpen ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                <span style={{ fontWeight: 800, color: '#0F172A' }}>Rincian</span>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C8102E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* Dropdown Menu 5 Warna ODP */}
              {isStatusDropdownOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '210px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                    zIndex: 1000,
                    padding: '6px 0',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 800, color: '#64748B', borderBottom: '1px solid #F1F5F9', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Rincian Status ODP
                  </div>
                  {safeStatusChips.map(s => (
                    <div
                      key={s.label}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '16px 56px 12px 1fr',
                        alignItems: 'center',
                        padding: '8px 14px',
                        fontSize: '12px',
                        color: '#0F172A',
                        borderBottom: '1px solid #FAFAFC'
                      }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{s.label}</span>
                      <span style={{ color: '#64748B', fontWeight: 500 }}>:</span>
                      <span style={{ color: '#475569', fontWeight: 600, paddingLeft: '4px' }}>
                        {s.count} ODP
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px', fontWeight: 500 }}>
            Total {safeKpi.odpCount.toLocaleString('id-ID')} ODP terpantau dalam sistem
          </div>
        </div>

        {/* KPI 4: Aktivitas GTM Terverifikasi */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
          transition: 'transform 0.2s ease, border-color 0.2s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FF5E00'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = 'translateY(0px)'; }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Aktivitas GTM Terverifikasi
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '4px', letterSpacing: '-0.5px' }}>
              {safeKpi.actCompletionPct}<span style={{ fontSize: '18px', color: '#FF5E00' }}>%</span>
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px', fontWeight: 500 }}>
            {safeKpi.actVerified} verified · {safeKpi.actUploaded} upload · {safeKpi.actPending} belum
          </div>
        </div>
      </div>

      {/* ─── 3. RANKING BRANCH TABLE (STYLE HARMONIZED WITH OVERVIEW) ─── */}
      <div className="dashboard-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
              Ranking Branch Prioritas Peningkatan Occupancy
            </h2>
            <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 500 }}>
              Diurutkan dari occupancy terendah
            </div>
          </div>
        </div>

        <div className="table-responsive-wrapper">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '550px' }}>
            {safeRanking.map(b => (
              <div
                key={b.name}
                onClick={() => goBranch && goBranch(b.name)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 70px 80px 100px 110px',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: '#FAFAFC',
                  border: '1px solid #F1F5F9',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = b.color;
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#F1F5F9';
                  e.currentTarget.style.background = '#FAFAFC';
                  e.currentTarget.style.transform = 'translateX(0px)';
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0F172A', letterSpacing: '0.5px' }}>{b.name}</div>
                <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${b.occRate}%`, background: b.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>{b.occRate}%</div>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: b.delta >= 0 ? '#16A34A' : '#DC2626' }}>
                  {b.delta >= 0 ? `▲ +${b.delta}` : `▼ ${b.delta}`}%
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>{b.projCount} proyek</div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>{b.actPct}% GTM done</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 4. EXECUTIVE SUMMARY CARD (REKAP AKTIVITAS PER WOK & BRANCH) ─── */}
      <div className="dashboard-card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
              Executive Summary
            </h2>
            <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 500 }}>
              Rekapitulasi pencapaian aktivitas GTM berdasarkan WOK dan Branch
            </div>
          </div>
        </div>

        <div className="table-responsive-wrapper" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '65vh', borderRadius: '14px', border: '1px solid #E2E8F0', position: 'relative' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px', textAlign: 'center', minWidth: '1150px' }}>
            <thead>
              <tr style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 800 }}>
                <th style={{ position: 'sticky', top: 0, zIndex: 30, background: '#0F172A', color: '#FFFFFF', padding: '14px 12px', borderRight: '1px solid #1E293B', borderBottom: '1px solid #1E293B', width: '130px', verticalAlign: 'middle' }} rowSpan={2}>Branch</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 30, background: '#0F172A', color: '#FFFFFF', padding: '14px 12px', borderRight: '1px solid #1E293B', borderBottom: '1px solid #1E293B', width: '180px', verticalAlign: 'middle' }} rowSpan={2}>WOK</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 30, background: '#0F172A', color: '#FFFFFF', padding: '14px 12px', borderRight: '1px solid #1E293B', borderBottom: '1px solid #1E293B', width: '90px', verticalAlign: 'middle' }} rowSpan={2}>Jumlah LOP</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 25, background: '#14532D', color: '#FFFFFF', padding: '10px 12px', borderRight: '1px solid #15803D', borderBottom: '1px solid #15803D', textTransform: 'uppercase', letterSpacing: '0.5px' }} colSpan={5}>Done Activity</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 25, background: '#7F1D1D', color: '#FFFFFF', padding: '10px 12px', borderRight: '1px solid #B91C1C', borderBottom: '1px solid #B91C1C', textTransform: 'uppercase', letterSpacing: '0.5px' }} colSpan={5}>Not Yet Activity</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 30, background: '#0F172A', color: '#FFFFFF', padding: '14px 12px', borderBottom: '1px solid #1E293B', width: '90px', verticalAlign: 'middle' }} rowSpan={2}>Progress</th>
              </tr>
              <tr style={{ background: '#0F172A', color: '#FFFFFF', fontSize: '11px', fontWeight: 700 }}>
                {/* Subheaders for Done Activity (Dark Green + Crisp White Text) */}
                <th style={{ position: 'sticky', top: '36px', zIndex: 20, background: '#14532D', color: '#F0FDF4', padding: '10px 8px', borderRight: '1px solid #15803D', borderBottom: '2px solid #166534', boxShadow: '0 -2px 0 #14532D' }}>Tsel Menyapa Warga</th>
                <th style={{ position: 'sticky', top: '36px', zIndex: 20, background: '#14532D', color: '#F0FDF4', padding: '10px 8px', borderRight: '1px solid #15803D', borderBottom: '2px solid #166534', boxShadow: '0 -2px 0 #14532D' }}>Branding Downline/Outlet</th>
                <th style={{ position: 'sticky', top: '36px', zIndex: 20, background: '#14532D', color: '#F0FDF4', padding: '10px 8px', borderRight: '1px solid #15803D', borderBottom: '2px solid #166534', boxShadow: '0 -2px 0 #14532D' }}>Kerjasama dengan BUMDES</th>
                <th style={{ position: 'sticky', top: '36px', zIndex: 20, background: '#14532D', color: '#F0FDF4', padding: '10px 8px', borderRight: '1px solid #15803D', borderBottom: '2px solid #166534', boxShadow: '0 -2px 0 #14532D' }}>Rekrutmen SF AKAMSI</th>
                <th style={{ position: 'sticky', top: '36px', zIndex: 20, background: '#14532D', color: '#F0FDF4', padding: '10px 8px', borderRight: '1px solid #15803D', borderBottom: '2px solid #166534', boxShadow: '0 -2px 0 #14532D' }}>Always ON Open Table</th>

                {/* Subheaders for Not Yet Activity (Dark Red + Crisp White Text) */}
                <th style={{ position: 'sticky', top: '36px', zIndex: 20, background: '#7F1D1D', color: '#FEF2F2', padding: '10px 8px', borderRight: '1px solid #B91C1C', borderBottom: '2px solid #991B1B', boxShadow: '0 -2px 0 #7F1D1D' }}>Tsel Menyapa Warga</th>
                <th style={{ position: 'sticky', top: '36px', zIndex: 20, background: '#7F1D1D', color: '#FEF2F2', padding: '10px 8px', borderRight: '1px solid #B91C1C', borderBottom: '2px solid #991B1B', boxShadow: '0 -2px 0 #7F1D1D' }}>Branding Downline/Outlet</th>
                <th style={{ position: 'sticky', top: '36px', zIndex: 20, background: '#7F1D1D', color: '#FEF2F2', padding: '10px 8px', borderRight: '1px solid #B91C1C', borderBottom: '2px solid #991B1B', boxShadow: '0 -2px 0 #7F1D1D' }}>Kerjasama dengan BUMDES</th>
                <th style={{ position: 'sticky', top: '36px', zIndex: 20, background: '#7F1D1D', color: '#FEF2F2', padding: '10px 8px', borderRight: '1px solid #B91C1C', borderBottom: '2px solid #991B1B', boxShadow: '0 -2px 0 #7F1D1D' }}>Rekrutmen SF AKAMSI</th>
                <th style={{ position: 'sticky', top: '36px', zIndex: 20, background: '#7F1D1D', color: '#FEF2F2', padding: '10px 8px', borderRight: '1px solid #B91C1C', borderBottom: '2px solid #991B1B', boxShadow: '0 -2px 0 #7F1D1D' }}>Always ON Open Table</th>
              </tr>
            </thead>
            <tbody>
              {executiveSummary.rows.map((row, rIdx) => (
                <tr key={`${row.branch}-${row.wok}`} style={{ background: rIdx % 2 === 0 ? '#FFFFFF' : '#FAFAFC' }}>
                  {row.isFirstInBranch && (
                    <td 
                      rowSpan={row.branchRowSpan} 
                      style={{ 
                        padding: '12px', 
                        fontWeight: 900, 
                        color: '#0F172A', 
                        borderRight: '1px solid #E2E8F0', 
                        borderBottom: '3px solid #64748B',
                        background: '#FAFAFC',
                        verticalAlign: 'middle'
                      }}
                    >
                      {row.branch}
                    </td>
                  )}
                  <td style={{ padding: '12px', fontWeight: 700, color: '#334155', textAlign: 'left', borderRight: '1px solid #E2E8F0', borderBottom: row.isLastInBranch ? '3px solid #64748B' : '1px solid #F1F5F9' }}>
                    {row.wok}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 800, color: '#0F172A', borderRight: '1px solid #E2E8F0', borderBottom: row.isLastInBranch ? '3px solid #64748B' : '1px solid #F1F5F9' }}>
                    {row.lopCount}
                  </td>

                  {/* Done Values */}
                  {ACT_TYPES_ORDER.map(item => (
                    <td key={`done-${item.key}`} style={{ padding: '12px 8px', fontWeight: 800, color: row.done[item.key] > 0 ? '#15803D' : '#94A3B8', borderRight: '1px solid #E2E8F0', borderBottom: row.isLastInBranch ? '3px solid #64748B' : '1px solid #F1F5F9', background: row.done[item.key] > 0 ? 'rgba(240, 253, 244, 0.5)' : 'transparent' }}>
                      {row.done[item.key]}
                    </td>
                  ))}

                  {/* Not Yet Values */}
                  {ACT_TYPES_ORDER.map(item => (
                    <td key={`notyet-${item.key}`} style={{ padding: '12px 8px', fontWeight: 700, color: row.notYet[item.key] > 0 ? '#B45309' : '#94A3B8', borderRight: '1px solid #E2E8F0', borderBottom: row.isLastInBranch ? '3px solid #64748B' : '1px solid #F1F5F9', background: row.notYet[item.key] > 0 ? 'rgba(254, 243, 199, 0.3)' : 'transparent' }}>
                      {row.notYet[item.key]}
                    </td>
                  ))}

                  {/* Progress Badge */}
                  <td style={{ padding: '12px', fontWeight: 900, fontFamily: "'Outfit', sans-serif", borderBottom: row.isLastInBranch ? '3px solid #64748B' : '1px solid #F1F5F9' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '50px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      background: row.progressPct >= 75 ? '#DCFCE7' : row.progressPct >= 50 ? '#EFF6FF' : row.progressPct >= 25 ? '#FEF3C7' : '#FEE2E2',
                      color: row.progressPct >= 75 ? '#15803D' : row.progressPct >= 50 ? '#1D4ED8' : row.progressPct >= 25 ? '#B45309' : '#DC2626',
                      display: 'inline-block'
                    }}>
                      {row.progressPct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 900, borderTop: '2px solid #0F172A' }}>
                <td colSpan={2} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', letterSpacing: '0.5px' }}>
                  TOTAL REGIONAL JATENG DIY
                </td>
                <td style={{ padding: '14px 12px', fontSize: '13.5px', fontFamily: "'Outfit', sans-serif", color: '#FFFFFF' }}>
                  {executiveSummary.grandTotalLop}
                </td>

                {/* Grand Total Done: Dynamic Color Range (0 -> Max = Red -> Green) */}
                {ACT_TYPES_ORDER.map(item => (
                  <td key={`gt-done-${item.key}`} style={{ padding: '14px 8px', color: getDoneColor(executiveSummary.grandTotalDone[item.key], executiveSummary.grandTotalLop), fontWeight: 900 }}>
                    {executiveSummary.grandTotalDone[item.key]}
                  </td>
                ))}

                {/* Grand Total Not Yet: Dynamic Color Range (Max -> 0 = Red -> Green) */}
                {ACT_TYPES_ORDER.map(item => (
                  <td key={`gt-notyet-${item.key}`} style={{ padding: '14px 8px', color: getNotYetColor(executiveSummary.grandTotalNotYet[item.key], executiveSummary.grandTotalLop), fontWeight: 900 }}>
                    {executiveSummary.grandTotalNotYet[item.key]}
                  </td>
                ))}

                {/* Grand Total Progress: Dynamic Color Range (0% -> 35% = Red -> Green) */}
                <td style={{ padding: '14px 12px', fontFamily: "'Outfit', sans-serif", fontSize: '14px', color: getProgress35Color(executiveSummary.grandProgressPct), fontWeight: 900 }}>
                  {executiveSummary.grandProgressPct}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
