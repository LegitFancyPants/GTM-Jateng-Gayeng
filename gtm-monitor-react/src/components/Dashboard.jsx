import { useState, useEffect, memo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { BRANCH_COLORS } from '../utils';

// Dashboard dibungkus React.memo agar TIDAK re-render saat menu profile di header dibuka/ditutup.
const Dashboard = memo(function Dashboard({ branches, goBranch, kpi, statusChips, ranking, mapBounds, mapPoints, isAdmin, typeDesignFilter = 'ALL', setTypeDesignFilter }) {
  const [showMarkers, setShowMarkers] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Tunda pemuatan marker peta 100ms agar halaman Dashboard berpindah seketika
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
    let color = '#C8102E';
    if (markers.length > 0 && markers[0].options && markers[0].options.fillColor) {
      color = markers[0].options.fillColor;
    }
    return L.divIcon({
      html: `<div style="background: ${color}; opacity: 0.95; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2); font-size: 12px; font-family: 'Outfit', sans-serif;">${cluster.getChildCount()}</div>`,
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
    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* ─── 1. TOP HEADER & FILTER BAR (STYLE HARMONIZED WITH OVERVIEW) ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '3px', color: '#FF5E00', fontWeight: 800, marginBottom: '4px' }}>
            MONITORING DASHBOARD
          </div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
            Overview Kinerja Regional
          </h1>
        </div>

        {setTypeDesignFilter && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FAFAFC', padding: '5px', borderRadius: '50px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            {[
              { id: 'ALL', label: 'Semua Tipe' },
              { id: 'Greenfield', label: 'Greenfield' },
              { id: 'Brownfield', label: 'Brownfield' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTypeDesignFilter(f.id)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '50px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  background: typeDesignFilter === f.id ? 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)' : 'transparent',
                  color: typeDesignFilter === f.id ? '#FFFFFF' : '#64748B',
                  boxShadow: typeDesignFilter === f.id ? '0 4px 12px rgba(200, 16, 46, 0.3)' : 'none',
                  transition: 'all 0.25s ease'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── 2. KPI CARDS ROW (STYLE SELARAS DENGAN OVERVIEW) ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '28px'
      }}>
        {/* KPI 1: Total Occupancy Rate (Hero Accent Card) */}
        <div style={{
          background: 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)',
          color: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 6px 18px rgba(200, 16, 46, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            pointerEvents: 'none'
          }} />
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Total Occupancy Rate
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#FFFFFF', marginTop: '4px', letterSpacing: '-0.5px' }}>
              {safeKpi.occRate}<span style={{ fontSize: '18px', color: '#FFE600' }}>%</span>
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.9)', marginTop: '6px', fontWeight: 600 }}>
            {safeKpi.totalUsed.toLocaleString('id-ID')} / {safeKpi.totalPort.toLocaleString('id-ID')} port terpakai
          </div>
        </div>

        {/* KPI 2: Port Tersedia */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
          transition: 'transform 0.2s ease, border-color 0.2s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FF5E00'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = 'translateY(0px)'; }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Port Tersedia
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '4px', letterSpacing: '-0.5px' }}>
              {safeKpi.totalAvai.toLocaleString('id-ID')}
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px', fontWeight: 500 }}>
            dari total {safeKpi.totalPort.toLocaleString('id-ID')} port di {safeKpi.odpCount.toLocaleString('id-ID')} ODP
          </div>
        </div>

        {/* KPI 3: Status ODP & Dropdown Menu 5 Warna */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
          transition: 'transform 0.2s ease, border-color 0.2s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FF5E00'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = 'translateY(0px)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Status ODP
              </div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '4px', letterSpacing: '-0.5px' }}>
                {safeKpi.odpCount.toLocaleString('id-ID')}
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
                  padding: '5px 12px',
                  borderRadius: '50px',
                  border: '1px solid #E2E8F0',
                  fontSize: '11px',
                  background: '#FAFAFC',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: isStatusDropdownOpen ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                <span style={{ fontWeight: 800, color: '#0F172A' }}>Rincian</span>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C8102E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
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
                    marginTop: '8px',
                    width: '210px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                    zIndex: 1000,
                    padding: '6px 0',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 800, color: '#64748B', borderBottom: '1px solid #F1F5F9', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Rincian Status ODP
                  </div>
                  {safeStatusChips.map(s => (
                    <div
                      key={s.label}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '16px 56px 12px 1fr',
                        alignItems: 'center',
                        padding: '8px 14px',
                        fontSize: '12px',
                        color: '#0F172A',
                        borderBottom: '1px solid #FAFAFC'
                      }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{s.label}</span>
                      <span style={{ color: '#64748B', fontWeight: 500 }}>:</span>
                      <span style={{ color: '#475569', fontWeight: 600, paddingLeft: '4px' }}>
                        {s.count} ODP
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px', fontWeight: 500 }}>
            Total {safeKpi.odpCount.toLocaleString('id-ID')} ODP terpantau dalam sistem
          </div>
        </div>

        {/* KPI 4: Aktivitas GTM Terverifikasi */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
          transition: 'transform 0.2s ease, border-color 0.2s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FF5E00'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = 'translateY(0px)'; }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Aktivitas GTM Terverifikasi
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '4px', letterSpacing: '-0.5px' }}>
              {safeKpi.actCompletionPct}<span style={{ fontSize: '18px', color: '#FF5E00' }}>%</span>
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px', fontWeight: 500 }}>
            {safeKpi.actVerified} verified · {safeKpi.actUploaded} upload · {safeKpi.actPending} belum
          </div>
        </div>
      </div>

      {/* ─── 3. RANKING BRANCH TABLE (STYLE HARMONIZED WITH OVERVIEW) ─── */}
      <div className="dashboard-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
              Ranking Branch Prioritas Peningkatan Occupancy
            </h2>
            <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 500 }}>
              Diurutkan dari occupancy terendah
            </div>
          </div>
        </div>

        <div className="table-responsive-wrapper">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '550px' }}>
            {safeRanking.map(b => (
              <div
                key={b.name}
                onClick={() => isAdmin && goBranch && goBranch(b.name)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 70px 80px 100px 110px',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: '#FAFAFC',
                  border: '1px solid #F1F5F9',
                  cursor: isAdmin ? 'pointer' : 'default',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (isAdmin) {
                    e.currentTarget.style.borderColor = b.color;
                    e.currentTarget.style.background = '#FFFFFF';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isAdmin) {
                    e.currentTarget.style.borderColor = '#F1F5F9';
                    e.currentTarget.style.background = '#FAFAFC';
                    e.currentTarget.style.transform = 'translateX(0px)';
                  }
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0F172A', letterSpacing: '0.5px' }}>{b.name}</div>
                <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${b.occRate}%`, background: b.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>{b.occRate}%</div>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: b.delta >= 0 ? '#16A34A' : '#DC2626' }}>
                  {b.delta >= 0 ? `▲ +${b.delta}` : `▼ ${b.delta}`}%
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>{b.projCount} proyek</div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>{b.actPct}% GTM done</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 4. PETA SEBARAN ODP (STYLE HARMONIZED WITH OVERVIEW) ─── */}
      <div className="dashboard-card">
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
            Peta Sebaran ODP Regional
          </h2>
          <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 500 }}>
            Titik lokasi ODP tiap branch Jateng DIY
          </div>
        </div>

        <div style={{ width: '100%', height: '340px', borderRadius: '14px', overflow: 'hidden', zIndex: 0, position: 'relative', border: '1px solid #E2E8F0' }}>
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

        <div style={{ display: 'flex', gap: '24px', marginTop: '18px', flexWrap: 'wrap' }}>
          {branches.map(b => (
            <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0F172A', fontWeight: 700 }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: BRANCH_COLORS[b.name?.toString().trim().toUpperCase()] || BRANCH_COLORS[b.name] || '#64748b', boxShadow: `0 0 6px ${BRANCH_COLORS[b.name?.toString().trim().toUpperCase()] || '#64748b'}` }} />
              {b.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
