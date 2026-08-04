import { useState, useEffect } from 'react';
import { ACT_TYPES, actMeta } from '../utils';

export default function ReviewModal({ modalData, closeModal, verifyActivity, rejectActivity }) {
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [localActivities, setLocalActivities] = useState(modalData?.activities || []);

  useEffect(() => {
    if (modalData?.activities) {
      setLocalActivities(modalData.activities);
    }
  }, [modalData]);

  if (!modalData) return null;

  const handleVerify = async (actKey, photoId) => {
    if (verifyActivity) {
      await verifyActivity(modalData.bName, modalData.pName, actKey, photoId);
      setLocalActivities(prev => prev.map(a => {
        if (a.type !== actKey) return a;
        const updatedPhotos = (a.photos || []).map(ph => ph.id === photoId ? { ...ph, status: 'verified' } : ph);
        const allVerified = updatedPhotos.length > 0 && updatedPhotos.every(ph => ph.status === 'verified');
        return { ...a, status: allVerified ? 'verified' : 'upload', photos: updatedPhotos };
      }));
    }
  };

  const handleReject = async (actKey, photoId) => {
    if (rejectActivity) {
      const confirmReject = window.confirm("Apakah Anda yakin ingin menolak verifikasi ini? Foto tersebut akan dihapus dan user perlu melakukan upload ulang.");
      if (!confirmReject) return;
      await rejectActivity(modalData.bName, modalData.pName, actKey, photoId);
      setLocalActivities(prev => prev.map(a => {
        if (a.type !== actKey) return a;
        const updatedPhotos = (a.photos || []).filter(ph => ph.id !== photoId);
        const newStatus = updatedPhotos.some(ph => ph.status === 'upload') ? 'upload' : updatedPhotos.some(ph => ph.status === 'verified') ? 'verified' : 'belum';
        return { ...a, status: newStatus, photos: updatedPhotos };
      }));
    }
  };

  return (
    <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '720px', maxHeight: '85vh', overflowY: 'auto' }}>
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
            const a = localActivities.find(x => x.type === actType.key);

            // Foto yang ditolak (status 'belum') dihapus dari tampilan — user perlu upload ulang
            const allPhotos = a?.photos && a.photos.length > 0
              ? a.photos
              : (a?.photoUrl && a?.status !== 'belum' ? [{ id: a.id, photoUrl: a.photoUrl, status: a.status, planDate: a.planDate, keterangan: a.keterangan, namaOutlet: a.namaOutlet, kodeSf: a.kodeSf }] : []);
            const photoList = allPhotos.filter(ph => ph.status !== 'belum');

            // Hitung status dari foto yang valid saja
            const effectiveStatus = photoList.length === 0
              ? 'belum'
              : photoList.some(ph => ph.status === 'upload')
                ? 'upload'
                : 'verified';
            const meta = actMeta(effectiveStatus);

            return (
              <div key={actType.key} style={{ border: '1px solid #f1f5f9', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{actType.label}</div>
                  <div style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: meta.bg, color: meta.color }}>
                    {meta.label} {photoList.length > 0 && (actType.key === 'rekrutmen_sf' ? '' : `(${photoList.length} Foto)`)}
                  </div>
                </div>

                {photoList.length === 0 ? (
                  <div style={{ fontSize: '12.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                    {actType.key === 'rekrutmen_sf' ? 'Belum ada data kegiatan' : 'Belum ada data / foto kegiatan'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {photoList.map((ph, idx) => {
                      const isPhVerified = ph.status === 'verified';
                      const phMeta = actMeta(ph.status);
                      return (
                        <div key={ph.id || idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {actType.key !== 'rekrutmen_sf' && (
                            ph.photoUrl && ph.photoUrl !== 'uploading...' ? (
                              <div
                                onClick={() => setPreviewPhoto({ url: ph.photoUrl, title: `${actType.label} (${idx + 1}) - ${modalData.pName}` })}
                                style={{ position: 'relative', width: '90px', height: '65px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1', cursor: 'pointer', flexShrink: 0 }}
                                title="Klik untuk melihat foto lebih besar"
                              >
                                <img src={ph.photoUrl} alt="Foto Bukti" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div style={{ position: 'absolute', bottom: 0, inset: 'auto 0 0 0', background: 'rgba(15,23,42,0.75)', color: '#fff', fontSize: '9px', fontWeight: 700, textAlign: 'center', padding: '2px 0' }}>
                                  🔍 Lihat
                                </div>
                              </div>
                            ) : (
                              <div style={{ width: '90px', height: '65px', borderRadius: '6px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b', fontWeight: 600, textAlign: 'center' }}>
                                Tanpa Foto
                              </div>
                            )
                          )}

                          <div style={{ flex: 1, minWidth: '160px', fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: phMeta.bg, color: phMeta.color }}>
                                {actType.key === 'rekrutmen_sf' ? phMeta.label : `Foto #${idx + 1}: ${phMeta.label}`}
                              </span>
                            </div>
                            {ph.namaOutlet && <div><b>Nama Outlet:</b> {ph.namaOutlet}</div>}
                            {ph.planDate && <div><b>Tanggal:</b> {new Date(ph.planDate).toLocaleDateString('id-ID')}</div>}
                            {(ph.kodeSf || ph.keterangan) && <div><b>{actType.key === 'rekrutmen_sf' ? 'Kode SF' : 'Kode SF/Ket'}:</b> {ph.kodeSf || ph.keterangan}</div>}
                          </div>

                          {ph.status === 'upload' && (verifyActivity || rejectActivity) && (
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                              {rejectActivity && (
                                <button
                                  type="button"
                                  onClick={() => handleReject(actType.key, ph.id)}
                                  style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Tolak
                                </button>
                              )}
                              {verifyActivity && (
                                <button
                                  type="button"
                                  onClick={() => handleVerify(actType.key, ph.id)}
                                  style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Verifikasi
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
            zIndex: 100000, 
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
