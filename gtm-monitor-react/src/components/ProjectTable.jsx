import { useState, useMemo } from 'react';
import { ACT_TYPES, actMeta } from '../utils';

const FilterIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

export default function ProjectTable({ projects, branchName, onReview, updateActivityField }) {
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
          {displayProjects.map((p, pIdx) => {
            const isExpanded = expanded[p.name];
            const pOdps = p.odps;
            const usedTotal = p.usedTotal;
            const avaiTotal = p.avaiTotal;
            const totalPort = p.totalPort;
            const bName = p.branchName || branchName;

            return (
              <div key={p.name}>
                <div
                  className="table-row"
                  style={{ gridTemplateColumns: tableGrid, cursor: 'pointer' }}
                  onClick={() => toggleProject(p.name)}
                >
                  <div style={{ fontSize: '15px', color: '#94a3b8', fontWeight: 700, textAlign: 'center' }}>
                    {isExpanded ? '−' : '+'}
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bName} · {p.wok}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', height: '100%' }}>{usedTotal}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', height: '100%' }}>{avaiTotal}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', height: '100%' }}>{totalPort}</div>
                  <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>–</div>
                  <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>–</div>
                  <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>–</div>
                  <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>–</div>
                  <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>–</div>
                  <div></div>
                </div>

                {isExpanded && pOdps.map((o, oIdx) => (
                  <div
                    key={o.odp}
                    className="table-row"
                    style={{ gridTemplateColumns: tableGrid, backgroundColor: '#fafbfc', borderTop: '1px solid #f8fafc' }}
                  >
                    <div></div>
                    <div style={{ fontSize: '13px', fontWeight: 600, paddingLeft: '14px' }}>{o.odp}</div>

                    {/* Occupancy Status Badge */}
                    <div style={{
                      fontSize: '11.5px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px',
                      display: 'inline-block',
                      backgroundColor: o.occStatus === 'GREEN' ? '#dcfce7' : o.occStatus === 'YELLOW' ? '#fef3c7' : o.occStatus === 'BLACK' ? '#e2e8f0' : '#fee2e2',
                      color: o.occStatus === 'GREEN' ? '#16a34a' : o.occStatus === 'YELLOW' ? '#d97706' : o.occStatus === 'BLACK' ? '#334155' : '#dc2626'
                    }}>
                      {o.occPct} · {o.occStatus}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', height: '100%' }}>{o.used}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', height: '100%' }}>{o.avai}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', height: '100%' }}>{o.total}</div>

                    {/* Activity Cells */}
                    {o.activities.map((a) => {
                      const meta = actMeta(a.status);
                      const actTypeMeta = ACT_TYPES.find(t => t.key === a.type);

                      return (
                        <div key={a.type} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '10px', alignSelf: 'flex-start' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', backgroundColor: meta.bg, color: meta.color, height: '15px', display: 'flex', alignItems: 'center' }}>
                            {meta.label}
                          </div>

                          {/* Photo Input */}
                          {actTypeMeta.kind === 'photo' && (
                            <div style={{ width: '60px', height: '60px', borderRadius: '6px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}
                              onClick={() => {
                                if (updateActivityField) {
                                  updateActivityField(bName, p.name, oIdx, a.type, 'photoUploaded', true);
                                }
                              }}
                            >
                              Foto
                            </div>
                          )}

                          {/* Date Input */}
                          {actTypeMeta.kind === 'date' && (
                            <input
                              type="date"
                              value={a.fields?.planDate || ''}
                              onChange={(e) => updateActivityField ? updateActivityField(bName, p.name, oIdx, a.type, 'planDate', e.target.value) : undefined}
                              style={{ width: '120px', fontSize: '12px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '5px' }}
                              readOnly={!updateActivityField}
                            />
                          )}

                          {/* Text Input */}
                          {actTypeMeta.kind === 'text' && (
                            <input
                              type="text"
                              placeholder={actTypeMeta.placeholder}
                              value={a.fields?.[actTypeMeta.fieldKey] || ''}
                              onChange={(e) => updateActivityField ? updateActivityField(bName, p.name, oIdx, a.type, actTypeMeta.fieldKey, e.target.value) : undefined}
                              style={{ width: '120px', fontSize: '12px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '5px' }}
                              readOnly={!updateActivityField}
                            />
                          )}
                        </div>
                      );
                    })}

                    <div style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => onReview && onReview(bName, p.name, oIdx)}
                        style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: 700, color: '#C8102E', cursor: 'pointer' }}>
                        Review
                      </button>
                    </div>
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
