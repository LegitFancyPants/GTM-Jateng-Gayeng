/**
 * Backup semua data penting sebelum migrasi schema
 * Simpan ke backup-data.json
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

async function backupData() {
  try {
    console.log('📦 Memulai backup data...\n');

    const users = await prisma.user.findMany({
      include: { branch: true },
      orderBy: { createdAt: 'asc' }
    });

    const branches = await prisma.branch.findMany({
      include: {
        projects: {
          include: {
            odps: true,
            activities: true
          }
        }
      }
    });

    const backup = {
      timestamp: new Date().toISOString(),
      users: users.map(u => ({
        username: u.username,
        password: u.password, // already hashed
        fullName: u.fullName,
        role: u.role,
        branchName: u.branch?.name || null,
        createdAt: u.createdAt
      })),
      branches: branches.map(b => ({
        name: b.name,
        projects: b.projects.map(p => ({
          name: p.name,
          wok: p.wok,
          odps: p.odps.map(o => ({
            odp: o.odp,
            avai: o.avai,
            used: o.used,
            total: o.total,
            lat: o.lat,
            lon: o.lon
          }))
        }))
      }))
    };

    fs.writeFileSync(
      path.join(__dirname, 'backup-data.json'),
      JSON.stringify(backup, null, 2),
      'utf8'
    );

    console.log(`✅ Backup selesai!`);
    console.log(`   Users backed up: ${backup.users.length}`);
    console.log(`   Branches backed up: ${backup.branches.length}`);
    const totalProjects = backup.branches.reduce((s, b) => s + b.projects.length, 0);
    const totalOdps = backup.branches.reduce((s, b) => b.projects.reduce((ss, p) => ss + p.odps.length, ss), 0);
    console.log(`   Projects backed up: ${totalProjects}`);
    console.log(`   ODPs backed up: ${totalOdps}`);
    console.log(`\n💾 Saved to: backup-data.json`);

    // Tampilkan users yang akan di-recreate
    console.log('\n👥 Users yang akan di-recreate:');
    backup.users.forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.username} (${u.role}) - branch: ${u.branchName || 'ADMIN'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

backupData();
