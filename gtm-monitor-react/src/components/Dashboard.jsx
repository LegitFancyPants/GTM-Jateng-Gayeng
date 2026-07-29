import { useState, useEffect, memo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { BRANCH_COLORS } from '../utils';

// Dashboard dibungkus React.memo agar TIDAK re-render saat menu profile di header dibuka/ditutup.
const Dashboard = memo(function Dashboard({ branches, goBranch, kpi, statusChips, ranking, mapBounds, mapPoints, isAdmin, typeDesignFilter = 'ALL', setTypeDesignFilter }) {
  const [showMarkers, setShowMarkers] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Tunda pemuatan marker peta 100ms agar halaman Dashboard & animasi garis merah berpindah seketika (0ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMarkers(true);
    }, 100);

    const handleClickOutside = () => setIsStatusDropdownOpen(false);
    window.addEventListener('click', handleClickOutside);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const createClusterCustomIcon = (cluster) => {
    const markers = cluster.getAllChildMarkers();
    let color = '#64748b';
    if (markers.length > 0 && markers[0].options && markers[0].options.fillColor) {
      color = markers[0].options.fillColor;
    }
    return L.divIcon({
      html: `<div style="background-color: ${color}; opacity: 0.95; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; border: 2.5px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.25); font-size: 13px;">${cluster.getChildCount()}</div>`,
      className: 'custom-marker-cluster',
      iconSize: L.point(32, 32, true),
    });
  };

  const safeKpi = kpi || { occRate: 0, totalUsed: 0, totalPort: 0, totalAvai: 0, odpCount: 0, actCompletionPct: 0, actVerified: 0, actUploaded: 0, actBelum: 0 };
  const safeStatusChips = statusChips || [];
  const safeRanking = ranking || [];
  const safeMapBounds = mapBounds || [[-7.5, 109], [-6.5, 111]];
  const safeMapPoints = mapPoints || [];

  return (
    <div>
      {/* Top Filter Bar for Type Design */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
          Overview Dashboard
        </div>

        {setTypeDesignFilter && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '50px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => setTypeDesignFilter('ALL')}
              style={{
                padding: '6px 16px',
                borderRadius: '50px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                background: typeDesignFilter === 'ALL' ? '#C8102E' : 'transparent',
                color: typeDesignFilter === 'ALL' ? '#ffffff' : '#64748b',
                boxShadow: typeDesignFilter === 'ALL' ? '0 2px 6px rgba(200, 16, 46, 0.25)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Semua Data
            </button>
            <button
              type="button"
              onClick={() => setTypeDesignFilter('Greenfield')}
              style={{
                padding: '6px 16px',
                borderRadius: '50px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                background: typeDesignFilter === 'Greenfield' ? '#C8102E' : 'transparent',
                color: typeDesignFilter === 'Greenfield' ? '#ffffff' : '#64748b',
                boxShadow: typeDesignFilter === 'Greenfield' ? '0 2px 6px rgba(200, 16, 46, 0.25)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Greenfield
            </button>
            <button
              type="button"
              onClick={() => setTypeDesignFilter('Brownfield')}
              style={{
                padding: '6px 16px',
                borderRadius: '50px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                background: typeDesignFilter === 'Brownfield' ? '#C8102E' : 'transparent',
                color: typeDesignFilter === 'Brownfield' ? '#ffffff' : '#64748b',
                boxShadow: typeDesignFilter === 'Brownfield' ? '0 2px 6px rgba(200, 16, 46, 0.25)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Brownfield
            </button>
          </div>
        )}
      </div>

      {/* KPI Row */}
      <div className="kpi-grid">
        <div className="card-static" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Occupancy Rate</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>{safeKpi.occRate}%</div>
          </div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>{safeKpi.totalUsed} / {safeKpi.totalPort} port terpakai</div>
        </div>

        <div className="card-static" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Port Tersedia</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>{safeKpi.totalAvai}</div>
          </div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>dari total {safeKpi.totalPort} port di {safeKpi.odpCount} ODP</div>
        </div>

        <div className="card-static" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status ODP</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>
                {safeKpi.odpCount} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>ODP</span>
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
                  padding: '5px 10px',
                  borderRadius: '50px',
                  border: '1px solid #e2e8f0',
                  fontSize: '11.5px',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: isStatusDropdownOpen ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                <span style={{ fontWeight: 700, color: '#334155' }}>Rincian</span>
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
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
                    marginTop: '6px',
                    width: '200px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)',
                    zIndex: 1000,
                    padding: '6px 0',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ padding: '8px 14px', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Rincian Status ODP
                  </div>
                  {safeStatusChips.map(s => (
                    <div
                      key={s.label}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '16px 56px 12px 1fr',
                        alignItems: 'center',
                        padding: '7.5px 14px',
                        fontSize: '12.5px',
                        color: '#334155',
                        borderBottom: '1px solid #f8fafc'
                      }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: '#334155' }}>{s.label}</span>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>:</span>
                      <span style={{ color: '#475569', fontWeight: 400, paddingLeft: '4px' }}>
                        {s.count} ODP
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>
            Total {safeKpi.odpCount} ODP terpantau dalam sistem
          </div>
        </div>

        <div className="card-static" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Aktivitas GTM Terverifikasi</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>{safeKpi.actCompletionPct}%</div>
          </div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>{safeKpi.actVerified} verified · {safeKpi.actUploaded} upload · {safeKpi.actBelum} belum</div>
        </div>
      </div>

      {/* Ranking */}
      <div className="card" style={{ padding: '22px 24px', marginBottom: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Ranking Branch Prioritas Peningkatan Occupancy</div>
        <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '2px', marginBottom: '16px' }}>Diurutkan dari occupancy terendah</div>

        {safeRanking.map(b => (
          <div
            key={b.name}
            onClick={() => isAdmin && goBranch && goBranch(b.name)}
            className={`ranking-row ${isAdmin ? 'clickable' : ''}`}
            style={{ cursor: isAdmin ? 'pointer' : 'default' }}
          >
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{b.name}</div>
            <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${b.occRate}%`, background: b.color, borderRadius: '4px' }} />
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#334155' }}>{b.occRate}%</div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: b.delta >= 0 ? '#16a34a' : '#dc2626' }}>
              {b.delta >= 0 ? `▲ +${b.delta}` : `▼ ${b.delta}`}%
            </div>
            <div style={{ fontSize: '12.5px', color: '#64748b' }}>{b.projCount} proyek</div>
            <div style={{ fontSize: '12.5px', color: '#64748b' }}>{b.actPct}% GTM done</div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="card" style={{ padding: '22px 24px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Peta Sebaran ODP</div>
        <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '2px', marginBottom: '14px' }}>Titik lokasi ODP tiap branch</div>
        <div style={{ width: '100%', height: '300px', borderRadius: '10px', overflow: 'hidden', zIndex: 0, position: 'relative' }}>
          <MapContainer bounds={safeMapBounds} style={{ width: '100%', height: '100%', zIndex: 1 }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {showMarkers && (
              <MarkerClusterGroup chunkedLoading maxClusterRadius={40} iconCreateFunction={createClusterCustomIcon}>
                {safeMapPoints.map(pt => (
                  <CircleMarker
                    key={pt.key}
                    center={[pt.lat, pt.lon]}
                    radius={5}
                    pathOptions={{ color: pt.color, fillColor: pt.color, fillOpacity: 0.85, weight: 1 }}
                  />
                ))}
              </MarkerClusterGroup>
            )}
          </MapContainer>
        </div>
        <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
          {branches.map(b => (
            <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#334155' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: BRANCH_COLORS[b.name?.toString().trim().toUpperCase()] || BRANCH_COLORS[b.name] || '#64748b' }} />
              {b.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
