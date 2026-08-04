/**
 * Script untuk reset semua data aktivitas GTM
 * Menghapus semua ProjectActivityPhoto, ProjectActivity, dan Activity,
 * sehingga semua kegiatan GTM kembali ke 0 / "belum dikerjakan".
 *
 * Jalankan: node reset-activities.js
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > -1) {
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetActivities() {
  try {
    console.log('🔄 Memulai reset semua data aktivitas GTM...\n');

    // 1. Hapus semua foto / upload kegiatan dari ProjectActivityPhoto
    const deletedPhotos = await prisma.projectActivityPhoto.deleteMany({});
    console.log(`✅ ProjectActivityPhoto dihapus: ${deletedPhotos.count} record`);

    // 2. Hapus semua ProjectActivity (aktivitas level project)
    const deletedProjectActivities = await prisma.projectActivity.deleteMany({});
    console.log(`✅ ProjectActivity dihapus: ${deletedProjectActivities.count} record`);

    // 3. Hapus semua Activity (aktivitas level ODP)
    const deletedActivities = await prisma.activity.deleteMany({});
    console.log(`✅ Activity (ODP-level) dihapus: ${deletedActivities.count} record`);

    console.log('\n🎉 Reset selesai! Semua data aktivitas GTM telah dikosongkan.');
    console.log('   Status semua kegiatan sekarang kembali dari 0 (Belum Dikerjakan).');
  } catch (error) {
    console.error('❌ Error saat reset:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetActivities();
