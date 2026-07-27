const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BRANCH_COORDS = {
  MAGELANG: { lat: -7.4797, lon: 110.2177 },
  PEKALONGAN: { lat: -6.8886, lon: 109.6753 },
  PURWOKERTO: { lat: -7.4245, lon: 109.2302 },
  SEMARANG: { lat: -7.0051, lon: 110.4381 },
  SURAKARTA: { lat: -7.5755, lon: 110.8243 },
  YOGYAKARTA: { lat: -7.7956, lon: 110.3695 }
};

function getOdpCoords(odpName, branchName) {
  const base = BRANCH_COORDS[branchName?.toString().trim().toUpperCase()] || { lat: -7.25, lon: 110.0 };
  let h = 0;
  for (let i = 0; i < (odpName || '').length; i++) {
    h = ((h << 5) - h) + odpName.charCodeAt(i);
    h |= 0;
  }
  const abs = Math.abs(h);
  const latOffset = ((abs % 1000) - 500) * 0.0003;
  const lonOffset = (((abs / 1000) | 0) % 1000 - 500) * 0.0003;
  return { lat: base.lat + latOffset, lon: base.lon + lonOffset };
}

async function main() {
  console.log('🔍 Checking ODPs with null coordinates...');
  const odps = await prisma.odp.findMany({
    where: { OR: [{ lat: null }, { lon: null }] },
    include: { project: { include: { branch: true } } }
  });
  console.log(`Found ${odps.length} ODPs with null coordinates.`);
  let count = 0;
  for (const o of odps) {
    const coords = getOdpCoords(o.odp, o.project?.branch?.name);
    await prisma.odp.update({
      where: { id: o.id },
      data: { lat: coords.lat, lon: coords.lon }
    });
    count++;
    if (count % 200 === 0) console.log(`Updated ${count}/${odps.length}...`);
  }
  console.log(`✅ Successfully updated ${count} ODPs!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
