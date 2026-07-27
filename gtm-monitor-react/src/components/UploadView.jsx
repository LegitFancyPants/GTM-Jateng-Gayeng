import { useState, useMemo, memo } from 'react';
import ProjectTable from './ProjectTable';
import ReviewModal from './ReviewModal';
import { formatBranch } from '../utils';

// UploadView dibungkus React.memo agar TIDAK re-render saat menu profile di header dibuka/ditutup.
const UploadView = memo(function UploadView({ branches, updateActivityField, verifyActivity, uploadPhoto }) {
  const [selectedBranch, setSelectedBranch] = useState('Semua Branch');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [modalKey, setModalKey] = useState(null); // format: branchName||projectName

  // 1. Filter Branches based on dropdown
  const filteredBranches = useMemo(() => {
    if (selectedBranch === 'Semua Branch') return branches;
    return branches.filter(b => b.name === selectedBranch);
  }, [branches, selectedBranch]);

  // 2. Filter Projects within those branches based on search text
  const branchesWithFilteredProjects = useMemo(() => {
    const s = search.toLowerCase();
    return filteredBranches.map(b => {
      const projs = b.projects.filter(p => !s || p.name.toLowerCase().includes(s) || (p.wok && p.wok.toLowerCase().includes(s)));
      return { ...b, projects: projs };
    }).filter(b => b.projects.length > 0);
  }, [filteredBranches, search]);

  // 3. Memoize multi-branch flatMap so a new array reference isn't created on every render
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

  return (
    <div>
      {/* Header / Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '16px 0 20px' }}>
        {branches.length === 1 ? (
          <div style={{ padding: '9px 16px', borderRadius: '50px', border: '1px solid #cbd5e1', fontSize: '13.5px', background: '#f8fafc', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Branch: {formatBranch(branches[0].name)}</span>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{ padding: '9px 16px', borderRadius: '50px', border: '1px solid #e2e8f0', fontSize: '13.5px', background: '#fff', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: '180px', userSelect: 'none' }}
            >
              <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{formatBranch(selectedBranch)}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            {isDropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
                <div 
                  className={`dropdown-item ${selectedBranch === 'Semua Branch' ? 'active' : ''}`}
                  onClick={() => { setSelectedBranch('Semua Branch'); setIsDropdownOpen(false); }}
                >
                  Semua Branch
                </div>
                {branches.map(b => (
                  <div 
                    key={b.name}
                    className={`dropdown-item ${selectedBranch === b.name ? 'active' : ''}`}
                    onClick={() => { setSelectedBranch(b.name); setIsDropdownOpen(false); }}
                  >
                    {formatBranch(b.name)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Search Input */}
        <div style={{ flex: 1 }}>
          <input 
            type="text" 
            placeholder="Cari nama proyek atau WOK..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 18px', borderRadius: '50px', border: '1px solid #e2e8f0', fontSize: '13.5px', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>
      </div>

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
            />
          </div>
        ))
      )}
      
      {branchesWithFilteredProjects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
          Tidak ada proyek yang cocok dengan pencarian.
        </div>
      )}

      {/* Reusing the Review Modal and passing verifyActivity */}
      <ReviewModal modalData={modalData} closeModal={closeModal} verifyActivity={verifyActivity} />
    </div>
  );
});

export default UploadView;
