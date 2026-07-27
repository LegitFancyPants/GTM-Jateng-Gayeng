/**
 * Script diagnostik: lihat semua data user dan branch saat ini
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

async function checkData() {
  try {
    const users = await prisma.user.findMany({ include: { branch: true }, orderBy: { createdAt: 'asc' } });
    const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
    const projectActivities = await prisma.projectActivity.findMany({ take: 5 });

    console.log('\n👥 USERS:');
    users.forEach(u => {
      console.log(`  id: ${u.id} | role: ${u.role} | username: ${u.username} | branch: ${u.branch?.name || 'ADMIN'} | createdAt: ${u.createdAt}`);
    });

    console.log('\n🏢 BRANCHES:');
    branches.forEach(b => {
      console.log(`  id: ${b.id} | name: ${b.name}`);
    });

    console.log('\n📋 PROJECTACTIVITY (sample):');
    projectActivities.forEach(a => {
      console.log(`  id: ${a.id} | type: ${a.type} | status: ${a.status} | userId: ${a.userId || '(tidak ada kolom userId)'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
