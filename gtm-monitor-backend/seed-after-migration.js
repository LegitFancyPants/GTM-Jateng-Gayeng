/**
 * Seed script pasca-migrasi schema
 * - Membuat 6 branch dengan ID 1-6 (berurutan)
 * - Membuat admin (id=1) dan user yang sudah ada (id=2, dst)
 * - Restore semua data project/ODP dari backup-data.json
 * 
 * Jalankan: node seed-after-migration.js
 */

const fs = require('fs');
const path = require('path');

// Load .env
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

// 6 Branch resmi sesuai konfirmasi user
const BRANCHES = [
  { id: 1, name: 'MAGELANG' },
  { id: 2, name: 'PEKALONGAN' },
  { id: 3, name: 'PURWOKERTO' },
  { id: 4, name: 'SEMARANG' },
  { id: 5, name: 'SURAKARTA' },
  { id: 6, name: 'YOGYAKARTA' },
];

async function seed() {
  try {
    // Load backup data
    const backupPath = path.join(__dirname, 'backup-data.json');
    if (!fs.existsSync(backupPath)) {
      throw new Error('backup-data.json tidak ditemukan! Jalankan backup-data.js terlebih dahulu.');
    }
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    console.log('🌱 Memulai seed pasca-migrasi...\n');

    // ─── 1. Buat Branches dengan ID berurutan ───────────────────────────────
    console.log('🏢 Membuat 6 branch...');
    for (const branch of BRANCHES) {
      // Gunakan executeRaw untuk set ID manual di PostgreSQL autoincrement
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Branch" (id, name) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name`,
        branch.id, branch.name
      );
      console.log(`   ✅ Branch ${branch.id}: ${branch.name}`);
    }
    // Update sequence agar autoincrement lanjut dari 7
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"Branch"', 'id'), 6, true)`
    );
    console.log('   ✅ Sequence Branch diset ke 6\n');

    // ─── 2. Buat Users dengan ID berurutan ──────────────────────────────────
    console.log('👥 Membuat users...');
    
    // Urutkan: admin dulu (id=1), lalu user lainnya
    const adminUsers = backup.users.filter(u => u.role === 'ADMIN');
    const regularUsers = backup.users.filter(u => u.role !== 'ADMIN');
    const orderedUsers = [...adminUsers, ...regularUsers];

    for (let i = 0; i < orderedUsers.length; i++) {
      const u = orderedUsers[i];
      const userId = i + 1; // Admin = 1, user pertama = 2, dst.

      let branchId = null;
      if (u.branchName) {
        // Cari branch ID berdasarkan nama dari BRANCHES array
        const branch = BRANCHES.find(b => b.name === u.branchName);
        if (branch) {
          branchId = branch.id;
        } else {
          // Coba cari di database jika nama tidak sama persis
          const dbBranch = await prisma.branch.findFirst({ where: { name: u.branchName } });
          branchId = dbBranch?.id || null;
        }
      }

      await prisma.$executeRawUnsafe(
        `INSERT INTO "User" (id, username, password, "fullName", role, "branchId", "createdAt") 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (username) DO UPDATE SET 
           password = EXCLUDED.password,
           "fullName" = EXCLUDED."fullName",
           role = EXCLUDED.role,
           "branchId" = EXCLUDED."branchId"`,
        userId,
        u.username,
        u.password,
        u.fullName,
        u.role,
        branchId,
        new Date(u.createdAt)
      );
      console.log(`   ✅ User ${userId}: ${u.username} (${u.role}) - branch: ${u.branchName || 'ADMIN'}`);
    }
    // Update sequence agar autoincrement lanjut dari jumlah user saat ini
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"User"', 'id'), $1, true)`,
      orderedUsers.length
    );
    console.log(`   ✅ Sequence User diset ke ${orderedUsers.length}\n`);

    // ─── 3. Restore Project & ODP dari backup ───────────────────────────────
    console.log('📁 Restore Project dan ODP dari backup...');
    let projectCount = 0;
    let odpCount = 0;

    for (const backupBranch of backup.branches) {
      // Cari branch yang sesuai (nama mungkin berbeda case)
      const matchedBranch = BRANCHES.find(
        b => b.name === backupBranch.name || 
             b.name.toLowerCase() === backupBranch.name.toLowerCase()
      );

      if (!matchedBranch) {
        console.log(`   ⚠️  Branch "${backupBranch.name}" tidak ditemukan di BRANCHES list, skip.`);
        continue;
      }

      for (const proj of backupBranch.projects) {
        // Upsert Project
        let project = await prisma.project.findFirst({
          where: { name: proj.name, branchId: matchedBranch.id }
        });

        if (!project) {
          project = await prisma.project.create({
            data: {
              name: proj.name,
              wok: proj.wok,
              branchId: matchedBranch.id
            }
          });
          projectCount++;
        }

        // Upsert ODPs
        for (const odp of proj.odps) {
          await prisma.odp.upsert({
            where: { odp: odp.odp },
            update: {
              avai: odp.avai,
              used: odp.used,
              total: odp.total,
              lat: odp.lat,
              lon: odp.lon,
              projectId: project.id
            },
            create: {
              odp: odp.odp,
              avai: odp.avai,
              used: odp.used,
              total: odp.total,
              lat: odp.lat,
              lon: odp.lon,
              projectId: project.id
            }
          });
          odpCount++;
        }
      }
      console.log(`   ✅ Branch ${matchedBranch.name}: ${backupBranch.projects.length} projects restored`);
    }

    console.log(`\n🎉 Seed selesai!`);
    console.log(`   Branch: 6 (ID 1-6)`);
    console.log(`   Users: ${orderedUsers.length} (ID ${orderedUsers.map((_, i) => i + 1).join(', ')})`);
    console.log(`   Projects restored: ${projectCount}`);
    console.log(`   ODPs restored: ${odpCount}`);
    console.log('\n✅ Database siap digunakan dengan ID berurutan.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
