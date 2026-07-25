import { useState, useMemo } from 'react';
import { ACT_TYPES, actMeta, formatBranch } from '../utils';

const FilterIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

export default function ProjectTable({ projects, branchName, onReview, updateActivityField, uploadPhoto, verifyActivity }) {
  const [expanded, setExpanded] = useState({});
  const [filterPopup, setFilterPopup] = useState(null);
  const [filters, setFilters] = useState({
    usedTotal: { sort: null, search: '', unchecked: [] },
    avaiTotal: { sort: null, search: '', unchecked: [] },
    totalPort: { sort: null, search: '', unchecked: [] }
  });

  const toggleProject = (projectName) => {
    setExpanded(prev => ({ ...prev, [projectName]: !prev[projectName] }));
  };

  const projectsWithTotals = useMemo(() => {
    return projects.map(p => {
      const usedTotal = p.odps.reduce((s, o) => s + o.used, 0);
      const avaiTotal = p.odps.reduce((s, o) => s + o.avai, 0);
      const totalPort = p.odps.reduce((s, o) => s + o.total, 0);
      return { ...p, usedTotal, avaiTotal, totalPort };
    });
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
          {displayProjects.map((p) => {
            const isExpanded = expanded[p.name];
            const pOdps = p.odps;
            const usedTotal = p.usedTotal;
            const avaiTotal = p.avaiTotal;
            const totalPort = p.totalPort;
            const bName = p.branchName || branchName;
            // Project-level activities
            const projectActivities = p.activities || [];

            return (
              <div key={p.name}>
                {/* PROJECT ROW — with activity inputs */}
                <div
                  className="table-row"
                  style={{ gridTemplateColumns: tableGrid }}
                >
                  <div 
                    style={{ fontSize: '15px', color: '#94a3b8', fontWeight: 700, textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => toggleProject(p.name)}
                  >
                    {isExpanded ? '−' : '+'}
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
                        <div style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', backgroundColor: meta.bg, color: meta.color, height: '15px', display: 'flex', alignItems: 'center' }}>
                          {meta.label}
                        </div>

                        {/* Photo Input */}
                        {actType.kind === 'photo' && (
                          <label style={{ width: '64px', height: '64px', borderRadius: '8px', border: a?.photoUrl ? '2px solid #22c55e' : '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: a?.photoUrl ? '#f0fdf4' : '#f8fafc', fontSize: '10px', color: a?.photoUrl ? '#16a34a' : '#64748b', cursor: uploadPhoto ? 'pointer' : 'default', overflow: 'hidden', textAlign: 'center', padding: '4px', boxSizing: 'border-box' }}>
                            {a?.photoUrl && a.photoUrl !== 'uploading...' ? (
                              <>
                                <span style={{ fontSize: '16px' }}>📸</span>
                                <span style={{ fontWeight: 700, marginTop: '2px' }}>Terisi</span>
                              </>
                            ) : a?.photoUrl === 'uploading...' ? (
                              <span>⏳ Upload...</span>
                            ) : (
                              <>
                                <span style={{ fontSize: '16px' }}>➕</span>
                                <span style={{ marginTop: '2px' }}>Foto</span>
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
                          <input
                            type="text"
                            placeholder={actType.placeholder}
                            value={a?.fields?.[actType.fieldKey] || ''}
                            onChange={(e) => updateActivityField ? updateActivityField(bName, p.name, actType.key, actType.fieldKey, e.target.value) : undefined}
                            style={{ width: '120px', fontSize: '12px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '5px' }}
                            readOnly={!updateActivityField}
                          />
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

                {/* ODP ROWS — only capacity data, no activity inputs */}
                {isExpanded && pOdps.map((o) => (
                  <div
                    key={o.odp}
                    className="table-row"
                    style={{ gridTemplateColumns: odpGrid, backgroundColor: '#fafbfc', borderTop: '1px solid #f8fafc' }}
                  >
                    <div></div>
                    <div style={{ fontSize: '13px', fontWeight: 600, paddingLeft: '14px' }}>{o.odp}</div>

                    {/* Occupancy Status Badge */}
                    <div style={{
                      fontSize: '11.5px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px',
                      display: 'inline-block',
                      backgroundColor: o.used === 0 ? '#e2e8f0' : (o.used / o.total) < 0.5 ? '#dcfce7' : (o.used / o.total) < 0.75 ? '#fef3c7' : '#fee2e2',
                      color: o.used === 0 ? '#334155' : (o.used / o.total) < 0.5 ? '#16a34a' : (o.used / o.total) < 0.75 ? '#d97706' : '#dc2626'
                    }}>
                      {o.total > 0 ? `${Math.round((o.used / o.total) * 100)}%` : '-'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', height: '100%' }}>{o.used}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', height: '100%' }}>{o.avai}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', height: '100%' }}>{o.total}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
