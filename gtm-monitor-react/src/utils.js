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
  if (status === 'verified') return { label: 'Terverifikasi', bg: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' };
  if (status === 'upload') return { label: 'Menunggu Verifikasi', bg: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
  return { label: 'Belum Dikerjakan', bg: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' };
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

export function computeStats(branches) {
  let totalAvai = 0, totalUsed = 0, totalPort = 0, odpCount = 0;
  const allActs = [];

  for (const b of (Array.isArray(branches) ? branches : [])) {
    const projs = b.projects || [];
    for (const p of projs) {
      for (const o of (p.odps || [])) {
        totalAvai += o.avai;
        totalUsed += o.used;
        totalPort += o.total;
        odpCount++;
      }
      // Activities are now at project level
      if (p.activities) {
        allActs.push(...p.activities);
      }
    }
  }

  const occRate = totalPort ? Math.round((totalUsed / totalPort) * 1000) / 10 : 0;
  const actVerified = allActs.filter(a => a.status === 'verified').length;
  const actUploaded = allActs.filter(a => a.status === 'upload').length;
  const actBelum = allActs.filter(a => a.status === 'belum').length;
  const actCompletionPct = allActs.length ? Math.round((actVerified / allActs.length) * 100) : 0;
  
  return {
    totalAvai, totalUsed, totalPort, occRate,
    actVerified, actUploaded, actBelum, actCompletionPct, odpCount
  };
}

export function formatBranch(name) {
  if (!name || name === 'Semua Branch' || name === 'Multi Branch') return name;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}
