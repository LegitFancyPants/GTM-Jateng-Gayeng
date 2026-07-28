import { useState } from 'react';
import { ACT_TYPES, actMeta } from '../utils';

export default function ReviewModal({ modalData, closeModal, verifyActivity }) {
  const [previewPhoto, setPreviewPhoto] = useState(null);

  if (!modalData) return null;

  return (
    <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '720px', maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ padding: '22px 26px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{modalData.pName}</div>
            <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>{modalData.wok} · {modalData.bName}</div>
          </div>
          <button onClick={closeModal} style={{ border: 'none', background: '#f1f5f9', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>
        
        <div style={{ padding: '20px 26px' }}>
          {/* Project Stats Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '22px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total Available</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{modalData.totalAvai}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total Used</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{modalData.totalUsed}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total Port</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{modalData.totalPort}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Jumlah ODP</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{modalData.odpCount}</div>
            </div>
          </div>

          {/* ODP List */}
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Daftar ODP dalam Proyek</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
            {modalData.odps.map(o => (
              <span key={o.odp} style={{
                fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px',
                background: o.used === 0 ? '#e2e8f0' : '#dcfce7',
                color: o.used === 0 ? '#334155' : '#16a34a'
              }}>
                {o.odp} ({o.used}/{o.total})
              </span>
            ))}
          </div>

          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Detail Activity GTM</div>
          
          {ACT_TYPES.map(actType => {
            const a = modalData.activities.find(x => x.type === actType.key);
            const status = a?.status || 'belum';
            const meta = actMeta(status);
            return (
              <div key={actType.key} style={{ border: '1px solid #f1f5f9', borderRadius: '10px', padding: '14px 16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{actType.label}</div>
                  <div style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: meta.bg, color: meta.color }}>
                    {meta.label}
                  </div>
                </div>
                
                <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.7 }}>
                  {a?.planDate && (
                    <div><b>Plan Date:</b> {new Date(a.planDate).toLocaleDateString('id-ID')}</div>
                  )}
                  {a?.actualDate && (
                    <div><b>Actual Date:</b> {new Date(a.actualDate).toLocaleDateString('id-ID')}</div>
                  )}
                  {(a?.keterangan || a?.fields?.keterangan || a?.fields?.kodeSf || a?.kodeSf) && (
                    <div><b>Kode SF:</b> {a?.keterangan || a?.fields?.keterangan || a?.fields?.kodeSf || a?.kodeSf}</div>
                  )}
                  {a?.photoUrl && a.photoUrl !== 'uploading...' && (
                    <div style={{ marginTop: '8px', marginBottom: '6px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Foto Bukti Kegiatan:</div>
                      <div 
                        onClick={() => setPreviewPhoto({ url: a.photoUrl, title: `${actType.label} - ${modalData.pName}` })}
                        style={{ 
                          position: 'relative', 
                          display: 'inline-block', 
                          cursor: 'pointer', 
                          borderRadius: '8px', 
                          overflow: 'hidden', 
                          border: '2px solid #cbd5e1',
                          background: '#f8fafc',
                          transition: 'transform 0.15s ease'
                        }}
                        title="Klik untuk melihat foto lebih besar"
                      >
                        <img 
                          src={a.photoUrl} 
                          alt={actType.label} 
                          style={{ width: '130px', height: '90px', objectFit: 'cover', display: 'block' }} 
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'rgba(15, 23, 42, 0.8)',
                          color: '#fff',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '3px 0',
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}>
                          🔍 Klik Perbesar
                        </div>
                      </div>
                    </div>
                  )}
                  {!a?.photoUrl && !a?.planDate && !a?.actualDate && !a?.keterangan && !a?.fields?.keterangan && !a?.fields?.kodeSf && !a?.kodeSf && (
                    <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Belum ada data</div>
                  )}
                </div>
                
                {status === 'upload' && verifyActivity && (
                  <div style={{ textAlign: 'right', marginTop: '10px' }}>
                    <button 
                      onClick={() => verifyActivity(modalData.bName, modalData.pName, actType.key)}
                      style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Verifikasi
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Photo Preview Modal */}
      {previewPhoto && (
        <div 
          onClick={() => setPreviewPhoto(null)} 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(15, 23, 42, 0.85)', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 200, 
            padding: '20px' 
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              position: 'relative', 
              maxWidth: '90vw', 
              maxHeight: '85vh', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              background: '#fff', 
              borderRadius: '16px', 
              padding: '18px', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' 
            }}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '16px' }}>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>{previewPhoto.title}</div>
              <button 
                onClick={() => setPreviewPhoto(null)} 
                style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <img 
              src={previewPhoto.url} 
              alt={previewPhoto.title} 
              style={{ maxWidth: '100%', maxHeight: '68vh', borderRadius: '10px', objectFit: 'contain', border: '1px solid #e2e8f0' }} 
            />
            <div style={{ marginTop: '14px', textAlign: 'center' }}>
              <a 
                href={previewPhoto.url} 
                target="_blank" 
                rel="noreferrer" 
                style={{ fontSize: '13px', color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}
              >
                🔗 Buka Foto Ukuran Asli di Tab Baru
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
