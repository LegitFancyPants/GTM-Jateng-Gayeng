import { useState, useMemo, memo, useEffect, useCallback } from 'react';
import { ACT_TYPES, actMeta, formatBranch } from '../utils';

const FilterIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

// ─── OPTIMASI 3: ON-DEMAND LOADING & MEMOIZED ODP ROW ───
const OdpRow = memo(({ o, odpGrid }) => {
  const occRate = o.total > 0 ? Math.round((o.used / o.total) * 100) : 0;
  const badgeBg = o.used === 0 ? '#e2e8f0' : occRate < 50 ? '#dcfce7' : occRate < 75 ? '#fef3c7' : '#fee2e2';
  const badgeColor = o.used === 0 ? '#334155' : occRate < 50 ? '#16a34a' : occRate < 75 ? '#d97706' : '#dc2626';

  return (
    <div
      className="table-row"
      style={{ gridTemplateColumns: odpGrid, backgroundColor: '#fafbfc', borderTop: '1px solid #f8fafc' }}
    >
      <div></div>
      <div style={{ fontSize: '13px', fontWeight: 600, paddingLeft: '14px' }}>{o.odp}</div>

      <div style={{
        fontSize: '11.5px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px',
        display: 'inline-block',
        backgroundColor: badgeBg,
        color: badgeColor
      }}>
        {o.total > 0 ? `${occRate}%` : '-'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', height: '100%' }}>{o.used}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', height: '100%' }}>{o.avai}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', height: '100%' }}>{o.total}</div>
    </div>
  );
});

const ActivityTextInput = memo(({ a, actType, bName, p, updateActivityField }) => {
  const initialValue = a?.[actType.fieldKey] || a?.keterangan || a?.fields?.[actType.fieldKey] || a?.fields?.kodeSf || '';
  const [val, setVal] = useState(initialValue);

  useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter' && updateActivityField) {
      e.preventDefault();
      if (!val || !val.trim()) {
        alert('⚠️ Silakan ketik kode terlebih dahulu lalu tekan Enter.');
        return;
      }
      const res = await updateActivityField(bName, p.name, actType.key, actType.fieldKey, val);
      if (res !== false) {
        alert('✅ Bukti sudah terkirim!');
      }
    }
  };

  return (
    <input
      type="text"
      placeholder={actType.placeholder}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={handleKeyDown}
      style={{ width: '120px', fontSize: '12px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '5px' }}
      readOnly={!updateActivityField}
      title="Ketik kode (cth: SF 0973) lalu tekan Enter untuk mengirim"
    />
  );
});

// ─── OPTIMASI 2: REACT RENDER OPTIMIZATION (MEMOIZED PROJECT ROW) ───
const ProjectRow = memo(({ p, branchName, isExpanded, toggleProject, onReview, updateActivityField, uploadPhoto, verifyActivity, tableGrid, odpGrid }) => {
  const pOdps = p.odps || [];
  const usedTotal = p.usedTotal;
  const avaiTotal = p.avaiTotal;
  const totalPort = p.totalPort;
  const bName = p.branchName || branchName;
  const projectActivities = p.activities || [];

  return (
    <div>
      {/* PROJECT ROW — with activity inputs */}
      <div
        className="table-row"
        style={{ gridTemplateColumns: tableGrid }}
      >
        <div 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
          onClick={() => toggleProject(p.name)}
        >
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ 
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
              transition: 'transform 0.2s ease' 
            }}
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
        <div 
          style={{ fontSize: '13.5px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
          onClick={() => toggleProject(p.name)}
        >
          {p.name}
        </div>
        <div 
          style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
          onClick={() => toggleProject(p.name)}
        >
          {formatBranch(bName)} · {p.wok}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', height: '100%' }}>{usedTotal}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', height: '100%' }}>{avaiTotal}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', height: '100%' }}>{totalPort}</div>

        {/* Activity inputs at project level */}
        {ACT_TYPES.map(actType => {
          const a = projectActivities.find(x => x.type === actType.key);
          const status = a?.status || 'belum';
          const meta = actMeta(status);

          return (
            <div key={actType.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '10px', alignSelf: 'flex-start' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', backgroundColor: meta.bg, color: meta.color, border: meta.border, height: '15px', display: 'flex', alignItems: 'center' }}>
                {meta.label}
              </div>

              {/* Photo Input */}
              {actType.kind === 'photo' && (
                <label style={{ width: '64px', height: '64px', borderRadius: '8px', border: a?.photoUrl ? '2px solid #22c55e' : '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: a?.photoUrl ? '#f0fdf4' : '#f8fafc', fontSize: '10px', color: a?.photoUrl ? '#16a34a' : '#64748b', cursor: uploadPhoto ? 'pointer' : 'default', overflow: 'hidden', textAlign: 'center', padding: '4px', boxSizing: 'border-box' }}>
                  {a?.photoUrl && a.photoUrl !== 'uploading...' ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      <span style={{ fontWeight: 700, marginTop: '2px', fontSize: '10.5px', color: '#16a34a' }}>Terisi</span>
                    </>
                  ) : a?.photoUrl === 'uploading...' ? (
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Upload...</span>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span style={{ marginTop: '2px', fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>Foto</span>
                    </>
                  )}
                  {uploadPhoto && (
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          uploadPhoto(bName, p.name, actType.key, e.target.files[0]);
                        }
                      }}
                    />
                  )}
                </label>
              )}

              {/* Date Input */}
              {actType.kind === 'date' && (
                <input
                  type="date"
                  value={a?.planDate ? new Date(a.planDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => updateActivityField ? updateActivityField(bName, p.name, actType.key, 'planDate', e.target.value) : undefined}
                  style={{ width: '120px', fontSize: '12px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '5px' }}
                  readOnly={!updateActivityField}
                />
              )}

              {/* Text Input */}
              {actType.kind === 'text' && (
                <ActivityTextInput a={a} actType={actType} bName={bName} p={p} updateActivityField={updateActivityField} />
              )}
            </div>
          );
        })}

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onReview && onReview(bName, p.name); }}
            style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: 700, color: '#C8102E', cursor: 'pointer' }}>
            Review
          </button>
        </div>
      </div>

      {/* ODP ROWS — On-demand loading: only rendered in DOM when isExpanded is true */}
      {isExpanded && pOdps.map((o) => (
        <OdpRow key={o.odp} o={o} odpGrid={odpGrid} />
      ))}
    </div>
  );
});

export default function ProjectTable({ projects, branchName, onReview, updateActivityField, uploadPhoto, verifyActivity }) {
  const [expanded, setExpanded] = useState({});
  const [filterPopup, setFilterPopup] = useState(null);
  const [filters, setFilters] = useState({
    usedTotal: { sort: null, search: '', unchecked: [] },
    avaiTotal: { sort: null, search: '', unchecked: [] },
    totalPort: { sort: null, search: '', unchecked: [] }
  });

  // ─── OPTIMASI 1: PAGINATION STATE ───
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const toggleProject = useCallback((projectName) => {
    setExpanded(prev => ({ ...prev, [projectName]: !prev[projectName] }));
  }, []);

  // ─── OPTIMASI 2: GUNAKAN NILAI PRE-COMPUTED DARI SERVER ───
  // usedTotal, avaiTotal, totalPort, occRate sudah dihitung di server.js — tidak perlu reduce() di sini.
  const projectsWithTotals = useMemo(() => {
    return projects.map(p => ({
      ...p,
      // Gunakan nilai yang sudah ada dari server, fallback ke 0 jika tidak ada
      usedTotal: p.usedTotal ?? p.odps.reduce((s, o) => s + o.used, 0),
      avaiTotal: p.avaiTotal ?? p.odps.reduce((s, o) => s + o.avai, 0),
      totalPort: p.totalPort ?? p.odps.reduce((s, o) => s + o.total, 0),
    }));
  }, [projects]);

  const displayProjects = useMemo(() => {
    let list = [...projectsWithTotals];

    // Apply filtering
    ['usedTotal', 'avaiTotal', 'totalPort'].forEach(col => {
      const f = filters[col];
      if (f.unchecked.length > 0) {
        list = list.filter(p => !f.unchecked.includes(p[col]));
      }
    });

    // Apply sorting
    const sortCol = ['usedTotal', 'avaiTotal', 'totalPort'].find(col => filters[col].sort);
    if (sortCol) {
      const sortDir = filters[sortCol].sort;
      list.sort((a, b) => sortDir === 'asc' ? a[sortCol] - b[sortCol] : b[sortCol] - a[sortCol]);
    }

    return list;
  }, [projectsWithTotals, filters]);

  // Reset page ke 1 jika filter berubah atau daftar proyek berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [displayProjects.length, filters]);

  const totalPages = Math.ceil(displayProjects.length / pageSize) || 1;
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayProjects.slice(start, start + pageSize);
  }, [displayProjects, currentPage, pageSize]);

  const updateFilter = (col, key, val) => {
    setFilters(prev => {
      const newState = { ...prev };
      if (key === 'sort' && val !== null) {
        ['usedTotal', 'avaiTotal', 'totalPort'].forEach(c => {
           if (c !== col) newState[c].sort = null;
        });
      }
      newState[col] = { ...newState[col], [key]: val };
      return newState;
    });
  };

  const renderFilterPopup = (col) => {
    if (filterPopup !== col) return null;
    
    const valueCounts = {};
    projectsWithTotals.forEach(p => {
       const v = p[col];
       valueCounts[v] = (valueCounts[v] || 0) + 1;
    });

    const allValues = Object.keys(valueCounts).map(Number).sort((a,b) => a-b);
    const searchLower = filters[col].search.toLowerCase();
    const visibleValues = allValues.filter(v => v.toString().toLowerCase().includes(searchLower));
    
    return (
      <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 100, width: '200px', padding: '8px', fontSize: '12px', color: '#334155', fontWeight: 400, textAlign: 'left', textTransform: 'none', letterSpacing: 'normal' }}>
        <div 
          onClick={() => { updateFilter(col, 'sort', 'asc'); setFilterPopup(null); }}
          style={{ padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', backgroundColor: filters[col].sort === 'asc' ? '#f1f5f9' : 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>↓</span> Sort A to Z (Kecil ke Besar)
        </div>
        <div 
          onClick={() => { updateFilter(col, 'sort', 'desc'); setFilterPopup(null); }}
          style={{ padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', backgroundColor: filters[col].sort === 'desc' ? '#f1f5f9' : 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>↑</span> Sort Z to A (Besar ke Kecil)
        </div>
        <div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }} />
        
        <input 
          type="text" 
          placeholder="Search" 
          value={filters[col].search}
          onChange={e => updateFilter(col, 'search', e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '50px', marginBottom: '8px', fontSize: '12px' }}
        />
        
        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 2px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={filters[col].unchecked.length === 0}
              onChange={(e) => {
                if (e.target.checked) updateFilter(col, 'unchecked', []);
                else updateFilter(col, 'unchecked', [...allValues]);
              }}
            />
            (Select All)
          </label>
          {visibleValues.map(v => (
            <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 2px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={!filters[col].unchecked.includes(v)}
                onChange={(e) => {
                   const u = filters[col].unchecked;
                   if (e.target.checked) updateFilter(col, 'unchecked', u.filter(x => x !== v));
                   else updateFilter(col, 'unchecked', [...u, v]);
                }}
              />
              {v} <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>({valueCounts[v]})</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '8px' }}>
          <button onClick={() => setFilterPopup(null)} style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>OK</button>
        </div>
      </div>
    );
  };

  const tableGrid = '34px 210px 130px 80px 80px 80px 160px 160px 160px 160px 160px 70px';
  const odpGrid = '34px 210px 130px 80px 80px 80px';

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 'max-content', paddingBottom: filterPopup ? '280px' : '0' }}>
          {/* Header */}
          <div className="table-header" style={{ gridTemplateColumns: tableGrid }}>
            <div></div>
            <div>Nama Proyek</div>
            <div>Branch / WOK</div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', paddingTop: '2px' }}>Used</span>
              <div onClick={() => setFilterPopup(filterPopup === 'usedTotal' ? null : 'usedTotal')} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: filters.usedTotal.sort || filters.usedTotal.unchecked.length > 0 ? '#C8102E' : '#94a3b8' }}><FilterIcon /></div>
              {renderFilterPopup('usedTotal')}
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', paddingTop: '2px' }}>Available</span>
              <div onClick={() => setFilterPopup(filterPopup === 'avaiTotal' ? null : 'avaiTotal')} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: filters.avaiTotal.sort || filters.avaiTotal.unchecked.length > 0 ? '#C8102E' : '#94a3b8' }}><FilterIcon /></div>
              {renderFilterPopup('avaiTotal')}
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', paddingTop: '2px' }}>Total</span>
              <div onClick={() => setFilterPopup(filterPopup === 'totalPort' ? null : 'totalPort')} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: filters.totalPort.sort || filters.totalPort.unchecked.length > 0 ? '#C8102E' : '#94a3b8' }}><FilterIcon /></div>
              {renderFilterPopup('totalPort')}
            </div>
            {ACT_TYPES.map(t => (
              <div key={t.key} className="activity-col-header">{t.label}</div>
            ))}
            <div style={{ textAlign: 'center' }}>Detail</div>
          </div>

          {/* Rows */}
          {paginatedProjects.map((p) => (
            <ProjectRow 
              key={p.name}
              p={p}
              branchName={branchName}
              isExpanded={expanded[p.name]}
              toggleProject={toggleProject}
              onReview={onReview}
              updateActivityField={updateActivityField}
              uploadPhoto={uploadPhoto}
              verifyActivity={verifyActivity}
              tableGrid={tableGrid}
              odpGrid={odpGrid}
            />
          ))}
        </div>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
          Menampilkan <span style={{ color: '#0f172a', fontWeight: 700 }}>{displayProjects.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> - <span style={{ color: '#0f172a', fontWeight: 700 }}>{Math.min(currentPage * pageSize, displayProjects.length)}</span> dari <span style={{ color: '#0f172a', fontWeight: 700 }}>{displayProjects.length}</span> proyek
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
            <span>Per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, color: '#0f172a', background: '#fff', cursor: 'pointer' }}
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f1f5f9' : '#fff', color: currentPage === 1 ? '#94a3b8' : '#0f172a', fontWeight: 700, fontSize: '13px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
            >
              ← Prev
            </button>
            
            <span style={{ padding: '0 8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              {currentPage} / {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f1f5f9' : '#fff', color: currentPage === totalPages ? '#94a3b8' : '#0f172a', fontWeight: 700, fontSize: '13px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
