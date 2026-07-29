const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    include: { odps: true }
  });

  let totalProjects = projects.length;
  let passedProjects = 0;
  let failedProjects = 0;
  
  let failOdpCount = 0;
  let failOcc = 0;
  let passReasons = [];

  for (const p of projects) {
    const odpCount = p.odps.length;
    let failed = false;
    let occVal = 0;

    if (odpCount <= 1) {
      failOdpCount++;
      failed = true;
    } else {
      const usedTotal = p.odps.reduce((s, o) => s + o.used, 0);
      const totalPort = p.odps.reduce((s, o) => s + o.total, 0);
      occVal = totalPort > 0 ? (usedTotal / totalPort) * 100 : 0;
      if (occVal >= 35) {
        failOcc++;
        failed = true;
      }
    }

    if (!failed) {
      passedProjects++;
    }
  }

  console.log(`Total Projects in DB: ${totalProjects}`);
  console.log(`Passed Filter: ${passedProjects}`);
  console.log(`Failed due to ODP <= 1: ${failOdpCount}`);
  console.log(`Failed due to OCC >= 35%: ${failOcc}`);
}

main().finally(() => prisma.$disconnect());
