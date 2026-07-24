import { useState } from 'react';
import ProjectTable from './ProjectTable';
import ReviewModal from './ReviewModal';
import { computeStats, flatOdps } from '../utils';

export default function BranchView({ branches, activeBranch, verifyActivity }) {
  const [search, setSearch] = useState('');
  const [modalKey, setModalKey] = useState(null); // format: branchName||projectName||odpIndex

  const branch = branches.find(b => b.name === activeBranch);
  if (!branch) return null;

  const allOdps = flatOdps([branch]);
  const stats = computeStats(allOdps);

  // Filter projects by search
  const s = search.toLowerCase();
  const filteredProjects = branch.projects.filter(p => !s || p.name.toLowerCase().includes(s) || p.wok.toLowerCase().includes(s));

  const openModal = (bName, pName, idx) => setModalKey(`${bName}||${pName}||${idx}`);
  const closeModal = () => setModalKey(null);

  let modalData = null;
  if (modalKey) {
    const [bName, pName, idxStr] = modalKey.split('||');
    const b = branches.find(x => x.name === bName);
    const p = b?.projects.find(x => x.name === pName);
    const o = p?.odps[parseInt(idxStr)];
    if (o) {
      modalData = {
        bName, pName, odpIndex: parseInt(idxStr),
        odp: o.odp, wok: p.wok, occPct: o.occPct, occStatus: o.occStatus,
        avai: o.avai, used: o.used, total: o.total,
        activities: o.activities
      };
    }
  }

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', margin: '16px 0 20px' }}>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Occupancy Rate</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stats.occRate}%</div>
        </div>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Port Avai / Used / Total</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stats.totalAvai} / {stats.totalUsed} / {stats.totalPort}</div>
        </div>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Jumlah Proyek / ODP</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{branch.projects.length} / {stats.odpCount}</div>
        </div>
        <div className="card" style={{ padding: '16px 18px' }}>
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

      <ProjectTable projects={filteredProjects} branchName={branch.name} onReview={openModal} />

      <ReviewModal modalData={modalData} closeModal={closeModal} verifyActivity={verifyActivity} />
    </div>
  );
}
