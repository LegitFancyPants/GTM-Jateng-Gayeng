export const ACT_TYPES = [
  { key: 'tsel_menyapa', label: 'Tsel Menyapa Warga', kind: 'date', fieldKey: 'planDate' },
  { key: 'branding_outlet', label: 'Branding Downline/Outlet', kind: 'photo' },
  { key: 'bumdes', label: 'Kerjasama dengan BUMDES', kind: 'photo' },
  { key: 'rekrutmen_sf', label: 'Rekrutmen SF AKAMSI', kind: 'text', fieldKey: 'kodeSf', placeholder: 'Kode SF' },
  { key: 'open_table', label: 'Always ON Open Table', kind: 'photo' }
];

export const BRANCH_COLORS = {
  PURWOKERTO: '#2563eb',
  SURAKARTA: '#7c3aed',
  PEKALONGAN: '#ea580c'
};

export function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function occColor(status) {
  return { GREEN: '#16a34a', YELLOW: '#d97706', BLACK: '#334155', RED: '#dc2626' }[status] || '#64748b';
}

export function occBg(status) {
  return { GREEN: '#dcfce7', YELLOW: '#fef3c7', BLACK: '#e2e8f0', RED: '#fee2e2' }[status] || '#f1f5f9';
}

export function actMeta(status) {
  if (status === 'verified') return { label: 'Terverifikasi', bg: '#dcfce7', color: '#15803d' };
  if (status === 'upload') return { label: 'Sudah Upload', bg: '#dbeafe', color: '#1d4ed8' };
  return { label: 'Belum Dikerjakan', bg: '#f1f5f9', color: '#64748b' };
}

export function flatOdps(branches) {
  const out = [];
  for (const b of branches) {
    for (const p of b.projects) {
      for (const o of p.odps) {
        out.push({ ...o, branch: b.name, project: p.name, wok: p.wok });
      }
    }
  }
  return out;
}

export function computeStats(odps) {
  const totalAvai = odps.reduce((s, o) => s + o.avai, 0);
  const totalUsed = odps.reduce((s, o) => s + o.used, 0);
  const totalPort = odps.reduce((s, o) => s + o.total, 0);
  const occRate = totalPort ? Math.round((totalUsed / totalPort) * 1000) / 10 : 0;
  
  const allActs = odps.flatMap(o => o.activities);
  const actVerified = allActs.filter(a => a.status === 'verified').length;
  const actUploaded = allActs.filter(a => a.status === 'upload').length;
  const actBelum = allActs.filter(a => a.status === 'belum').length;
  const actCompletionPct = allActs.length ? Math.round((actVerified / allActs.length) * 100) : 0;
  
  return {
    totalAvai, totalUsed, totalPort, occRate,
    actVerified, actUploaded, actBelum, actCompletionPct, odpCount: odps.length
  };
}
