import { actMeta } from '../utils';

export default function ReviewModal({ modalData, closeModal, verifyActivity }) {
  if (!modalData) return null;

  return (
    <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '680px', maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ padding: '22px 26px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{modalData.odp}</div>
            <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>{modalData.pName} · {modalData.wok} · {modalData.bName}</div>
          </div>
          <button onClick={closeModal} style={{ border: 'none', background: '#f1f5f9', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>
        
        <div style={{ padding: '20px 26px' }}>
          {/* ODP Stats Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '22px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Available</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{modalData.avai}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Used</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{modalData.used}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total Port</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{modalData.total}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Occupancy</div>
              <div style={{ 
                marginTop: '4px',
                fontSize: '11.5px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', 
                display: 'inline-block',
                backgroundColor: modalData.occStatus === 'GREEN' ? '#dcfce7' : modalData.occStatus === 'YELLOW' ? '#fef3c7' : modalData.occStatus === 'BLACK' ? '#e2e8f0' : '#fee2e2',
                color: modalData.occStatus === 'GREEN' ? '#16a34a' : modalData.occStatus === 'YELLOW' ? '#d97706' : modalData.occStatus === 'BLACK' ? '#334155' : '#dc2626'
              }}>
                {modalData.occPct} · {modalData.occStatus}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Detail Activity GTM</div>
          
          {modalData.activities.map(a => {
            const meta = actMeta(a.status);
            return (
              <div key={a.type} style={{ border: '1px solid #f1f5f9', borderRadius: '10px', padding: '14px 16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{a.label}</div>
                  <div style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: meta.bg, color: meta.color }}>
                    {meta.label}
                  </div>
                </div>
                
                <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.7 }}>
                  {Object.entries(a.fields || {}).map(([k, v]) => (
                    <div key={k}><b>{k}:</b> {v?.toString() === 'true' ? 'Foto terlampir' : v}</div>
                  ))}
                </div>
                
                {a.status === 'upload' && verifyActivity && (
                  <div style={{ textAlign: 'right', marginTop: '10px' }}>
                    <button 
                      onClick={() => verifyActivity(modalData.bName, modalData.pName, modalData.odpIndex, a.type)}
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
    </div>
  );
}
