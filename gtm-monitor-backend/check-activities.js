/**
 * Script diagnostik: lihat semua ProjectActivity yang ada di database
 * untuk mengecek isi photoUrl yang tersimpan
 * 
 * Jalankan: node check-activities.js
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

async function checkActivities() {
  try {
    const activities = await prisma.projectActivity.findMany({
      include: {
        project: {
          include: { branch: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n📋 Total ProjectActivity di database: ${activities.length}\n`);

    activities.forEach(a => {
      const branch = a.project?.branch?.name || '?';
      const project = a.project?.name || '?';
      console.log(`[${branch}] ${project}`);
      console.log(`  type: ${a.type}`);
      console.log(`  status: ${a.status}`);
      console.log(`  photoUrl: ${a.photoUrl || '(kosong)'}`);
      console.log(`  createdAt: ${a.createdAt}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActivities();
