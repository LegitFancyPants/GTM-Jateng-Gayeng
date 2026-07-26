import { useState, useMemo } from 'react';
import ProjectTable from './ProjectTable';
import ReviewModal from './ReviewModal';
import { computeStats } from '../utils';

export default function AdminPanel({ token, branches = [], onUpdate, goDashboard, onLogout, verifyActivity, updateActivityField, uploadPhoto }) {
  const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring' | 'excel'
  
  // Excel Upload States
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Monitoring Filters States
  const [selectedBranch, setSelectedBranch] = useState('Semua Branch');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'need_review' | 'verified' | 'pending'
  const [modalKey, setModalKey] = useState(null); // format: branchName||projectName

  // Compute overall KPI stats for Admin
  const stats = useMemo(() => computeStats(branches), [branches]);
  const totalProjects = useMemo(() => branches.reduce((s, b) => s + (b.projects?.length || 0), 0), [branches]);

  // Filter Branches and Projects for Monitoring Tab
  const filteredBranches = useMemo(() => {
    if (selectedBranch === 'Semua Branch') return branches;
    return branches.filter(b => b.name === selectedBranch);
  }, [branches, selectedBranch]);

  const branchesWithFilteredProjects = useMemo(() => {
    const s = search.toLowerCase();
    return filteredBranches.map(b => {
      let projs = (b.projects || []).filter(p => !s || p.name.toLowerCase().includes(s) || (p.wok && p.wok.toLowerCase().includes(s)));
      
      // Apply status filter
      if (statusFilter === 'need_review') {
        projs = projs.filter(p => p.activities?.some(a => a.status === 'upload'));
      } else if (statusFilter === 'verified') {
        projs = projs.filter(p => p.activities?.some(a => a.status === 'verified'));
      } else if (statusFilter === 'pending') {
        projs = projs.filter(p => !p.activities || p.activities.length === 0 || p.activities.every(a => a.status === 'belum'));
      }

      return { ...b, projects: projs };
    }).filter(b => b.projects.length > 0);
  }, [filteredBranches, search, statusFilter]);

  const openModal = (bName, pName) => setModalKey(`${bName}||${pName}`);
  const closeModal = () => setModalKey(null);

  let modalData = null;
  if (modalKey) {
    const [bName, pName] = modalKey.split('||');
    const b = branches.find(x => x.name === bName);
    const p = b?.projects?.find(x => x.name === pName);
    if (p) {
      const totalAvai = p.odps.reduce((s, o) => s + o.avai, 0);
      const totalUsed = p.odps.reduce((s, o) => s + o.used, 0);
      const totalPort = p.odps.reduce((s, o) => s + o.total, 0);

      modalData = {
        bName, pName, wok: p.wok,
        odps: p.odps,
        totalAvai, totalUsed, totalPort,
        odpCount: p.odps.length,
        activities: p.activities || []
      };
    }
  }

  // Excel Handlers
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
      setError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Silakan pilih file Excel terlebih dahulu.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3001/api/admin/import-excel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage('Database berhasil diperbarui dengan data Excel baru!');
        setFile(null);
        if (onUpdate) onUpdate();
      } else {
        setError(result.error || 'Gagal mengupload dan memperbarui database.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi ke server.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* Admin Header Banner */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: '24px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', border: '1px solid #334155', position: 'relative', overflow: 'hidden' }}>
        {/* Full-height Seamless Fading Red GTM Block on the Right */}
        <div 
          style={{ 
            position: 'absolute', 
            top: 0, 
            right: 0, 
            bottom: 0, 
            width: '240px', 
            background: 'linear-gradient(to right, rgba(200, 16, 46, 0) 0%, rgba(200, 16, 46, 0.25) 30%, rgba(200, 16, 46, 0.75) 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-end', 
            pointerEvents: 'none',
            paddingRight: '32px',
            overflow: 'hidden'
          }}
        >
          <span 
            style={{ 
              fontSize: '56px', 
              fontWeight: 900, 
              color: '#ffffff', 
              letterSpacing: '2px', 
              opacity: 0.2,
              filter: 'blur(2.5px)',
              userSelect: 'none'
            }}
          >
            GTM
          </span>
        </div>
        
        <div style={{ position: 'relative', zIndex: 1, paddingRight: '160px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.5px' }}>
            Administrator Control Panel
          </h2>
          <p style={{ fontSize: '13.5px', color: '#94a3b8', margin: '6px 0 0', fontWeight: 500 }}>
            Pusat verifikasi bukti kegiatan GTM lapangan dan pembaruan database kapasitas ODP mingguan.
          </p>
        </div>
      </div>

      {/* Admin KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Branch / Proyek</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{branches.length} / {totalProjects}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Terkoneksi dalam sistem GTM</div>
        </div>
        
        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total ODP / Kapasitas</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{stats.odpCount} <span style={{ fontSize: '16px', fontWeight: 600, color: '#64748b' }}>ODP</span></div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{stats.totalUsed} / {stats.totalPort} port terpakai ({stats.occRate}%)</div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #f59e0b', background: stats.actUploaded > 0 ? '#fffbeb' : '#fff', transition: 'all 0.3s' }}>
          <div style={{ fontSize: '11.5px', color: stats.actUploaded > 0 ? '#b45309' : '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Menunggu Verifikasi</span>
            {stats.actUploaded > 0 && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: stats.actUploaded > 0 ? '#d97706' : '#0f172a', marginTop: '6px' }}>{stats.actUploaded} <span style={{ fontSize: '16px', fontWeight: 600, color: stats.actUploaded > 0 ? '#b45309' : '#64748b' }}>kegiatan</span></div>
          <div style={{ fontSize: '12px', color: stats.actUploaded > 0 ? '#92400e' : '#94a3b8', marginTop: '4px', fontWeight: stats.actUploaded > 0 ? 600 : 400 }}>Butuh tindakan review admin</div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #C8102E' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Progress Verifikasi GTM</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{stats.actCompletionPct}%</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{stats.actVerified} kegiatan sudah terverifikasi</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('monitoring')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'monitoring' ? '#C8102E' : 'transparent',
            color: activeTab === 'monitoring' ? '#fff' : '#475569',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            boxShadow: activeTab === 'monitoring' ? '0 4px 12px rgba(200,16,46,0.25)' : 'none'
          }}
        >
          <span>Monitoring & Verifikasi Proyek</span>
          {stats.actUploaded > 0 && (
            <span style={{ background: activeTab === 'monitoring' ? '#fff' : '#f59e0b', color: activeTab === 'monitoring' ? '#C8102E' : '#fff', padding: '2px 8px', borderRadius: '50px', fontSize: '11px', fontWeight: 800 }}>
              {stats.actUploaded}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('excel')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'excel' ? '#C8102E' : 'transparent',
            color: activeTab === 'excel' ? '#fff' : '#475569',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            boxShadow: activeTab === 'excel' ? '0 4px 12px rgba(200,16,46,0.25)' : 'none'
          }}
        >
          <span>Update Data Mingguan</span>
        </button>
      </div>

      {/* TAB 1: MONITORING & VERIFIKASI PROYEK */}
      {activeTab === 'monitoring' && (
        <div className="fade-in">
          {/* Filter Bar */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {/* Branch Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Branch:</span>
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, color: '#0f172a', background: '#fff', cursor: 'pointer' }}
              >
                <option value="Semua Branch">Semua Branch ({branches.length})</option>
                {branches.map(b => (
                  <option key={b.name} value={b.name}>{b.name} ({b.projects?.length || 0})</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, color: statusFilter === 'need_review' ? '#d97706' : '#0f172a', background: statusFilter === 'need_review' ? '#fffbeb' : '#fff', cursor: 'pointer' }}
              >
                <option value="all">Semua Proyek</option>
                <option value="need_review">Menunggu Verifikasi ({stats.actUploaded})</option>
                <option value="verified">Sudah Terverifikasi</option>
                <option value="pending">Belum Dikerjakan</option>
              </select>
            </div>

            {/* Search Input */}
            <div style={{ flex: 1, minWidth: '220px' }}>
              <input
                type="text"
                placeholder="Cari nama proyek atau WOK..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 16px', borderRadius: '50px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#f8fafc' }}
              />
            </div>
          </div>

          {/* Project Table */}
          {branchesWithFilteredProjects.length > 0 ? (
            selectedBranch === 'Semua Branch' ? (
              <div style={{ marginBottom: '32px' }}>
                <ProjectTable 
                  projects={branchesWithFilteredProjects.flatMap(b => b.projects.map(p => ({ ...p, branchName: b.name })))} 
                  branchName="Multi Branch" 
                  updateActivityField={updateActivityField}
                  uploadPhoto={uploadPhoto}
                  onReview={openModal}
                  verifyActivity={verifyActivity}
                />
              </div>
            ) : (
              branchesWithFilteredProjects.map(b => (
                <div key={b.name} style={{ marginBottom: '32px' }}>
                  <ProjectTable 
                    projects={b.projects} 
                    branchName={b.name} 
                    updateActivityField={updateActivityField}
                    uploadPhoto={uploadPhoto}
                    onReview={openModal}
                    verifyActivity={verifyActivity}
                  />
                </div>
              ))
            )
          ) : (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>Tidak ada proyek yang sesuai filter</div>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>Coba ganti filter branch, status verifikasi, atau kata kunci pencarian Anda.</p>
            </div>
          )}
        </div>
      )}      {/* TAB 2: UPDATE DATABASE MINGGUAN (EXCEL) */}
      {activeTab === 'excel' && (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', alignItems: 'stretch' }}>
            {/* Left Column: Instructions */}
            <div className="card" style={{ padding: '28px 28px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: 0, marginBottom: '12px' }}>
                  Panduan Pembaruan Database
                </h3>
                <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, marginBottom: '20px' }}>
                  Sistem dirancang untuk memperbarui kapasitas port ODP mingguan secara otomatis tanpa mengganggu data kegiatan lapangan yang sudah ada.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>1</div>
                    <div>
                      <b style={{ color: '#0f172a' }}>Persiapkan File Excel (.xlsx / .csv)</b>
                      <p style={{ margin: '2px 0 0', color: '#64748b', lineHeight: 1.5 }}>Pastikan kolom memiliki header baku: <code>Branch</code>, <code>Project</code>, <code>WOK</code>, <code>ODP</code>, <code>Avai</code>, <code>Used</code>, dan <code>Total</code>.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>2</div>
                    <div>
                      <b style={{ color: '#0f172a' }}>Pencocokan ODP Otomatis (Upsert)</b>
                      <p style={{ margin: '2px 0 0', color: '#64748b', lineHeight: 1.5 }}>Sistem akan mencocokkan nama ODP. Jika sudah ada, angka kapasitas akan diupdate. Jika ODP baru, akan otomatis ditambahkan.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>3</div>
                    <div>
                      <b style={{ color: '#0f172a' }}>Riwayat Kegiatan Tetap Aman</b>
                      <p style={{ margin: '2px 0 0', color: '#64748b', lineHeight: 1.5 }}>Foto bukti kegiatan, tanggal rencana/aktual, dan status verifikasi mingguan sebelumnya <b>tidak akan terhapus atau reset</b>.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Upload Box */}
            <div className="card" style={{ padding: '28px 32px', border: '1px solid #cbd5e1', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: 0, marginBottom: '6px' }}>
                  Upload Berkas Update Mingguan
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '22px' }}>
                  Pilih file dari komputer Anda lalu tekan tombol pembaruan di bawah.
                </p>
              </div>

              <form onSubmit={handleUpload}>
                <div style={{ marginBottom: '22px' }}>
                  <label 
                    htmlFor="excel-upload-input"
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      padding: '36px 20px', 
                      border: file ? '2px solid #10b981' : '2px dashed #94a3b8', 
                      borderRadius: '12px', 
                      background: file ? '#f0fdf4' : '#f8fafc', 
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center'
                    }}
                  >
                    {file ? (
                      <div onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#166534', wordBreak: 'break-all' }}>{file.name}</div>
                        <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px' }}>{(file.size / 1024).toFixed(1)} KB · Siap diunggah</div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '14px' }}>
                          <label 
                            htmlFor="excel-upload-input"
                            style={{ 
                              fontSize: '12.5px', 
                              fontWeight: 700, 
                              color: '#059669', 
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            Ganti File
                          </label>

                          <span style={{ color: '#cbd5e1' }}>•</span>

                          <button
                            type="button"
                            onClick={() => {
                              setFile(null);
                              setMessage(null);
                              setError(null);
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#dc2626',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: 0,
                              textDecoration: 'underline',
                              transition: 'color 0.15s'
                            }}
                            onMouseOver={e => e.currentTarget.style.color = '#991b1b'}
                            onMouseOut={e => e.currentTarget.style.color = '#dc2626'}
                          >
                            Hapus File
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>📁</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>Klik untuk memilih file Excel</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Mendukung format .xlsx, .xls, atau .csv</div>
                      </div>
                    )}
                    <input 
                      id="excel-upload-input"
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {message && (
                  <div style={{ padding: '14px 16px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeIn 0.2s' }}>
                    <span style={{ fontSize: '18px' }}>✅</span>
                    <span>{message}</span>
                  </div>
                )}

                {error && (
                  <div style={{ padding: '14px 16px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeIn 0.2s' }}>
                    <span style={{ fontSize: '18px' }}>❌</span>
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading || !file}
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    background: loading || !file ? '#94a3b8' : '#C8102E', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '10px', 
                    fontWeight: 800, 
                    fontSize: '15px', 
                    cursor: loading || !file ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: loading || !file ? 'none' : '0 10px 15px -3px rgba(200,16,46,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {loading ? (
                    <>
                      <span>⏳</span>
                      <span>Sedang Membaca & Memperbarui Database...</span>
                    </>
                  ) : (
                    <span>Proses Update Database Mingguan</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal modalData={modalData} closeModal={closeModal} verifyActivity={verifyActivity} />
    </div>
  );
}
