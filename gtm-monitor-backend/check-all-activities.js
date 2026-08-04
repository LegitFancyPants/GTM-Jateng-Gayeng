const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Cek SEMUA activities (semua status)
  const allActivities = await prisma.projectActivity.findMany({
    include: { project: { select: { name: true, branchId: true } } }
  });
  
  console.log(`\n=== SEMUA ProjectActivity: ${allActivities.length} ===`);
  
  for (const a of allActivities) {
    const photos = await prisma.projectActivityPhoto.findMany({
      where: { projectId: a.projectId, type: a.type }
    });
    console.log(`Project: ${a.project.name} | Type: ${a.type} | Status: ${a.status} | Foto: ${photos.length}`);
  }
  
  // Cek juga total foto
  const totalPhotos = await prisma.projectActivityPhoto.count();
  console.log(`\nTotal foto di DB: ${totalPhotos}`);
}

check().finally(() => prisma.$disconnect());
