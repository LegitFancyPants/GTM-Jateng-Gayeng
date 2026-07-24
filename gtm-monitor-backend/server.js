const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const prisma = new PrismaClient();

// Configuration
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer storage for photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Multer storage for Excel files
const excelUpload = multer({ dest: 'temp/' });

// --- Endpoints ---

// 1. Auth Endpoint
app.post('/api/auth', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: 'fake-jwt-token-for-admin' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

// Middleware to check fake token
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader === 'Bearer fake-jwt-token-for-admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Forbidden' });
  }
};

// 2. Get All Data (Hierarchical)
app.get('/api/data', async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        projects: {
          include: {
            odps: {
              include: {
                activities: true
              }
            }
          }
        }
      }
    });

    // Transform data to match what the frontend expects
    const formattedBranches = branches.map(b => ({
      name: b.name,
      projects: b.projects.map(p => ({
        name: p.name,
        wok: p.wok,
        odps: p.odps.map(o => ({
          odp: o.odp,
          avai: o.avai,
          used: o.used,
          total: o.total,
          lat: o.lat,
          lon: o.lon,
          activities: o.activities.map(a => ({
            id: a.id,
            type: a.type,
            status: a.status,
            photoUrl: a.photoUrl,
            planDate: a.planDate,
            actualDate: a.actualDate
          }))
        }))
      }))
    }));

    res.json(formattedBranches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// 3. Upload/Update Activity
app.post('/api/activities', upload.single('photo'), async (req, res) => {
  try {
    const { odp, type, status, planDate, actualDate } = req.body;
    let photoUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    // Find the ODP
    const odpRecord = await prisma.odp.findUnique({
      where: { odp: odp }
    });

    if (!odpRecord) {
      return res.status(404).json({ error: 'ODP not found' });
    }

    // Upsert activity
    const activity = await prisma.activity.upsert({
      where: {
        odpId_type: {
          odpId: odpRecord.id,
          type: type
        }
      },
      update: {
        status: status || undefined,
        planDate: planDate ? new Date(planDate) : undefined,
        actualDate: actualDate ? new Date(actualDate) : undefined,
        ...(photoUrl && { photoUrl })
      },
      create: {
        odpId: odpRecord.id,
        type: type,
        status: status || 'belum',
        planDate: planDate ? new Date(planDate) : undefined,
        actualDate: actualDate ? new Date(actualDate) : undefined,
        photoUrl: photoUrl
      }
    });

    res.json({ success: true, activity });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save activity' });
  }
});

// 4. Verify Activity (Admin only)
app.post('/api/verify', requireAdmin, async (req, res) => {
  try {
    const { odp, type } = req.body;

    const odpRecord = await prisma.odp.findUnique({
      where: { odp: odp }
    });

    if (!odpRecord) {
      return res.status(404).json({ error: 'ODP not found' });
    }

    const activity = await prisma.activity.update({
      where: {
        odpId_type: {
          odpId: odpRecord.id,
          type: type
        }
      },
      data: {
        status: 'verified'
      }
    });

    res.json({ success: true, activity });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify activity' });
  }
});

// 5. Import Excel (Admin only)
app.post('/api/admin/import-excel', requireAdmin, excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Expected Excel columns: Branch, Project, WOK, ODP, Avai, Used, Total
    for (const row of data) {
      const branchName = row['Branch'] || row['BRANCH'];
      const projectName = row['Project'] || row['PROJECT'];
      const wokName = row['WOK'] || row['wok'] || '-';
      const odpName = row['ODP'] || row['odp'];
      const avai = parseInt(row['Avai'] || row['AVAI'] || 0);
      const used = parseInt(row['Used'] || row['USED'] || 0);
      const total = parseInt(row['Total'] || row['TOTAL'] || 0);

      if (!branchName || !projectName || !odpName) continue;

      // Upsert Branch
      const branch = await prisma.branch.upsert({
        where: { name: branchName },
        update: {},
        create: { name: branchName }
      });

      // Find or create Project (since Project name might not be globally unique, we search by name and branchId)
      let project = await prisma.project.findFirst({
        where: { name: projectName, branchId: branch.id }
      });

      if (!project) {
        project = await prisma.project.create({
          data: {
            name: projectName,
            wok: wokName,
            branchId: branch.id
          }
        });
      }

      // Upsert ODP
      await prisma.odp.upsert({
        where: { odp: odpName },
        update: {
          avai: avai,
          used: used,
          total: total
        },
        create: {
          odp: odpName,
          avai: avai,
          used: used,
          total: total,
          projectId: project.id
        }
      });
    }

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    res.json({ success: true, message: 'Database updated successfully' });
  } catch (error) {
    console.error(error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to import Excel data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
