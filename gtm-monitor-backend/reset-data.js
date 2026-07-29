const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting data reset...");
  try {
    const resProjectAct = await prisma.projectActivity.deleteMany({});
    console.log(`✅ Deleted ${resProjectAct.count} ProjectActivities.`);

    const resAct = await prisma.activity.deleteMany({});
    console.log(`✅ Deleted ${resAct.count} Activities.`);

    const resOdp = await prisma.odp.deleteMany({});
    console.log(`✅ Deleted ${resOdp.count} ODPs.`);

    const resProject = await prisma.project.deleteMany({});
    console.log(`✅ Deleted ${resProject.count} Projects.`);

    if (prisma.importMeta) {
      const resImportMeta = await prisma.importMeta.deleteMany({});
      console.log(`✅ Deleted ${resImportMeta.count} ImportMetas.`);
    }

    const resBranchUpdate = await prisma.branch.updateMany({
      data: {
        occRate: null,
        gapWoW: null
      }
    });
    console.log(`✅ Reset occRate & gapWoW for ${resBranchUpdate.count} Branches.`);

    const userCount = await prisma.user.count();
    const branchCount = await prisma.branch.count();

    console.log("\n📊 Summary:");
    console.log(`- Accounts preserved: ${userCount} Users`);
    console.log(`- Branches preserved: ${branchCount} Branches`);
    console.log("✨ Database reset completed successfully!");
  } catch (error) {
    console.error("❌ Error during data reset:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();


