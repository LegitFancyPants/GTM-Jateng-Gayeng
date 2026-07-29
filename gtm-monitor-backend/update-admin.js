const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log("🔒 Updating Admin credentials...");
  const hashedPassword = await bcrypt.hash('Jatenggayeng123*', 10);
  
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (admin) {
    const updated = await prisma.user.update({
      where: { id: admin.id },
      data: {
        username: 'jateng',
        password: hashedPassword
      }
    });
    console.log(`✅ Admin account updated successfully!`);
    console.log(`   - Username: ${updated.username}`);
    console.log(`   - Full Name: ${updated.fullName}`);
    console.log(`   - Role: ${updated.role}`);
  } else {
    const created = await prisma.user.create({
      data: {
        username: 'jateng',
        password: hashedPassword,
        fullName: 'Administrator Pusat GTM',
        role: 'ADMIN',
        branchId: null
      }
    });
    console.log(`✅ Admin account created successfully!`);
    console.log(`   - Username: ${created.username}`);
    console.log(`   - Full Name: ${created.fullName}`);
    console.log(`   - Role: ${created.role}`);
  }
}

main()
  .catch(err => {
    console.error("❌ Error updating admin account:", err);
  })
  .finally(() => {
    prisma.$disconnect();
  });
