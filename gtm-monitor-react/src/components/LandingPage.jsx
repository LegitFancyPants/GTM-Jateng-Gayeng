import { useState, memo } from 'react';
import { BRANCH_COLORS } from '../utils';

const LandingPage = memo(function LandingPage({ onExplore, onLogin, onGoDashboard, onGoUpload, kpi, importMeta, branches }) {
  const [activeTab, setActiveTab] = useState('overview');

  const occRate = (importMeta && importMeta.occRate !== null && importMeta.occRate !== undefined)
    ? (importMeta.occRate * 100).toFixed(1)
    : (kpi?.occRate || 12.1);

  const odpCount = kpi?.odpCount || 3094;
  const branchCount = (branches && branches.length) ? branches.length : 6;

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{
      background: '#FFFFFF',
      color: '#0F172A',
      minHeight: '100vh',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Soft Ambient Red-Orange Glow Top */}
      <div style={{
        position: 'absolute',
        top: '-150px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '1000px',
        height: '650px',
        background: 'radial-gradient(circle, rgba(255, 94, 0, 0.08) 0%, rgba(200, 16, 46, 0.04) 45%, rgba(255, 255, 255, 0) 75%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* ─── 2. HERO MAIN SECTION (HERO TEXT PERFECTLY CENTERED VERTICALLY & HORIZONTALLY) ─── */}
      <section id="overview" style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 'calc(100vh - 76px)',
        minHeight: '540px',
        padding: 0,
        boxSizing: 'border-box',
        zIndex: 1
      }}>
        {/* Middle Container: Centered Vertically & Horizontally */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          width: '100%',
          padding: '24px 24px 0 24px',
          boxSizing: 'border-box'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '960px' }}>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '6px',
              color: '#C8102E',
              textTransform: 'uppercase',
              marginBottom: '14px'
            }}>
              REGIONAL JATENG DIY
            </div>

            <h1 className="hero-title-responsive" style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(68px, 12.5vw, 130px)',
              fontWeight: 900,
              letterSpacing: 'clamp(8px, 2.2vw, 26px)',
              lineHeight: 0.95,
              margin: '0 0 20px 0',
              textTransform: 'uppercase',
              background: 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 6px 20px rgba(200, 16, 46, 0.15))'
            }}>
              GTM
            </h1>

            <p className="hero-subtitle-responsive" style={{
              fontSize: 'clamp(13px, 1.2vw, 15px)',
              color: '#475569',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              fontWeight: 600,
              maxWidth: '720px',
              margin: '0 auto 32px auto',
              lineHeight: 1.6
            }}>
              Pemantauan Okupansi ODP dan Kegiatan Regional
            </p>

            {/* CTA Link Minimalis */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={onExplore}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#C8102E',
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '2.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 16px',
                  transition: 'all 0.25s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FF5E00'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#C8102E'; e.currentTarget.style.transform = 'translateX(0px)'; }}
              >
                <span>AKSES PORTAL</span>
                <span style={{ color: '#FF5E00' }}>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── 3. STATS BLOCK ─── */}
        <div className="stats-block-container" style={{
          width: '100vw',
          margin: 0,
          background: 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)',
          padding: '22px 60px',
          boxSizing: 'border-box',
          boxShadow: '0 8px 25px rgba(200, 16, 46, 0.2)',
          zIndex: 10
        }}>
          <div className="stats-responsive-grid" style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px',
            alignItems: 'center'
          }}>
            {/* Stat 1 */}
            <div style={{ borderRight: '1px solid rgba(255, 255, 255, 0.25)', paddingRight: '20px' }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                {occRate}<span style={{ fontSize: '17px', color: '#FFE600' }}>%</span>
              </div>
              <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.88)', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '2px' }}>
                Occupancy Rate
              </div>
            </div>

            {/* Stat 2 */}
            <div style={{ borderRight: '1px solid rgba(255, 255, 255, 0.25)', paddingRight: '20px' }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                {odpCount.toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.88)', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '2px' }}>
                ODP Terpantau
              </div>
            </div>

            {/* Stat 3 */}
            <div style={{ borderRight: '1px solid rgba(255, 255, 255, 0.25)', paddingRight: '20px' }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                {branchCount} <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFE600' }}>Branch</span>
              </div>
              <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.88)', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '2px' }}>
                Wilayah Operasional
              </div>
            </div>

            {/* Stat 4: Info WOK Regional */}
            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                16 <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFE600' }}>WOK</span>
              </div>
              <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.88)', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '2px' }}>
                Area WOK Regional
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. FITUR UTAMA ─── */}
      <section id="features" className="page-responsive-padding" style={{
        position: 'relative',
        background: '#FAFAFC',
        padding: '110px 48px 90px 48px',
        zIndex: 2
      }}>
        {/* Soft Ambient Glow */}
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(255, 94, 0, 0.04) 0%, rgba(200, 16, 46, 0.02) 50%, rgba(250, 250, 252, 0) 75%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '3px', color: '#FF5E00', fontWeight: 800, marginBottom: '10px' }}>
            Platform Capabilities
          </div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '32px', fontWeight: 800, color: '#0F172A', margin: '0 0 52px 0', letterSpacing: '-0.5px' }}>
            Kemampuan Utilitas Sistem
          </h2>

          <div className="capabilities-responsive-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px'
          }}>
            {[
              {
                num: '01',
                title: 'Occupancy Rate',
                desc: 'Pemantauan persentase keterisian port ODP pada setiap tingkat proyek dan WOK.'
              },
              {
                num: '02',
                title: 'Tipe Design',
                desc: 'Pengelompokan data proyek berdasarkan tipe jaringan Greenfield dan Brownfield.'
              },
              {
                num: '03',
                title: 'Sebaran Geografis',
                desc: 'Pemetaan lokasi dan koordinat ODP pada tampilan peta regional interaktif.'
              },
              {
                num: '04',
                title: 'Pelaporan Kegiatan',
                desc: 'Pencatatan dokumentasi foto lapangan serta pembaruan status verifikasi kegiatan.'
              }
            ].map((item) => (
              <div
                key={item.num}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '34px 26px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#FF5E00';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(200, 16, 46, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.03)';
                }}
              >
                <div style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '13px',
                  fontWeight: 900,
                  color: '#C8102E',
                  letterSpacing: '2px',
                  marginBottom: '16px'
                }}>
                  {item.num}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 12px 0', letterSpacing: '-0.2px' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.7, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. WILAYAH OPERASIONAL BRANCH ─── */}
      <section id="branches" className="page-responsive-padding" style={{
        position: 'relative',
        background: '#FFFFFF',
        padding: '30px 48px 110px 48px',
        zIndex: 2
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '3px', color: '#FF5E00', fontWeight: 800, marginBottom: '10px' }}>
            Cakupan Operasional
          </div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '32px', fontWeight: 800, color: '#0F172A', margin: '0 0 38px 0', letterSpacing: '-0.5px' }}>
            6 Wilayah Branch
          </h2>

          <div className="branches-responsive-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '16px'
          }}>
            {['SEMARANG', 'SURAKARTA', 'YOGYAKARTA', 'MAGELANG', 'PURWOKERTO', 'PEKALONGAN'].map((bName) => {
              const color = BRANCH_COLORS[bName] || '#FF5E00';
              return (
                <div
                  key={bName}
                  onClick={onExplore}
                  style={{
                    background: '#FAFAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '22px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = color;
                    e.currentTarget.style.background = '#FFFFFF';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = `0 8px 20px rgba(0,0,0,0.06)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.background = '#FAFAFC';
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: color, margin: '0 auto 12px auto', boxShadow: `0 0 8px ${color}` }} />
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', letterSpacing: '1px' }}>{bName}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
});

export default LandingPage;
