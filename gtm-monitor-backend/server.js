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
const crypto = require('crypto');

const app = express();
const prisma = new PrismaClient();

// Configuration
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'gtm-super-secret-key-2026';

const BRANCH_COORDS = {
  MAGELANG: { lat: -7.4797, lon: 110.2177 },
  PEKALONGAN: { lat: -6.8886, lon: 109.6753 },
  PURWOKERTO: { lat: -7.4245, lon: 109.2302 },
  SEMARANG: { lat: -7.0051, lon: 110.4381 },
  SURAKARTA: { lat: -7.5755, lon: 110.8243 },
  YOGYAKARTA: { lat: -7.7956, lon: 110.3695 }
};

function getOdpCoords(odpName, branchName, existingLat, existingLon) {
  if (typeof existingLat === 'number' && typeof existingLon === 'number' && !isNaN(existingLat) && !isNaN(existingLon)) {
    return { lat: existingLat, lon: existingLon };
  }
  const base = BRANCH_COORDS[branchName?.toString().trim().toUpperCase()] || { lat: -7.25, lon: 110.0 };
  let h = 0;
  for (let i = 0; i < (odpName || '').length; i++) {
    h = ((h << 5) - h) + odpName.charCodeAt(i);
    h |= 0;
  }
  const abs = Math.abs(h);
  const latOffset = ((abs % 1000) - 500) * 0.0003; // ~ +/- 0.15 deg (~15 km radius)
  const lonOffset = (((abs / 1000) | 0) % 1000 - 500) * 0.0003;
  return { lat: base.lat + latOffset, lon: base.lon + lonOffset };
}

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(cors());
app.use(express.json());

// Cloudinary Multer Storage for activity photos
// PENTING: multer-storage-cloudinary v4 membutuhkan API v2
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
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

// Register User Baru (khusus Admin — akun WOK sudah dibuat tetap, bukan self-signup)
app.post('/api/auth/register', requireAdmin, async (req, res) => {
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

// 1. Get All Data (Both ADMIN and USER get all branches for Dashboard view)
app.get('/api/data', authenticateToken, async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        projects: {
          include: {
            odps: true,
            activities: true // ProjectActivity
          }
        }
      }
    });

    // Transform data to match what the frontend expects (Return all projects for Dashboard & typeDesign support)
    const formattedBranches = branches.map(b => ({
      name: b.name,
      projects: b.projects.map(p => {
        // Pre-kalkulasi total per proyek
        const usedTotal = p.odps.reduce((s, o) => s + o.used, 0);
        const avaiTotal = p.odps.reduce((s, o) => s + o.avai, 0);
        const totalPort = p.odps.reduce((s, o) => s + o.total, 0);
        const occRate = totalPort > 0 ? Math.round((usedTotal / totalPort) * 1000) / 10 : 0;
        const odpCount = p.odps.length;
        const isPriority = odpCount > 1 && occRate < 35;
        const typeDesign = p.typeDesign || 'Greenfield';

        return {
          name: p.name,
          wok: p.wok,
          typeDesign,
          isPriority,
          // Totals siap pakai
          usedTotal,
          avaiTotal,
          totalPort,
          occRate,
          odpCount,
          odps: p.odps.map(o => {
            const coords = getOdpCoords(o.odp, b.name, o.lat, o.lon);
            const pct = o.total > 0 ? o.used / o.total : 0;
            const calcStatus = o.used === 0
              ? 'BLACK'
              : pct < 0.25
              ? 'GREEN'
              : pct < 0.50
              ? 'YELLOW'
              : pct < 0.75
              ? 'ORANGE'
              : 'RED';
            const occStatus = o.occStatus ? o.occStatus.toUpperCase() : calcStatus;

            return {
              odp: o.odp,
              avai: o.avai,
              used: o.used,
              total: o.total,
              lat: coords.lat,
              lon: coords.lon,
              occStatus: occStatus
            };
          }),
          // Project-level activities
          activities: p.activities.map(a => ({
            id: a.id,
            type: a.type,
            status: a.status,
            photoUrl: a.photoUrl,
            planDate: a.planDate,
            actualDate: a.actualDate,
            keterangan: a.keterangan
          }))
        };
      })
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
    const { projectName, branchName, type, status, planDate, actualDate, keterangan } = req.body;
    console.log(`[Activity POST] project: ${projectName}, type: ${type}, status: ${status}, keterangan:`, keterangan);
    // Cloudinary returns the secure URL — coba berbagai properti sebagai fallback
    let photoUrl = req.file
      ? (req.file.path || req.file.secure_url || req.file.url || undefined)
      : undefined;
    console.log('[Upload] req.file info:', req.file ? { path: req.file.path, secure_url: req.file.secure_url, filename: req.file.filename, size: req.file.size } : 'no file');
    console.log('[Upload] photoUrl resolved:', photoUrl);

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

    // Upsert project activity (dengan userId untuk tracking)
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
        ...(photoUrl && { photoUrl }),
        ...(keterangan !== undefined && { keterangan }),
        userId: req.user?.id || undefined  // update userId jika ada perubahan
      },
      create: {
        projectId: project.id,
        type: type,
        status: status || 'belum',
        planDate: planDate ? new Date(planDate) : undefined,
        actualDate: actualDate ? new Date(actualDate) : undefined,
        photoUrl: photoUrl,
        keterangan: keterangan !== undefined ? keterangan : null,
        userId: req.user?.id || undefined  // simpan siapa yang upload
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

// 4. Import Excel (Admin only) — updates ODP data and creates Projects/Branches robustly & super fast
app.post('/api/admin/import-excel', requireAdmin, excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const startTime = Date.now();
    console.log('📦 Memulai import Excel dengan In-Memory Mapping & Batch Processing...');

    // Read from buffer (memoryStorage)
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    
    let totalRowsProcessed = 0;
    let projectsCreated = 0;
    let odpsUnchanged = 0;
    const branchesFound = new Set();

    // ─── 1. IN-MEMORY MAPPING (Load semua data dari DB ke RAM sekaligus) ───
    const allDbBranches = await prisma.branch.findMany();
    const branchMap = new Map(); // uppercase name -> branch object
    for (const b of allDbBranches) {
      branchMap.set(b.name.toUpperCase(), b);
    }

    const allProjects = await prisma.project.findMany({
      include: { odps: true }
    });
    const projectMap = new Map(); // `${branchId}||${projectName.toUpperCase()}` -> project object
    const odpMap = new Map(); // odpName.toUpperCase() -> odp object

    for (const p of allProjects) {
      projectMap.set(`${p.branchId}||${p.name.toUpperCase()}`, p);
      for (const o of p.odps) {
        odpMap.set(o.odp.toUpperCase(), o);
      }
    }

    const projectsToCreate = [];
    const odpsToCreate = [];
    const odpsToUpdate = [];

    // ─── 2. PROCESS ROWS IN RAM (Sangat cepat & 100% akurat) ───
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      // Convert to 2D array to find the true header row (ignoring titles)
      const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      let headerRowIndex = 0;
      let headers = [];
      
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const rowStrings = (rawData[i] || []).map(c => c ? c.toString().trim().toUpperCase() : '');
        if (rowStrings.some(c => c.includes('PROJECT') || c.includes('PROYEK') || c.includes('BRANCH') || c.includes('CABANG'))) {
          headerRowIndex = i;
          headers = rowStrings;
          break;
        }
      }

      if (headers.length === 0) continue; // Skip sheet if no valid headers found

      // Map rows based on the detected headers
      const data = [];
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const rowObj = {};
        let hasData = false;
        for (let j = 0; j < headers.length; j++) {
          if (headers[j]) {
            rowObj[headers[j]] = rawData[i][j];
            if (rawData[i][j] !== undefined && rawData[i][j] !== null && rawData[i][j] !== '') hasData = true;
          }
        }
        if (hasData) data.push(rowObj);
      }

      for (const row of data) {
        // Headers are already normalized (uppercase & trimmed)
        const normRow = row;

        // Helper untuk mencari kolom dengan pencarian kata kunci yang fleksibel
        const findValue = (rowObj, possibleKeys, substringKeywords) => {
          for (const key of possibleKeys) {
            if (rowObj[key] !== undefined && rowObj[key] !== null) return rowObj[key];
          }
          if (substringKeywords) {
            for (const [key, val] of Object.entries(rowObj)) {
              for (const kw of substringKeywords) {
                if (key.includes(kw) && val !== undefined && val !== null) return val;
              }
            }
          }
          return undefined;
        };

        const rawBranch = findValue(normRow, ['TELKOMSEL BRANCH', 'TELKOMSEL', 'BRANCH', 'CABANG', 'NAMA BRANCH', 'NAMA CABANG', 'AREA'], ['BRANCH', 'CABANG', 'TELKOMSEL']) || '';
        const rawProject = findValue(normRow, ['NAMA PROYEK', 'PROJECT', 'PROYEK', 'NAMA PROJECT', 'ID PROJECT'], ['PROJECT', 'PROYEK']) || '';
        const rawWok = findValue(normRow, ['BWOK', 'WOK', 'WILAYAH', 'KOTA'], ['WOK', 'WILAYAH', 'BWOK']) || '-';
        const rawUsia = findValue(normRow, ['USIA', 'AGE', 'UMUR'], ['USIA', 'AGE']) || '';
        const rawTypeDesign = findValue(normRow, ['TYPE DESIGN', 'DESIGN TYPE', 'TYPE', 'GREENFIELD/BROWNFIELD', 'GREENFIELD / BROWNFIELD', 'DESIGN'], ['DESIGN', 'GREENFIELD', 'BROWNFIELD']);
        
        let typeDesign = 'Greenfield';
        if (rawTypeDesign) {
          const strVal = rawTypeDesign.toString().toUpperCase();
          if (strVal.includes('BROWN')) typeDesign = 'Brownfield';
          else if (strVal.includes('GREEN')) typeDesign = 'Greenfield';
        }
        
        const rawStatus = findValue(normRow, ['STATUS ODP', 'OCC STATUS', 'STATUS', 'WARNA ODP', 'COLOR', 'WARNA'], ['STATUS', 'WARNA']);
        let excelOccStatus = null;
        if (rawStatus) {
          const strS = rawStatus.toString().toUpperCase();
          if (strS.includes('BLACK') || strS.includes('HITAM')) excelOccStatus = 'BLACK';
          else if (strS.includes('GREEN') || strS.includes('HIJAU')) excelOccStatus = 'GREEN';
          else if (strS.includes('YELLOW') || strS.includes('KUNING')) excelOccStatus = 'YELLOW';
          else if (strS.includes('ORANGE') || strS.includes('JINGGA')) excelOccStatus = 'ORANGE';
          else if (strS.includes('RED') || strS.includes('MERAH')) excelOccStatus = 'RED';
        }

        const rawOdp = findValue(normRow, ['ODP NAME', 'ID ODP', 'NAMA ODP', 'ODP ID'], ['ODP NAME', 'ID ODP']);
        const jumlahOdp = parseInt(findValue(normRow, ['JUMLAH ODP', 'ODP COUNT', 'TOTAL ODP'], ['JUMLAH ODP']) || 1) || 1;

        const total = parseInt(findValue(normRow, ['PORT', 'TOTAL PORT', 'IS TOTALIUM', 'TOTALIUM', 'TOTAL', 'KAPASITAS'], ['PORT', 'TOTAL']) || 0) || 0;
        const used = parseInt(findValue(normRow, ['USED', 'USED IUM', 'TERPAKAI', 'PORT USED'], ['USED', 'TERPAKAI']) || 0) || 0;
        
        const avaiVal = findValue(normRow, ['AVAI IUM', 'AVAI', 'AVAILABLE', 'TERSEDIA', 'PORT AVAI'], ['AVAI', 'AVAILABLE']);
        const avai = (avaiVal !== undefined && avaiVal !== null) ? (parseInt(avaiVal) || 0) : Math.max(0, total - used);

        if (!rawBranch || !rawProject) continue;

        // Clean & uppercase branch name
        let branchName = rawBranch.toString().trim().toUpperCase();
        if (branchName === 'JOGJA' || branchName === 'YOGYA' || branchName === 'DIY') branchName = 'YOGYAKARTA';
        if (branchName === 'SOLO') branchName = 'SURAKARTA';
        if (branchName === 'PWK') branchName = 'PURWOKERTO';
        if (branchName === 'PKL') branchName = 'PEKALONGAN';
        if (branchName === 'SMG') branchName = 'SEMARANG';
        if (branchName === 'MGL') branchName = 'MAGELANG';

        // Get or create branch
        let branch = branchMap.get(branchName);
        if (!branch) {
          branch = await prisma.branch.upsert({
            where: { name: branchName },
            update: {},
            create: { name: branchName }
          });
          branchMap.set(branchName, branch);
        }

        // Find or create Project
        let projectName = rawProject.toString().trim();
        const wokName = rawWok.toString().trim();
        const usiaName = rawUsia.toString().trim();
        
        // Mencegah penggabungan proyek yang namanya sama tapi baris berbeda (misal beda Usia)
        if (usiaName) {
          projectName = `${projectName} (${usiaName})`;
        }

        const projectKey = `${branch.id}||${projectName.toUpperCase()}`;
        let project = projectMap.get(projectKey);

        if (!project) {
          const newProjectId = crypto.randomUUID();
          project = {
            id: newProjectId,
            name: projectName,
            wok: wokName,
            typeDesign: typeDesign,
            branchId: branch.id
          };
          projectsToCreate.push(project);
          projectMap.set(projectKey, project);
          projectsCreated++;
        }

        // Processing ODPs (Either explicit ODP Name or Synthetic ODPs based on Jumlah ODP)
        const countToCreate = rawOdp ? 1 : Math.max(1, jumlahOdp);
        const baseSubTotal = Math.floor(total / countToCreate);
        const baseSubUsed = Math.floor(used / countToCreate);

        let remainingTotal = total;
        let remainingUsed = used;

        for (let i = 1; i <= countToCreate; i++) {
          const odpName = rawOdp 
            ? rawOdp.toString().trim() 
            : `${projectName}-${wokName !== '-' ? wokName : 'WOK'}-${totalRowsProcessed + 1}-${i}`;
          
          let subTotal = baseSubTotal;
          let subUsed = baseSubUsed;
          
          // The last ODP gets the remainder to ensure exact sums
          if (i === countToCreate) {
            subTotal = remainingTotal;
            subUsed = remainingUsed;
          } else {
            remainingTotal -= subTotal;
            remainingUsed -= subUsed;
          }
          const subAvai = Math.max(0, subTotal - subUsed);

          const cleanOdpKey = odpName.toUpperCase();
          const existingOdp = odpMap.get(cleanOdpKey);

          if (existingOdp) {
            if (existingOdp.id && existingOdp.id.startsWith('temp-')) {
              const target = odpsToCreate.find(item => item.odp.toUpperCase() === cleanOdpKey);
              if (target) {
                target.avai = subAvai;
                target.used = subUsed;
                target.total = subTotal;
                target.projectId = project.id;
              }
            } else if (
              existingOdp.avai !== subAvai ||
              existingOdp.used !== subUsed ||
              existingOdp.total !== subTotal ||
              existingOdp.projectId !== project.id
            ) {
              odpsToUpdate.push({
                id: existingOdp.id,
                odp: odpName,
                avai: subAvai,
                used: subUsed,
                total: subTotal,
                projectId: project.id
              });
              existingOdp.avai = subAvai;
              existingOdp.used = subUsed;
              existingOdp.total = subTotal;
              existingOdp.projectId = project.id;
            } else {
              odpsUnchanged++;
            }
          } else {
            const coords = getOdpCoords(odpName, branch.name, null, null);
            odpsToCreate.push({
              odp: odpName,
              avai: subAvai,
              used: subUsed,
              total: subTotal,
              lat: coords.lat,
              lon: coords.lon,
              projectId: project.id
            });
            odpMap.set(cleanOdpKey, {
              id: 'temp-' + odpsToCreate.length,
              odp: odpName,
              avai: subAvai,
              used: subUsed,
              total: subTotal,
              lat: coords.lat,
              lon: coords.lon,
              projectId: project.id
            });
          }
        }

        totalRowsProcessed++;
        branchesFound.add(branch.name);
      }
    }

    // ─── 3. BATCH EXECUTION (Kirim ke DB sekaligus dengan aman) ───
    console.log(`⚡ RAM Processing selesai. Menyiapkan Batch DB: ${projectsToCreate.length} project, ${odpsToCreate.length} ODP baru, ${odpsToUpdate.length} update.`);

    // Batch Insert Project Baru
    if (projectsToCreate.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < projectsToCreate.length; i += BATCH_SIZE) {
        const batch = projectsToCreate.slice(i, i + BATCH_SIZE);
        await prisma.project.createMany({
          data: batch,
          skipDuplicates: true
        });
      }
    }

    // Batch Insert ODP Baru (dalam grup 500 baris)
    if (odpsToCreate.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < odpsToCreate.length; i += BATCH_SIZE) {
        const batch = odpsToCreate.slice(i, i + BATCH_SIZE);
        await prisma.odp.createMany({
          data: batch,
          skipDuplicates: true
        });
      }
    }

    // Batch Update ODP yang Berubah (diproses paralel 50 request serentak)
    if (odpsToUpdate.length > 0) {
      const CONCURRENCY = 50;
      for (let i = 0; i < odpsToUpdate.length; i += CONCURRENCY) {
        const chunk = odpsToUpdate.slice(i, i + CONCURRENCY);
        await Promise.all(
          chunk.map(item => 
            prisma.odp.update({
              where: { id: item.id },
              data: {
                avai: item.avai,
                used: item.used,
                total: item.total,
                projectId: item.projectId
              }
            }).catch(err => console.error(`Gagal update ODP ${item.odp}:`, err.message))
          )
        );
      }
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Excel Import selesai dalam ${durationSec} detik! (Processed ${totalRowsProcessed} rows across ${branchesFound.size} branches)`);

    res.json({ 
      success: true, 
      message: `Database berhasil diperbarui dalam ${durationSec} detik! (${totalRowsProcessed} baris diproses: ${odpsToCreate.length} baru, ${odpsToUpdate.length} diperbarui, ${odpsUnchanged} tidak berubah)`,
      stats: {
        durationSec,
        rows: totalRowsProcessed,
        projectsCreated,
        odpsCreated: odpsToCreate.length,
        odpsUpdated: odpsToUpdate.length,
        odpsUnchanged,
        branches: Array.from(branchesFound)
      }
    });
  } catch (error) {
    console.error('Excel Import Error:', error);
    res.status(500).json({ error: 'Failed to import Excel data: ' + error.message });
  }
});

// --- Serve Static React App & SPA Fallback for Single Deploy ---
const staticPath = path.join(__dirname, '../gtm-monitor-react/dist');
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
  app.use((req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

