import { useState, useEffect, useMemo, memo } from 'react';
import ProjectTable from './ProjectTable';
import ReviewModal from './ReviewModal';
import { formatBranch, computeStats } from '../utils';

// UploadView dibungkus React.memo agar TIDAK re-render saat menu profile di header dibuka/ditutup.
const UploadView = memo(function UploadView({ branches, initialBranch, updateActivityField, verifyActivity, rejectActivity, uploadPhoto, deletePhoto }) {
  // Halaman Upload Activity Wajib difilter: OCC < 35%, ODP > 1, DAN Type Design === Greenfield
  const priorityBranches = useMemo(() => {
    return (Array.isArray(branches) ? branches : []).map(b => ({
      ...b,
      projects: (b.projects || []).filter(p => {
        const isPriority = p.isPriority ?? (p.odpCount > 1 && p.occRate < 35);
        const isGreenfield = (p.typeDesign || 'Greenfield') === 'Greenfield';
        return isPriority && isGreenfield;
      })
    })).filter(b => b.projects && b.projects.length > 0);
  }, [branches]);

  const [selectedBranch, setSelectedBranch] = useState(() => {
    if (priorityBranches?.length === 1) return priorityBranches[0].name;
    return initialBranch || 'Semua Branch';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [modalKey, setModalKey] = useState(null); // format: branchName||projectName

  // Jika akun user biasa hanya memiliki akses 1 branch, kunci selectedBranch ke branch tersebut
  useEffect(() => {
    if (priorityBranches?.length === 1 && selectedBranch !== priorityBranches[0].name) {
      setSelectedBranch(priorityBranches[0].name);
    }
  }, [priorityBranches, selectedBranch]);

  // 1. Filter Branches based on dropdown
  const totalProjects = useMemo(() => priorityBranches.reduce((s, b) => s + (b.projects?.length || 0), 0), [priorityBranches]);

  const filteredBranches = useMemo(() => {
    if (selectedBranch === 'Semua Branch') return priorityBranches;
    return priorityBranches.filter(b => b.name === selectedBranch);
  }, [priorityBranches, selectedBranch]);

  // 2. Compute dynamic stats (KPI) for the selected branch filter
  const stats = useMemo(() => computeStats(filteredBranches), [filteredBranches]);
  const totalProjectsInFilter = useMemo(() => {
    return filteredBranches.reduce((s, b) => s + (b.projects?.length || 0), 0);
  }, [filteredBranches]);

  // 3. Filter Projects within those branches based on search text
  const branchesWithFilteredProjects = useMemo(() => {
    const s = search.toLowerCase();
    return filteredBranches.map(b => {
      const projs = b.projects.filter(p => !s || p.name.toLowerCase().includes(s) || (p.wok && p.wok.toLowerCase().includes(s)));
      return { ...b, projects: projs };
    }).filter(b => b.projects.length > 0);
  }, [filteredBranches, search]);

  // 4. Memoize multi-branch flatMap so a new array reference isn't created on every render
  const allProjectsMultiBranch = useMemo(() => {
    return branchesWithFilteredProjects.flatMap(b => b.projects.map(p => ({ ...p, branchName: b.name })));
  }, [branchesWithFilteredProjects]);

  const openModal = (bName, pName) => setModalKey(`${bName}||${pName}`);
  const closeModal = () => setModalKey(null);

  let modalData = null;
  if (modalKey) {
    const [bName, pName] = modalKey.split('||');
    const b = branches.find(x => x.name === bName);
    const p = b?.projects.find(x => x.name === pName);
    if (p) {
      const totalAvai = p.odps.reduce((s, o) => s + o.avai, 0);
      const totalUsed = p.odps.reduce((s, o) => s + o.used, 0);
      const totalPort = p.odps.reduce((s, o) => s + o.total, 0);

      modalData = {
        bName, pName, wok: p.wok,
        odps: p.odps,
        totalAvai, totalUsed, totalPort,
        odpCount: p.odps.length,
        activities: p.activities || []
      };
    }
  }

  // Helper function: Dynamic color scale from Red (0%) to Green (35%)
  const getDynamicColor35 = (val) => {
    const numeric = parseFloat(val) || 0;
    const ratio = Math.min(Math.max(numeric / 35, 0), 1);
    const hue = Math.round(ratio * 140); // 0 (Red) -> 140 (Green)
    return `hsl(${hue}, 85%, 40%)`;
  };

  // Helper function: Dynamic color scale from Red (0%) to Green (100%)
  const getDynamicColor100 = (val) => {
    const numeric = parseFloat(val) || 0;
    const ratio = Math.min(Math.max(numeric / 100, 0), 1);
    const hue = Math.round(ratio * 140); // 0 (Red) -> 140 (Green)
    return `hsl(${hue}, 85%, 40%)`;
  };

  const usedPct = useMemo(() => {
    return stats.totalPort > 0 ? (stats.totalUsed / stats.totalPort) * 100 : 0;
  }, [stats.totalUsed, stats.totalPort]);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* ─── 1. HEADER TITLE (MATCHING MONITORING PAGE STYLE) ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '3px', color: '#FF5E00', fontWeight: 800, marginBottom: '4px' }}>
            KEGIATAN & PELAPORAN LAPANGAN
          </div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
            GTM Activity LOP Greenfield Priority
          </h1>
        </div>
      </div>

      {/* ─── 2. KPI SUMMARY GRID (3 CARDS PROPORTIONALLY BALANCED) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Card 1: Port Avai / Used / Total (Used Skala 0-35% dari Total Port) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)',
          transition: 'transform 0.2s ease, boxShadow 0.2s ease'
        }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
            Port Avai / Used / Total
          </div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 900, color: '#0F172A', marginTop: '8px' }}>
            {stats.totalAvai} / <span style={{ color: getDynamicColor35(usedPct), transition: 'color 0.3s ease' }}>{stats.totalUsed}</span> / {stats.totalPort}
          </div>
        </div>

        {/* Card 2: Jumlah Proyek / ODP */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)',
          transition: 'transform 0.2s ease, boxShadow 0.2s ease'
        }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
            Jumlah Proyek / ODP
          </div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 900, color: '#0F172A', marginTop: '8px' }}>
            {totalProjectsInFilter} / {stats.odpCount}
          </div>
        </div>

        {/* Card 3: Aktivitas GTM Selesai (Skala 0-100% Dinamis) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)',
          transition: 'transform 0.2s ease, boxShadow 0.2s ease'
        }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
            Aktivitas GTM Selesai
          </div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 900, color: getDynamicColor100(stats.actCompletionPct), marginTop: '6px', transition: 'color 0.3s ease' }}>
            {stats.actCompletionPct}%
          </div>
        </div>
      </div>

      {/* ─── 3. CONTROLS BAR (FILTER BRANCH & SEARCH INPUT) ─── */}
      <div className="controls-bar-container">
        {branches.length === 1 ? (
          <div className="branch-filter-capsule" style={{ minWidth: 'auto', border: '1px solid rgba(200, 16, 46, 0.2)', color: '#C8102E' }}>
            <span className="branch-text-label" style={{ fontWeight: 800 }}>Branch: {formatBranch(branches[0].name)}</span>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div 
              className="branch-filter-capsule"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="branch-text-label" style={{ flex: 1, fontWeight: 800, color: '#0F172A' }}>
                {selectedBranch === 'Semua Branch' 
                  ? `Semua Branch (${totalProjects})` 
                  : `${formatBranch(selectedBranch)} (${priorityBranches.find(x => x.name === selectedBranch)?.projects?.length || 0})`}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            {isDropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '240px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.12)', zIndex: 1000, overflow: 'hidden' }}>
                <div 
                  className={`dropdown-item ${selectedBranch === 'Semua Branch' ? 'active' : ''}`}
                  onClick={() => { setSelectedBranch('Semua Branch'); setIsDropdownOpen(false); }}
                  style={{ padding: '12px 18px', fontSize: '13px', fontWeight: selectedBranch === 'Semua Branch' ? 800 : 600, color: selectedBranch === 'Semua Branch' ? '#C8102E' : '#334155', cursor: 'pointer' }}
                >
                  Semua Branch ({totalProjects})
                </div>
                {priorityBranches.map(b => (
                  <div 
                    key={b.name}
                    className={`dropdown-item ${selectedBranch === b.name ? 'active' : ''}`}
                    onClick={() => { setSelectedBranch(b.name); setIsDropdownOpen(false); }}
                    style={{ padding: '12px 18px', fontSize: '13px', fontWeight: selectedBranch === b.name ? 800 : 600, color: selectedBranch === b.name ? '#C8102E' : '#334155', cursor: 'pointer' }}
                  >
                    {formatBranch(b.name)} ({b.projects?.length || 0})
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Search Input */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <input 
            type="text" 
            className="search-input-field"
            placeholder="Cari nama proyek atau WOK..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ─── 4. PROJECT TABLES & ACTIVITY CARDS ─── */}
      {selectedBranch === 'Semua Branch' ? (
        branchesWithFilteredProjects.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <ProjectTable 
              projects={allProjectsMultiBranch} 
              branchName="Multi Branch" 
              updateActivityField={updateActivityField}
              uploadPhoto={uploadPhoto}
              onReview={openModal}
              verifyActivity={verifyActivity}
              rejectActivity={rejectActivity}
              deletePhoto={deletePhoto}
            />
          </div>
        )
      ) : (
        branchesWithFilteredProjects.map(b => (
          <div key={b.name} style={{ marginBottom: '32px' }}>
            <ProjectTable 
              projects={b.projects} 
              branchName={b.name} 
              updateActivityField={updateActivityField}
              uploadPhoto={uploadPhoto}
              onReview={openModal}
              verifyActivity={verifyActivity}
              rejectActivity={rejectActivity}
              deletePhoto={deletePhoto}
            />
          </div>
        ))
      )}
      
      {branchesWithFilteredProjects.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          color: '#64748B',
          fontSize: '14px',
          fontWeight: 600
        }}>
          Tidak ada proyek Greenfield yang cocok dengan kriteria pencarian.
        </div>
      )}

      {/* Reusing the Review Modal and passing verifyActivity & rejectActivity */}
      <ReviewModal modalData={modalData} closeModal={closeModal} verifyActivity={verifyActivity} rejectActivity={rejectActivity} />
    </div>
  );
});

export default UploadView;
