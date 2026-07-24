const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function seed() {
  console.log('Seeding database from gtm-data.js...');
  
  try {
    // Read the file content as text
    const dataPath = path.join(__dirname, '../gtm-monitor-react/src/data/gtm-data.js');
    if (!fs.existsSync(dataPath)) {
      console.log('gtm-data.js not found, skipping seed.');
      return;
    }
    
    let content = fs.readFileSync(dataPath, 'utf8');
    // Simple string manipulation to convert ES6 export to valid JSON
    content = content.replace('export const BRANCHES = ', '');
    // Remove the trailing semicolon if it exists
    if (content.endsWith(';')) content = content.slice(0, -1);
    
    // Using eval or a Function is easier since the file contains JS objects with unquoted keys sometimes
    // But since it's a known file format, we can safely use Function
    const branches = new Function(`return ${content}`)();

    for (const branch of branches) {
      const bRecord = await prisma.branch.upsert({
        where: { name: branch.name },
        update: {},
        create: { name: branch.name }
      });

      for (const project of branch.projects) {
        let pRecord = await prisma.project.findFirst({
          where: { name: project.name, branchId: bRecord.id }
        });

        if (!pRecord) {
          pRecord = await prisma.project.create({
            data: {
              name: project.name,
              wok: project.wok,
              branchId: bRecord.id
            }
          });
        }

        for (const odp of project.odps) {
          const oRecord = await prisma.odp.upsert({
            where: { odp: odp.odp },
            update: {
              avai: odp.avai,
              used: odp.used,
              total: odp.total,
              lat: odp.lat,
              lon: odp.lon
            },
            create: {
              odp: odp.odp,
              avai: odp.avai,
              used: odp.used,
              total: odp.total,
              lat: odp.lat,
              lon: odp.lon,
              projectId: pRecord.id
            }
          });

          for (const act of odp.activities) {
            await prisma.activity.upsert({
              where: {
                odpId_type: {
                  odpId: oRecord.id,
                  type: act.type
                }
              },
              update: {}, // Don't override if already exists
              create: {
                odpId: oRecord.id,
                type: act.type,
                status: act.status,
                planDate: act.planDate ? new Date(act.planDate) : undefined,
                actualDate: act.actualDate ? new Date(act.actualDate) : undefined,
                photoUrl: act.photoUrl
              }
            });
          }
        }
      }
    }
    
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
