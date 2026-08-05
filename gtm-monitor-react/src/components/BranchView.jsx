import { useState, useMemo, memo } from 'react';
import ProjectTable from './ProjectTable';
import ReviewModal from './ReviewModal';
import { formatBranch, computeStats, exportProjectsToExcel } from '../utils';

// BranchView dibungkus React.memo agar TIDAK re-render saat menu profile di header dibuka/ditutup.
const BranchView = memo(function BranchView({
  branches = [],
  activeBranch,
  goDashboard,
  verifyActivity,
  rejectActivity,
  updateActivityField,
  uploadPhoto,
  deletePhoto
}) {
  const [search, setSearch] = useState('');
  const [modalKey, setModalKey] = useState(null); // format: branchName||projectName

  // Case-insensitive lookup for activeBranch
  const targetName = (activeBranch || '').toString().trim().toUpperCase();
  const branch = useMemo(() => {
    const list = Array.isArray(branches) ? branches : [];
    if (!targetName) return list[0] || null;
    return list.find(b => (b.name || '').toString().trim().toUpperCase() === targetName) || list[0] || null;
  }, [branches, targetName]);

  const priorityProjects = useMemo(() => {
    if (!branch || !branch.projects) return [];
    return branch.projects.filter(p => {
      const isPriority = p.isPriority ?? (p.odpCount > 1 && p.occRate < 35);
      const isGreenfield = (p.typeDesign || 'Greenfield') === 'Greenfield';
      return isPriority && isGreenfield;
    });
  }, [branch]);

  const priorityBranch = useMemo(() => {
    if (!branch) return null;
    return { ...branch, projects: priorityProjects };
  }, [branch, priorityProjects]);

  const stats = useMemo(() => {
    if (!priorityBranch) return { odpCount: 0, totalUsed: 0, totalPort: 0, occRate: 0, totalProjCount: 0, actVerified: 0, actUploaded: 0 };
    return computeStats([priorityBranch]);
  }, [priorityBranch]);

  // Filter projects by search (bisa cari nama proyek, WOK, atau nama ODP)
  const filteredProjects = useMemo(() => {
    const s = search.toLowerCase();
    return priorityProjects.filter(p => 
      !s || 
      p.name.toLowerCase().includes(s) || 
      (p.wok && p.wok.toLowerCase().includes(s)) ||
      (p.odps && p.odps.some(o => o.odp && o.odp.toLowerCase().includes(s)))
    );
  }, [priorityProjects, search]);

  const openModal = (bName, pName) => setModalKey(`${bName}||${pName}`);
  const closeModal = () => setModalKey(null);

  let modalData = null;
  if (modalKey && branch) {
    const [bName, pName] = modalKey.split('||');
    const p = (branch.projects || []).find(x => x.name === pName);
    if (p) {
      const odps = p.odps || [];
      const totalAvai = odps.reduce((s, o) => s + (o.avai || 0), 0);
      const totalUsed = odps.reduce((s, o) => s + (o.used || 0), 0);
      const totalPort = odps.reduce((s, o) => s + (o.total || 0), 0);

      modalData = {
        bName: branch.name,
        pName: p.name,
        wok: p.wok,
        odps,
        totalAvai,
        totalUsed,
        totalPort,
        odpCount: odps.length,
        activities: p.activities || []
      };
    }
  }

  if (!branch) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', margin: '24px 32px' }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
          Data Branch "{activeBranch}" Tidak Ditemukan
        </div>
        <button
          onClick={goDashboard}
          style={{ padding: '8px 20px', borderRadius: '50px', background: '#C8102E', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer', marginTop: '12px' }}
        >
          ← Kembali ke Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* Header Title with Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          {goDashboard && (
            <button
              type="button"
              onClick={goDashboard}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '50px', border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: '12px', fontWeight: 700, color: '#64748B', cursor: 'pointer', marginBottom: '10px' }}
            >
              ← Kembali ke Monitoring
            </button>
          )}
          <div style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '2.5px', color: '#FF5E00', fontWeight: 800, marginBottom: '2px' }}>
            DETAIL BRANCH GTM
          </div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
            Branch {formatBranch(branch.name)}
          </h1>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '18px 20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Total Proyek Greenfield
          </div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '24px', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>
            {priorityProjects.length} <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Proyek</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px', fontWeight: 500 }}>OCC &lt; 35% &amp; ODP &gt; 1</div>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '18px 20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Total ODP &amp; Kapasitas
          </div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '24px', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>
            {stats.odpCount} <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>ODP</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px', fontWeight: 500 }}>
            {stats.totalUsed} / {stats.totalPort} port ({stats.occRate}%)
          </div>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '18px 20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Status Verifikasi Aktivitas
          </div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '24px', fontWeight: 900, color: '#16A34A', marginTop: '4px' }}>
            {stats.actVerified} <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Terverifikasi</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px', fontWeight: 500 }}>
            {stats.actUploaded} Menunggu Verifikasi
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar-container" style={{ marginBottom: '20px' }}>
        <div className="branch-filter-capsule" style={{ border: '1px solid rgba(200, 16, 46, 0.2)', color: '#C8102E' }}>
          <span className="branch-text-label" style={{ fontWeight: 800 }}>Branch: {formatBranch(branch.name)}</span>
        </div>

        <button
          type="button"
          className="branch-filter-capsule"
          onClick={() => exportProjectsToExcel([branch], branch.name)}
          style={{
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FFFFFF',
            border: '1px solid #10B981',
            color: '#047857',
            fontWeight: 800,
            fontSize: '13px',
            padding: '8px 18px',
            borderRadius: '50px',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          title="Export Data Branch ke File Excel (.xlsx)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <span>Export Excel</span>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            type="text"
            className="search-input-field"
            placeholder={`🔍 Cari proyek / WOK / ODP di branch ${formatBranch(branch.name)}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Project Table */}
      <ProjectTable
        projects={filteredProjects}
        branchName={branch.name}
        onReview={openModal}
        updateActivityField={updateActivityField}
        uploadPhoto={uploadPhoto}
        verifyActivity={verifyActivity}
        rejectActivity={rejectActivity}
        deletePhoto={deletePhoto}
      />

      <ReviewModal
        modalData={modalData}
        closeModal={closeModal}
        verifyActivity={verifyActivity}
        rejectActivity={rejectActivity}
        deletePhoto={deletePhoto}
      />
    </div>
  );
});

export default BranchView;
