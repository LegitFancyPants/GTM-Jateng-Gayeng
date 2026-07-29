import { useState, useEffect, memo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { BRANCH_COLORS } from '../utils';

// Dashboard dibungkus React.memo agar TIDAK re-render saat menu profile di header dibuka/ditutup.
const Dashboard = memo(function Dashboard({ branches, goBranch, kpi, statusChips, ranking, mapBounds, mapPoints, isAdmin }) {
  const [showMarkers, setShowMarkers] = useState(false);

  // Tunda pemuatan marker peta 100ms agar halaman Dashboard & animasi garis merah berpindah seketika (0ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMarkers(true);
    }, 100);
    return () => clearTimeout(timer);
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
      {/* KPI Row */}
      <div className="kpi-grid">
        <div className="card-static" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Occupancy Rate</div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{safeKpi.occRate}%</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{safeKpi.totalUsed} / {safeKpi.totalPort} port terpakai</div>
        </div>
        <div className="card-static" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Port Tersedia</div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{safeKpi.totalAvai}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>dari total {safeKpi.totalPort} port di {safeKpi.odpCount} ODP</div>
        </div>
        <div className="card-static" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status ODP</div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {safeKpi.odpCount} <span style={{ fontSize: '16px', fontWeight: 600, color: '#64748b' }}>ODP</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px', alignItems: 'center' }}>
            {safeStatusChips.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#64748b' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color }} />
                <span><strong style={{ color: '#334155' }}>{s.count}</strong> {s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card-static" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Aktivitas GTM Terverifikasi</div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{safeKpi.actCompletionPct}%</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{safeKpi.actVerified} verified · {safeKpi.actUploaded} upload · {safeKpi.actBelum} belum</div>
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
