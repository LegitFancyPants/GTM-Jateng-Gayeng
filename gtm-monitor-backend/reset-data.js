const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting data reset...");
  try {
    const resProjectAct = await prisma.projectActivity.deleteMany({});
    console.log(`Deleted ${resProjectAct.count} ProjectActivities.`);
    const resAct = await prisma.activity.deleteMany({});
    console.log(`Deleted ${resAct.count} Activities.`);
    const resOdp = await prisma.odp.deleteMany({});
    console.log(`Deleted ${resOdp.count} ODPs.`);
    const resProject = await prisma.project.deleteMany({});
    console.log(`Deleted ${resProject.count} Projects.`);
    console.log("Data reset completed successfully.");
  } catch (error) {
    console.error("Error during data reset:", error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
