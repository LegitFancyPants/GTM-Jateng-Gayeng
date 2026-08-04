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
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "Branch" (id, name) VALUES ($1, $2)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          branch.id, branch.name
        );
      } catch (err) {
        await prisma.branch.upsert({
          where: { name: branch.name },
          update: { name: branch.name },
          create: { id: branch.id, name: branch.name }
        }).catch(() => null);
      }
      console.log(`   ✅ Branch ${branch.id}: ${branch.name}`);
    }

    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"Branch"', 'id'), 6, true)`
    ).catch(() => null);
    console.log('   ✅ Sequence Branch diset ke 6\n');

    // ─── 2. Buat Users dengan ID berurutan ──────────────────────────────────
    console.log('👥 Membuat users...');
    const adminUsers = backup.users.filter(u => u.role === 'ADMIN');
    const regularUsers = backup.users.filter(u => u.role !== 'ADMIN');
    const orderedUsers = [...adminUsers, ...regularUsers];

    for (let i = 0; i < orderedUsers.length; i++) {
      const u = orderedUsers[i];
      const userId = i + 1; // Admin = 1, user pertama = 2, dst.

      let branchId = null;
      if (u.branchName) {
        const branch = BRANCHES.find(b => b.name === u.branchName);
        if (branch) {
          branchId = branch.id;
        } else {
          const dbBranch = await prisma.branch.findFirst({ where: { name: u.branchName } });
          branchId = dbBranch?.id || null;
        }
      }

      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "User" (id, username, password, "fullName", role, "branchId", "createdAt") 
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET 
             username = EXCLUDED.username,
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
      } catch (err) {
        await prisma.user.upsert({
          where: { username: u.username },
          update: {
            password: u.password,
            fullName: u.fullName,
            role: u.role,
            branchId: branchId
          },
          create: {
            username: u.username,
            password: u.password,
            fullName: u.fullName,
            role: u.role,
            branchId: branchId
          }
        }).catch(() => null);
      }
      console.log(`   ✅ User ${userId}: ${u.username} (${u.role}) - branch: ${u.branchName || 'ADMIN'}`);
    }

    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"User"', 'id'), $1, true)`,
      orderedUsers.length
    ).catch(() => null);
    console.log(`   ✅ Sequence User diset ke ${orderedUsers.length}\n`);

    // ─── 3. Restore Project & ODP dari backup ───────────────────────────────
    console.log('📁 Restore Project dan ODP dari backup...');
    let projectCount = 0;
    let odpCount = 0;

    for (const backupBranch of backup.branches) {
      const matchedBranch = BRANCHES.find(
        b => b.name === backupBranch.name || 
             b.name.toLowerCase() === backupBranch.name.toLowerCase()
      );

      if (!matchedBranch) {
        console.log(`   ⚠️  Branch "${backupBranch.name}" tidak ditemukan di BRANCHES list, skip.`);
        continue;
      }

      for (const proj of backupBranch.projects) {
        let project = await prisma.project.findFirst({
          where: { name: proj.name, branchId: matchedBranch.id }
        }).catch(() => null);

        if (!project) {
          project = await prisma.project.create({
            data: {
              name: proj.name,
              wok: proj.wok,
              branchId: matchedBranch.id
            }
          }).catch(() => null);
          if (project) projectCount++;
        }

        if (project) {
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
            }).catch(() => null);
            odpCount++;
          }
        }
      }
      console.log(`   ✅ Branch ${matchedBranch.name}: ${backupBranch.projects.length} projects processed`);
    }

    console.log(`\n🎉 Seed selesai!`);
    console.log(`   Branch: 6 (ID 1-6)`);
    console.log(`   Users: ${orderedUsers.length}`);
    console.log(`   Projects processed: ${projectCount}`);
    console.log(`   ODPs processed: ${odpCount}`);
    console.log('\n✅ Database siap digunakan.');
  } catch (error) {
    console.error('❌ Error saat seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
