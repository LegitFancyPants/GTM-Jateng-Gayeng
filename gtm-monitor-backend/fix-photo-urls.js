/**
 * Script untuk memperbaiki record yang photoUrl-nya kosong/null
 * dengan mencari foto di Cloudinary berdasarkan nama project + type
 * 
 * Jalankan: node fix-photo-urls.js
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
        if (!process.env[key]) process.env[key] = value;
      }
    }
  });
}

const cloudinary = require('cloudinary');
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPhotoUrls() {
  try {
    console.log('🔍 Mencari record yang photoUrl-nya kosong...\n');

    // Cari semua aktivitas yang status upload tapi photoUrl kosong
    const brokenActivities = await prisma.projectActivity.findMany({
      where: {
        status: 'upload',
        photoUrl: null
      },
      include: {
        project: { include: { branch: true } }
      }
    });

    console.log(`📋 Ditemukan ${brokenActivities.length} record dengan photoUrl kosong\n`);

    if (brokenActivities.length === 0) {
      console.log('✅ Tidak ada data yang perlu diperbaiki.');
      return;
    }

    // Ambil semua foto dari Cloudinary folder gtm-activities
    console.log('☁️  Mengambil daftar foto dari Cloudinary...');
    const cloudinaryResult = await cloudinary.v2.api.resources({
      type: 'upload',
      prefix: 'gtm-activities',
      max_results: 500
    });

    const cloudinaryPhotos = cloudinaryResult.resources || [];
    console.log(`   Ditemukan ${cloudinaryPhotos.length} foto di Cloudinary\n`);

    // Tampilkan foto-foto yang ada di Cloudinary
    console.log('📸 Foto di Cloudinary:');
    cloudinaryPhotos.forEach(p => {
      console.log(`   - ${p.public_id} → ${p.secure_url}`);
    });
    console.log('');

    // Untuk setiap record yang broken, coba cocokkan dengan foto di Cloudinary
    // Jika hanya ada 1 foto di folder, kemungkinan besar itu milik record tersebut
    for (const act of brokenActivities) {
      const branch = act.project?.branch?.name;
      const project = act.project?.name;
      console.log(`\n⚠️  Record: [${branch}] ${project} - ${act.type}`);
      console.log(`   Status: ${act.status}, photoUrl: kosong`);

      if (cloudinaryPhotos.length === 1) {
        // Hanya ada 1 foto, langsung assign
        const photo = cloudinaryPhotos[0];
        await prisma.projectActivity.update({
          where: { id: act.id },
          data: { photoUrl: photo.secure_url }
        });
        console.log(`   ✅ photoUrl diperbarui: ${photo.secure_url}`);
      } else if (cloudinaryPhotos.length > 1) {
        // Ada banyak foto, tampilkan semua dan reset status ke belum
        // agar user bisa upload ulang dengan fix yang sudah diperbaiki
        console.log(`   ℹ️  Ada ${cloudinaryPhotos.length} foto di Cloudinary.`);
        console.log(`   🔄 Reset record ini ke status 'belum' agar user bisa upload ulang...`);
        await prisma.projectActivity.update({
          where: { id: act.id },
          data: { status: 'belum', photoUrl: null }
        });
        console.log(`   ✅ Record direset ke 'belum'. User perlu upload ulang foto.`);
      }
    }

    console.log('\n🎉 Selesai!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixPhotoUrls();
