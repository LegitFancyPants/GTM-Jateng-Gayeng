const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const prisma = new PrismaClient();

// Configuration
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'gtm-super-secret-key-2026';

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(cors());
app.use(express.json());

// Cloudinary Multer Storage for activity photos
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gtm-activities',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  },
});
const upload = multer({ storage: cloudinaryStorage });

// Multer memory storage for Excel files (temp only)
const excelUpload = multer({ storage: multer.memoryStorage() });

// --- Authentication Middlewares ---

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Akses ditolak. Sesi tidak ditemukan.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ success: false, message: 'Sesi telah berakhir (15 menit tidak aktif). Silakan login kembali.' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user && req.user.role === 'ADMIN') {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Akses ditolak. Hanya Administrator yang dapat melakukan tindakan ini.' });
    }
  });
};

// --- Auth Endpoints ---

// Register / Sign Up (User Baru)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, fullName, branchName } = req.body;
    if (!username || !password || !fullName || !branchName) {
      return res.status(400).json({ success: false, message: 'Semua kolom (username, password, nama, dan branch) wajib diisi.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username sudah digunakan oleh akun lain.' });
    }

    const branch = await prisma.branch.findUnique({ where: { name: branchName } });
    if (!branch) {
      return res.status(400).json({ success: false, message: 'Branch yang dipilih tidak ditemukan dalam sistem.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        fullName,
        role: 'USER',
        branchId: branch.id
      },
      include: { branch: true }
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, branchName: branch.name, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role, branchName: branch.name, fullName: user.fullName }
    });
  } catch (error) {
    console.error('Error in /api/auth/register:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal pada server saat registrasi.' });
  }
});

// Login User / Admin
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { branch: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword && password !== user.password) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    const branchName = user.branch ? user.branch.name : null;
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, branchName, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role, branchName, fullName: user.fullName }
    });
  } catch (error) {
    console.error('Error in /api/auth/login:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal saat login.' });
  }
});

// Reset / Forgot Password with credentials verification (Username, Nama Lengkap, Branch)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { username, fullName, branchName, newPassword } = req.body;
    if (!username || !fullName || !branchName || !newPassword) {
      return res.status(400).json({ success: false, message: 'Semua kolom (username, nama lengkap, branch, dan password baru) wajib diisi.' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ success: false, message: 'Password baru minimal harus 4 karakter.' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { branch: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Kredensial tidak cocok. Username tidak ditemukan.' });
    }

    // Verify Full Name
    if (user.fullName.trim().toLowerCase() !== fullName.trim().toLowerCase()) {
      return res.status(400).json({ success: false, message: 'Kredensial tidak cocok. Nama Lengkap tidak sesuai dengan data akun.' });
    }

    // Verify Branch Name
    if (user.role === 'USER') {
      if (!user.branch || user.branch.name.trim().toLowerCase() !== branchName.trim().toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Kredensial tidak cocok. Branch tidak sesuai dengan data akun.' });
      }
    } else if (user.role === 'ADMIN') {
      if (branchName.trim().toUpperCase() !== 'ADMIN' && branchName.trim().toLowerCase() !== (user.branch?.name || '').trim().toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Kredensial tidak cocok. Branch tidak sesuai untuk akun Administrator.' });
      }
    }

    // Hash new password and update user in database
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password Anda telah berhasil diperbarui. Silakan login kembali dengan password baru Anda.'
    });
  } catch (error) {
    console.error('Error in /api/auth/reset-password:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server saat mereset password.' });
  }
});

// Verify session & get current user profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// --- Data Endpoints (Protected & Branch-Scoped) ---

// 1. Get All Data (Filtered by user branch if role === 'USER')
app.get('/api/data', authenticateToken, async (req, res) => {
  try {
    // Branch query filter based on role
    const branchFilter = (req.user && req.user.role === 'USER' && req.user.branchName)
      ? { name: req.user.branchName }
      : {}; // ADMIN gets all branches

    const branches = await prisma.branch.findMany({
      where: branchFilter,
      include: {
        projects: {
          include: {
            odps: true,
            activities: true // ProjectActivity
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
          lon: o.lon
        })),
        // Project-level activities
        activities: p.activities.map(a => ({
          id: a.id,
          type: a.type,
          status: a.status,
          photoUrl: a.photoUrl,
          planDate: a.planDate,
          actualDate: a.actualDate
        }))
      }))
    }));

    res.json(formattedBranches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// 2. Upload/Update Project Activity (Protected & Branch-Scoped)
app.post('/api/activities', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { projectName, branchName, type, status, planDate, actualDate } = req.body;
    // Cloudinary returns the secure URL directly in req.file.path
    let photoUrl = req.file ? req.file.path : undefined;

    // Security Check: USER can only update their assigned branch
    if (req.user && req.user.role === 'USER' && req.user.branchName !== branchName) {
      // If a file was uploaded to Cloudinary, delete it
      if (req.file && req.file.filename) {
        await cloudinary.v2.uploader.destroy(req.file.filename).catch(() => {});
      }
      return res.status(403).json({ error: `Akses ditolak. Anda hanya berhak memodifikasi data di branch ${req.user.branchName}.` });
    }

    // Find the Project by name + branch
    const branch = await prisma.branch.findUnique({ where: { name: branchName } });
    if (!branch) {
      if (req.file && req.file.filename) {
        await cloudinary.v2.uploader.destroy(req.file.filename).catch(() => {});
      }
      return res.status(404).json({ error: 'Branch not found' });
    }

    const project = await prisma.project.findFirst({
      where: { name: projectName, branchId: branch.id }
    });

    if (!project) {
      if (req.file && req.file.filename) {
        await cloudinary.v2.uploader.destroy(req.file.filename).catch(() => {});
      }
      return res.status(404).json({ error: 'Project not found' });
    }

    // Upsert project activity
    const activity = await prisma.projectActivity.upsert({
      where: {
        projectId_type: {
          projectId: project.id,
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
        projectId: project.id,
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

// 3. Verify Project Activity (Admin only)
app.post('/api/verify', requireAdmin, async (req, res) => {
  try {
    const { projectName, branchName, type } = req.body;

    const branch = await prisma.branch.findUnique({ where: { name: branchName } });
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    const project = await prisma.project.findFirst({
      where: { name: projectName, branchId: branch.id }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const activity = await prisma.projectActivity.update({
      where: {
        projectId_type: {
          projectId: project.id,
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

// 4. Import Excel (Admin only) — updates ODP data only
app.post('/api/admin/import-excel', requireAdmin, excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read from buffer (memoryStorage)
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
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

      // Find or create Project
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

    res.json({ success: true, message: 'Database updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to import Excel data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
