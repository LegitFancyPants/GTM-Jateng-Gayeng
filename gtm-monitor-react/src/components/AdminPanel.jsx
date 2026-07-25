import { useState } from 'react';

export default function AdminPanel({ token, onUpdate, goDashboard }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

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
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>⚙️ Admin Panel — Update Database</h2>
        <button onClick={goDashboard} style={{ background: 'transparent', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
          Kembali ke Dashboard
        </button>
      </div>

      <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: '20px' }}>
        Anda dapat mengupdate database proyek ODP, kapasitas <b>Avai</b>, <b>Used</b>, dan <b>Total</b> dengan mengunggah file Excel terbaru. Data kegiatan (foto, tanggal, status verifikasi) yang sudah dikerjakan sebelumnya <b>tidak akan hilang</b>.
      </p>

      <form onSubmit={handleUpload}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
            Pilih File Excel (.xlsx / .csv)
          </label>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileChange}
            style={{ display: 'block', width: '100%', padding: '10px', border: '2px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', background: '#f8fafc' }}
          />
        </div>

        {message && (
          <div style={{ padding: '12px', background: '#dcfce7', color: '#166534', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' }}>
            ✅ {message}
          </div>
        )}

        {error && (
          <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' }}>
            ❌ {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || !file}
          style={{ 
            width: '100%', 
            padding: '12px', 
            background: loading || !file ? '#94a3b8' : '#C8102E', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '8px', 
            fontWeight: 700, 
            fontSize: '15px', 
            cursor: loading || !file ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {loading ? '⏳ Memproses File...' : '📤 Upload & Update Database'}
        </button>
      </form>
    </div>
  );
}
