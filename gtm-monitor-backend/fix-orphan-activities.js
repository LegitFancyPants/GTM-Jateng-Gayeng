const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Cek semua activities yang masih status "upload" tapi foto sudah tidak ada
  const uploadActivities = await prisma.projectActivity.findMany({
    where: { status: 'upload' },
    include: { project: { select: { name: true, branchId: true } } }
  });
  
  console.log(`\n=== ProjectActivity berstatus 'upload': ${uploadActivities.length} ===`);
  
  for (const a of uploadActivities) {
    const photos = await prisma.projectActivityPhoto.findMany({
      where: { projectId: a.projectId, type: a.type }
    });
    console.log(`\nProject: ${a.project.name}`);
    console.log(`  Type: ${a.type}, Status: ${a.status}`);
    console.log(`  Jumlah foto di DB: ${photos.length}`);
    console.log(`  branchId: ${a.project.branchId}`);
    
    // Fix: jika tidak ada foto, reset status ke belum
    if (photos.length === 0) {
      await prisma.projectActivity.update({
        where: { id: a.id },
        data: {
          status: 'belum',
          photoUrl: null,
          planDate: null,
          keterangan: null,
          namaOutlet: null,
          kodeSf: null
        }
      });
      console.log(`  ✅ STATUS DIRESET KE 'belum' (tidak ada foto)`);
    }
  }
  
  console.log('\n✅ Selesai!');
}

check().finally(() => prisma.$disconnect());
