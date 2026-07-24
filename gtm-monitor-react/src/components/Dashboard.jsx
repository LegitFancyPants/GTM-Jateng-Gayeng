import { useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { computeStats, flatOdps, hash, BRANCH_COLORS } from '../utils';

export default function Dashboard({ branches, goBranch }) {
  const createClusterCustomIcon = (cluster) => {
    const markers = cluster.getAllChildMarkers();
    let color = '#64748b'; // default
    if (markers.length > 0 && markers[0].options && markers[0].options.fillColor) {
      color = markers[0].options.fillColor;
    }
    
    return L.divIcon({
      html: `<div style="background-color: ${color}; opacity: 0.95; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; border: 2.5px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.25); font-size: 13px;">${cluster.getChildCount()}</div>`,
      className: 'custom-marker-cluster',
      iconSize: L.point(32, 32, true),
    });
  };

  const allOdps = useMemo(() => flatOdps(branches), [branches]);
  const kpi = useMemo(() => computeStats(allOdps), [allOdps]);

  const statusChips = useMemo(() => {
    const counts = { GREEN: 0, YELLOW: 0, BLACK: 0, RED: 0 };
    allOdps.forEach(o => { counts[o.occStatus] = (counts[o.occStatus] || 0) + 1; });
    return [
      { label: 'Green', count: counts.GREEN, color: '#16a34a' },
      { label: 'Yellow', count: counts.YELLOW, color: '#d97706' },
      { label: 'Black', count: counts.BLACK, color: '#334155' }
    ];
  }, [allOdps]);

  const ranking = useMemo(() => {
    return branches.map(b => {
      const st = computeStats(flatOdps([b]));
      const delta = (hash(b.name) % 14) - 5; // mock delta
      return {
        name: b.name, occRate: st.occRate, projCount: b.projects.length, actPct: st.actCompletionPct,
        color: BRANCH_COLORS[b.name] || '#64748b', delta
      };
    }).sort((a, b) => a.occRate - b.occRate);
  }, [branches]);

  const { bounds, mapPoints } = useMemo(() => {
    const lats = allOdps.map(o => o.lat).filter(Number.isFinite);
    const lons = allOdps.map(o => o.lon).filter(Number.isFinite);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const calculatedBounds = (lats.length > 0 && lons.length > 0)
      ? [[minLat, minLon], [maxLat, maxLon]]
      : [[-7.5, 109], [-6.5, 111]]; // fallback bounds
    
    const points = allOdps.filter(o => Number.isFinite(o.lat) && Number.isFinite(o.lon)).map(o => ({
      lat: o.lat,
      lon: o.lon,
      color: BRANCH_COLORS[o.branch] || '#64748b',
      key: o.odp,
      branch: o.branch
    }));
    return { bounds: calculatedBounds, mapPoints: points };
  }, [allOdps]);

  return (
    <div>
      {/* KPI Row */}
      <div className="kpi-grid">
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Occupancy Rate</div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{kpi.occRate}%</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{kpi.totalUsed} / {kpi.totalPort} port terpakai</div>
        </div>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Port Tersedia</div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{kpi.totalAvai}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>dari total {kpi.totalPort} port di {kpi.odpCount} ODP</div>
        </div>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status ODP</div>
          <div style={{ display: 'flex', gap: '14px', marginTop: '12px' }}>
            {statusChips.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.color }} />
                <div style={{ fontSize: '13px', color: '#334155' }}><b>{s.count}</b> {s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Aktivitas GTM Terverifikasi</div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{kpi.actCompletionPct}%</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{kpi.actVerified} verified · {kpi.actUploaded} upload · {kpi.actBelum} belum</div>
        </div>
      </div>

      {/* Ranking */}
      <div className="card" style={{ padding: '22px 24px', marginBottom: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Ranking Branch — Prioritas Peningkatan Occupancy</div>
        <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '2px', marginBottom: '16px' }}>Diurutkan dari occupancy terendah</div>
        
        {ranking.map(b => (
          <div 
            key={b.name} 
            onClick={() => goBranch(b.name)}
            className="ranking-row"
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
          <MapContainer bounds={bounds} style={{ width: '100%', height: '100%', zIndex: 1 }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <MarkerClusterGroup chunkedLoading maxClusterRadius={40} iconCreateFunction={createClusterCustomIcon}>
              {mapPoints.map(pt => (
                <CircleMarker 
                  key={pt.key} 
                  center={[pt.lat, pt.lon]} 
                  radius={5} 
                  pathOptions={{ color: pt.color, fillColor: pt.color, fillOpacity: 0.85, weight: 1 }}
                >
                  <Popup>
                    <strong>{pt.key}</strong><br/>
                    Branch: {pt.branch}
                  </Popup>
                </CircleMarker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        </div>
        <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
          {branches.map(b => (
            <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#334155' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: BRANCH_COLORS[b.name] || '#64748b' }} />
              {b.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
