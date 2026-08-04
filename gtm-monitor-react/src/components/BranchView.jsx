import { useState, useMemo, memo } from 'react';
import ProjectTable from './ProjectTable';
import ReviewModal from './ReviewModal';
import { computeStats } from '../utils';

// BranchView dibungkus React.memo agar TIDAK re-render saat menu profile di header dibuka/ditutup.
const BranchView = memo(function BranchView({ branches, activeBranch, verifyActivity, rejectActivity, updateActivityField, uploadPhoto }) {
  const [search, setSearch] = useState('');
  const [modalKey, setModalKey] = useState(null); // format: branchName||projectName

  const branch = (Array.isArray(branches) ? branches : []).find(b => b.name === activeBranch);
  if (!branch) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '14px', fontWeight: 600 }}>
        Memuat data branch <strong>{activeBranch || ''}</strong>...
      </div>
    );
  }

  const priorityProjects = useMemo(() => {
    return (branch.projects || []).filter(p => {
      const isPriority = p.isPriority ?? (p.odpCount > 1 && p.occRate < 35);
      const isGreenfield = (p.typeDesign || 'Greenfield') === 'Greenfield';
      return isPriority && isGreenfield;
    });
  }, [branch.projects]);

  const priorityBranch = useMemo(() => ({
    ...branch,
    projects: priorityProjects
  }), [branch, priorityProjects]);

  const stats = useMemo(() => computeStats([priorityBranch]), [priorityBranch]);

  // Filter projects by search
  const filteredProjects = useMemo(() => {
    const s = search.toLowerCase();
    return priorityProjects.filter(p => !s || p.name.toLowerCase().includes(s) || (p.wok && p.wok.toLowerCase().includes(s)));
  }, [priorityProjects, search]);

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

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', margin: '0 0 20px' }}>
        <div className="card-static" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Occupancy Rate</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stats.occRate}%</div>
        </div>
        <div className="card-static" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Port Avai / Used / Total</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stats.totalAvai} / {stats.totalUsed} / {stats.totalPort}</div>
        </div>
        <div className="card-static" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Jumlah Proyek / ODP</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{priorityProjects.length} / {stats.odpCount}</div>
        </div>
        <div className="card-static" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Aktivitas GTM Selesai</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stats.actCompletionPct}%</div>
        </div>
      </div>

      <input 
        placeholder="Cari nama proyek atau WOK…" 
        value={search} 
        onChange={e => setSearch(e.target.value)} 
        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 18px', borderRadius: '50px', border: '1px solid #e2e8f0', fontSize: '13.5px', marginBottom: '14px', background: '#fff' }}
      />

      <ProjectTable 
        projects={filteredProjects} 
        branchName={branch.name} 
        onReview={openModal} 
        updateActivityField={updateActivityField} 
        uploadPhoto={uploadPhoto}
        verifyActivity={verifyActivity}
        rejectActivity={rejectActivity}
      />

      <ReviewModal modalData={modalData} closeModal={closeModal} verifyActivity={verifyActivity} rejectActivity={rejectActivity} />
    </div>
  );
});

export default BranchView;
