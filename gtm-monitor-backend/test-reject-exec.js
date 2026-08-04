const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRejectExec() {
  const projectName = "PT3-24-GOM-FAK-Jenggolo_Kebumen";
  const type = "tsel_menyapa";

  const project = await prisma.project.findFirst({
    where: { name: projectName }
  });

  console.log("Project:", project);

  const updatedAct = await prisma.projectActivity.updateMany({
    where: { projectId: project.id, type: type },
    data: {
      status: 'belum',
      photoUrl: null,
      planDate: null,
      keterangan: null
    }
  });

  console.log("SUCCESS! ProjectActivity updated:", updatedAct);
}

testRejectExec().finally(() => prisma.$disconnect());
