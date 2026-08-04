const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testReject() {
  const projectName = 'PT3-24-GOM-FAK-Jenggolo_Kebumen';
  const branchName = 'PURWOKERTO';
  const type = 'tsel_menyapa';

  console.log('=== TEST REJECT DEBUG ===');
  
  // 1. Cek semua branch
  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  console.log('\n📋 Semua Branch:', branches.map(b => `${b.id}:${b.name}`).join(', '));
  
  // 2. Cari project by name
  const projectsByName = await prisma.project.findMany({
    where: { name: { contains: 'Jenggolo', mode: 'insensitive' } },
    select: { id: true, name: true, branchId: true }
  });
  console.log('\n🔍 Project dengan "Jenggolo":', JSON.stringify(projectsByName, null, 2));
  
  if (projectsByName.length > 0) {
    const proj = projectsByName[0];
    
    // 3. Cek photo di project ini
    const photos = await prisma.projectActivityPhoto.findMany({
      where: { projectId: proj.id }
    });
    console.log('\n📸 Foto di project:', JSON.stringify(photos, null, 2));
    
    // 4. Cek ProjectActivity
    const activities = await prisma.projectActivity.findMany({
      where: { projectId: proj.id }
    });
    console.log('\n🎯 ProjectActivity:', JSON.stringify(activities, null, 2));
  }
  
  await prisma.$disconnect();
}

testReject().catch(e => { console.error(e); prisma.$disconnect(); });
