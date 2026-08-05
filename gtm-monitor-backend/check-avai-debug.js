// Script diagnostik: cek berapa banyak ODP dengan avai negatif/nol di DB
// dan berapa total avai per typeDesign
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allProjects = await prisma.project.findMany({
    include: { odps: true }
  });

  let greenTotalAvai = 0, brownTotalAvai = 0, allTotalAvai = 0;
  let greenNegCount = 0, brownNegCount = 0;
  let greenNegSum = 0, brownNegSum = 0;
  let greenZeroFromNeg = 0, brownZeroFromNeg = 0; // ODP yg avai=0 tapi total < used

  for (const p of allProjects) {
    const isGreen = (p.typeDesign || 'Greenfield') === 'Greenfield';
    const isBrown = (p.typeDesign || 'Greenfield') === 'Brownfield';

    for (const o of p.odps) {
      allTotalAvai += o.avai;

      if (isGreen) {
        greenTotalAvai += o.avai;
        if (o.avai < 0) { greenNegCount++; greenNegSum += o.avai; }
        if (o.avai === 0 && o.total < o.used) greenZeroFromNeg++; // clamped ke 0
      }
      if (isBrown) {
        brownTotalAvai += o.avai;
        if (o.avai < 0) { brownNegCount++; brownNegSum += o.avai; }
        if (o.avai === 0 && o.total < o.used) brownZeroFromNeg++;
      }
    }
  }

  console.log('═══════════════════════════════════════════');
  console.log('📊 DIAGNOSTIK AVAI PORT DI DATABASE');
  console.log('═══════════════════════════════════════════');
  console.log(`\n✅ Total Avai di DB:`);
  console.log(`   Semua Tipe : ${allTotalAvai.toLocaleString('id-ID')}`);
  console.log(`   Greenfield : ${greenTotalAvai.toLocaleString('id-ID')}`);
  console.log(`   Brownfield : ${brownTotalAvai.toLocaleString('id-ID')}`);

  console.log(`\n⚠️  ODP dengan avai NEGATIF (sudah disimpan benar):`);
  console.log(`   Greenfield : ${greenNegCount} ODP, total avai negatif = ${greenNegSum}`);
  console.log(`   Brownfield : ${brownNegCount} ODP, total avai negatif = ${brownNegSum}`);

  console.log(`\n🔴 ODP dengan avai=0 PADAHAL total < used (masih error, belum di-fix):`);
  console.log(`   Greenfield : ${greenZeroFromNeg} ODP`);
  console.log(`   Brownfield : ${brownZeroFromNeg} ODP`);

  if (greenZeroFromNeg > 0 || brownZeroFromNeg > 0) {
    console.log(`\n💡 Ada ODP yang masih pakai nilai lama (clamped ke 0).`);
    console.log(`   → Perlu reset DB dan upload ulang Excel setelah server di-restart.`);
  } else if (greenNegCount > 0 || brownNegCount > 0) {
    console.log(`\n✅ Fix sudah aktif! Nilai negatif sudah tersimpan dengan benar.`);
  } else {
    console.log(`\n⚠️  Tidak ada ODP negatif di DB. Fix belum terpakai atau Excel tidak punya nilai minus.`);
    console.log(`   → Pastikan server sudah di-restart dan Excel di-upload ulang.`);
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('📋 TARGET (dari Excel tanggal 20):');
  console.log('   Semua Tipe : 19.653');
  console.log('   Greenfield : 12.078');
  console.log('   Brownfield : 7.575');
  console.log('═══════════════════════════════════════════');
}

main().finally(() => prisma.$disconnect());
