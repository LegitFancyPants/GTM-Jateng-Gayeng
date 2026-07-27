/**
 * Script untuk reset semua aktivitas yang status-nya 'upload'
 * tapi photoUrl-nya kosong (upload gagal karena bug Cloudinary v1/v2)
 * 
 * Jalankan: node reset-broken-uploads.js
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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetBrokenUploads() {
  try {
    console.log('🔍 Mencari record upload yang gagal (status=upload, photoUrl=null)...\n');

    const result = await prisma.projectActivity.updateMany({
      where: {
        status: 'upload',
        photoUrl: null
      },
      data: {
        status: 'belum',
        photoUrl: null
      }
    });

    console.log(`✅ ${result.count} record direset ke status 'belum'`);
    console.log('\n📌 User dapat mencoba upload foto kembali.');
    console.log('   Bug sudah diperbaiki — foto sekarang akan tersimpan dengan benar.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetBrokenUploads();
