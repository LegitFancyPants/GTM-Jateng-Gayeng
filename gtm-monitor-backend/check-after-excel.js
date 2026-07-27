/**
 * Script untuk mengecek isi branch, project, dan odp pasca upload excel
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

async function check() {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        projects: {
          include: {
            odps: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });

    console.log(`\n🏢 DAFTAR BRANCH DI DATABASE (Total: ${branches.length}):`);
    branches.forEach(b => {
      const totalOdps = b.projects.reduce((sum, p) => sum + p.odps.length, 0);
      console.log(`  [ID: ${b.id}] "${b.name}" -> ${b.projects.length} Project, ${totalOdps} ODP`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
