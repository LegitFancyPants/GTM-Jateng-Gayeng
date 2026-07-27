/**
 * Script untuk reset semua data aktivitas GTM
 * Menghapus semua ProjectActivity dan Activity,
 * sehingga status kembali ke "belum" (kosong)
 *
 * Jalankan: node reset-activities.js
 */

// Load .env manual tanpa dotenv package
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
        // Remove surrounding quotes if any
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
    console.log('🔄 Memulai reset data aktivitas GTM...\n');

    // Hapus semua ProjectActivity (aktivitas level project)
    const deletedProjectActivities = await prisma.projectActivity.deleteMany({});
    console.log(`✅ ProjectActivity dihapus: ${deletedProjectActivities.count} record`);

    // Hapus semua Activity (aktivitas level ODP)
    const deletedActivities = await prisma.activity.deleteMany({});
    console.log(`✅ Activity (ODP-level) dihapus: ${deletedActivities.count} record`);

    console.log('\n🎉 Reset selesai! Semua data aktivitas GTM sudah kosong.');
    console.log('   Status semua kegiatan sekarang: belum dikerjakan');
  } catch (error) {
    console.error('❌ Error saat reset:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetActivities();
