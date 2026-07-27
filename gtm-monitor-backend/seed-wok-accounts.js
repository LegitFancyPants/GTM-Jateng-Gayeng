const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const WOK_ACCOUNTS = [
  { username: 'batang', fullName: 'WOK Batang', branchName: 'PEKALONGAN' },
  { username: 'boyolali', fullName: 'WOK Boyolali', branchName: 'SURAKARTA' },
  { username: 'cilacapbanyumas', fullName: 'WOK Cilacap Banyumas', branchName: 'PURWOKERTO' },
  { username: 'demak', fullName: 'WOK Demak', branchName: 'SEMARANG' },
  { username: 'jeparakuduspati', fullName: 'WOK Jepara Kudus - Pati', branchName: 'SEMARANG' },
  { username: 'kebumen', fullName: 'WOK Kebumen', branchName: 'PURWOKERTO' },
  { username: 'magelangtemanggung', fullName: 'WOK Magelang Temanggung', branchName: 'MAGELANG' },
  { username: 'pemalangpurbalingga', fullName: 'WOK Pemalang Purbalingga', branchName: 'PEKALONGAN' },
  { username: 'semarang1', fullName: 'WOK Semarang 1', branchName: 'SEMARANG' },
  { username: 'semarang2', fullName: 'WOK Semarang 2', branchName: 'SEMARANG' },
  { username: 'sragen', fullName: 'WOK Sragen', branchName: 'SURAKARTA' },
  { username: 'surakarta', fullName: 'WOK Surakarta', branchName: 'SURAKARTA' },
  { username: 'tegalbrebes', fullName: 'WOK Tegal Brebes', branchName: 'PEKALONGAN' },
  { username: 'wonosobobanjarnegara', fullName: 'WOK Wonosobo Banjarnegara', branchName: 'PURWOKERTO' },
  { username: 'yogya1', fullName: 'WOK Yogya 1', branchName: 'YOGYAKARTA' },
  { username: 'yogya2', fullName: 'WOK Yogya 2', branchName: 'YOGYAKARTA' },
];

function generatePassword(username) {
  return `pas${username}123`;
}

async function seed() {
  console.log('Seeding 16 akun WOK...');

  for (const account of WOK_ACCOUNTS) {
    const branch = await prisma.branch.findUnique({ where: { name: account.branchName } });
    if (!branch) {
      console.error(`Branch "${account.branchName}" tidak ditemukan, lewati akun "${account.username}".`);
      continue;
    }

    const password = generatePassword(account.username);
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.upsert({
      where: { username: account.username },
      update: {
        fullName: account.fullName,
        role: 'USER',
        branchId: branch.id,
      },
      create: {
        username: account.username,
        password: hashedPassword,
        fullName: account.fullName,
        role: 'USER',
        branchId: branch.id,
      },
    });

    console.log(`OK: ${account.username} -> ${account.branchName} (password: ${password})`);
  }

  console.log('Seeding akun WOK selesai.');
}

seed()
  .catch((error) => {
    console.error('Error during seeding:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
