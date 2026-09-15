const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Faculty = require('../models/Faculty');
const { generateToken } = require('../middleware/auth');

/**
 * Format faculty document for safe client consumption (never returns password)
 */
const formatFaculty = (doc) => {
  if (!doc) return null;
  const raw = doc.toObject ? doc.toObject() : doc;
  const { password, __v, ...safe } = raw;
  return safe;
};

/**
 * Validation helpers
 */
const isValidEmail = (email) => {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const validateSittingLocation = (block, floor, roomNo) => {
  if (!block || typeof block !== 'string') {
    return 'Building block is required (e.g. BLOCK A, BLOCK B, BLOCK C).';
  }
  const cleanBlock = block.trim().toUpperCase();
  if (!['BLOCK A', 'BLOCK B', 'BLOCK C'].includes(cleanBlock)) {
    return 'Invalid block. Must be BLOCK A, BLOCK B, or BLOCK C.';
  }

  const numFloor = Number(floor);
  if (isNaN(numFloor) || !Number.isInteger(numFloor)) {
    return 'Floor must be a valid integer.';
  }

  if ((cleanBlock === 'BLOCK A' || cleanBlock === 'BLOCK C') && numFloor !== 0) {
    return `${cleanBlock} only supports Ground Floor (Floor 0).`;
  }

  if (cleanBlock === 'BLOCK B' && (numFloor < 1 || numFloor > 4)) {
    return 'BLOCK B supports Floors 1 through 4.';
  }

  if (!roomNo || typeof roomNo !== 'string' || !roomNo.trim()) {
    return 'Room number is required (e.g. B-108, A-102, C-005).';
  }

  return null;
};

/**
 * GET /api/faculty
 * Retrieve faculties with optional filters (block, floor, roomNo, department, q)
 * Never returns passwords.
 */
const getFaculties = async (req, res) => {
  try {
    const { block, floor, roomNo, department, q } = req.query;
    const query = {};

    if (block) {
      const cleanBlock = block.replace(/^BLOCK\s*/i, '').trim();
      query.$or = [
        { 'sittingLocation.block': block },
        { 'sittingLocation.block': `BLOCK ${cleanBlock}` },
        { 'sittingLocation.block': `Block ${cleanBlock}` },
        { 'sittingLocation.block': cleanBlock },
      ];
    }

    if (floor !== null && floor !== undefined && floor !== '') {
      query['sittingLocation.floor'] = Number(floor);
    }

    if (roomNo) {
      const cleanRoom = roomNo.trim();
      const roomNumOnly = cleanRoom.replace(/^[A-Za-z]+[-_\s]*/, '');
      const roomQueries = [
        { 'sittingLocation.roomNo': cleanRoom },
        { 'sittingLocation.roomNo': roomNumOnly },
        { 'sittingLocation.roomNo': { $regex: new RegExp(`^${cleanRoom}$`, 'i') } },
        { 'sittingLocation.roomNo': { $regex: new RegExp(`.*${roomNumOnly}.*`, 'i') } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: roomQueries }];
        delete query.$or;
      } else {
        query.$or = roomQueries;
      }
    }

    if (department && department !== 'all' && department !== 'All Departments') {
      query.department = { $regex: new RegExp(`^${department.trim()}$`, 'i') };
    }

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      const textFilter = {
        $or: [
          { name: regex },
          { department: regex },
          { designation: regex },
          { 'sittingLocation.roomNo': regex },
        ],
      };
      if (query.$and) {
        query.$and.push(textFilter);
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, textFilter];
        delete query.$or;
      } else {
        Object.assign(query, textFilter);
      }
    }

    const faculties = await Faculty.find(query)
      .select('-password -__v')
      .sort({ updatedAt: -1, name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: faculties.length,
      data: faculties,
    });
  } catch (err) {
    console.error('[facultyController.getFaculties]', err.message);
    return res.status(500).json({
      success: false,
      error: `Database error: ${err.message}`,
    });
  }
};

/**
 * GET /api/faculty/:id
 */
const getFacultyById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid faculty ID format' });
    }

    const faculty = await Faculty.findById(id).select('-password -__v').lean();
    if (!faculty) {
      return res.status(404).json({ success: false, error: 'Faculty member not found' });
    }

    return res.status(200).json({ success: true, data: faculty });
  } catch (err) {
    console.error('[facultyController.getFacultyById]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/faculty
 * Handles both Faculty Login and Secure Faculty Registration
 */
const handleFacultyAuth = async (req, res) => {
  try {
    const body = req.body || {};
    const { action = 'register', email, password } = body;

    // ── 1. FACULTY LOGIN ────────────────────────────────────────────────────────
    if (action === 'login') {
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required for login.',
        });
      }

      const cleanEmail = email.trim().toLowerCase();
      // Need password explicitly since select: false
      const faculty = await Faculty.findOne({ email: cleanEmail }).select('+password');

      if (!faculty) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password. Please check your credentials.',
        });
      }

      // Verify bcrypt password (or upgrade legacy plaintext password)
      let isMatch = false;
      if (faculty.password.startsWith('$2a$') || faculty.password.startsWith('$2b$')) {
        isMatch = await bcrypt.compare(password.trim(), faculty.password);
      } else {
        // Legacy plaintext fallback
        if (faculty.password === password.trim()) {
          isMatch = true;
          // Upgrade immediately to bcrypt
          faculty.password = await bcrypt.hash(password.trim(), 10);
          await faculty.save();
        }
      }

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password. Please check your credentials.',
        });
      }

      const token = generateToken(faculty);
      const safeFaculty = formatFaculty(faculty);

      return res.status(200).json({
        success: true,
        message: 'Faculty login successful!',
        token,
        faculty: safeFaculty,
      });
    }

    // ── 2. FACULTY REGISTRATION ────────────────────────────────────────────────
    const { name, designation, department, phone, block, floor, roomNo, role } = body;

    // Field presence validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }
    if (!department || !department.trim()) {
      return res.status(400).json({ success: false, error: 'Department is required.' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }
    if (!password || password.trim().length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const locError = validateSittingLocation(block, floor, roomNo);
    if (locError) {
      return res.status(400).json({ success: false, error: locError });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await Faculty.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists. Please sign in instead.',
      });
    }

    // Secure password hashing
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const faculty = await Faculty.create({
      name: name.trim(),
      designation: designation ? designation.trim() : 'Faculty Member',
      department: department.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      password: hashedPassword,
      role: role === 'admin' ? 'admin' : 'faculty',
      sittingLocation: {
        block: block.trim().toUpperCase(),
        floor: Number(floor),
        roomNo: roomNo.trim(),
      },
    });

    const token = generateToken(faculty);
    const safeFaculty = formatFaculty(faculty);

    return res.status(201).json({
      success: true,
      message: 'Faculty account & sitting location registered successfully!',
      token,
      faculty: safeFaculty,
    });
  } catch (err) {
    console.error('[facultyController.handleFacultyAuth]', err.message);
    return res.status(500).json({
      success: false,
      error: `Server error: ${err.message}`,
    });
  }
};

/**
 * PUT /api/faculty/:id
 * Protected: Requires authentication.
 * A faculty member can modify ONLY their own profile, unless role is admin.
 */
const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid faculty ID format' });
    }

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      return res.status(404).json({ success: false, error: 'Faculty member not found' });
    }

    // Authorization check: Self or Admin
    const isSelf = req.user && req.user.id.toString() === faculty._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are only authorized to modify your own profile.',
      });
    }

    const updates = { ...req.body };
    delete updates._id;

    // If updating password, hash it securely
    if (updates.password) {
      if (updates.password.trim().length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      }
      updates.password = await bcrypt.hash(updates.password.trim(), 10);
    }

    // Sitting location validation if provided
    if (updates.sittingLocation || updates.block || updates.floor !== undefined || updates.roomNo) {
      const b = updates.sittingLocation?.block || updates.block || faculty.sittingLocation.block;
      const f = updates.sittingLocation?.floor !== undefined ? updates.sittingLocation.floor : updates.floor !== undefined ? updates.floor : faculty.sittingLocation.floor;
      const r = updates.sittingLocation?.roomNo || updates.roomNo || faculty.sittingLocation.roomNo;

      const locError = validateSittingLocation(b, f, r);
      if (locError) {
        return res.status(400).json({ success: false, error: locError });
      }

      updates.sittingLocation = {
        block: b.trim().toUpperCase(),
        floor: Number(f),
        roomNo: r.trim(),
      };
      delete updates.block;
      delete updates.floor;
      delete updates.roomNo;
    }

    // Only admin can change role
    if (updates.role && !isAdmin) {
      delete updates.role;
    }

    const updated = await Faculty.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .select('-password -__v')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Faculty profile updated successfully!',
      faculty: updated,
    });
  } catch (err) {
    console.error('[facultyController.updateFaculty]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /api/faculty/:id
 * Protected: Requires authentication.
 * A faculty member can delete ONLY their own profile, unless role is admin.
 */
const deleteFaculty = async (req, res) => {
  try {
    const id = req.params.id || req.query.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Faculty ID is required for deletion.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid faculty ID format' });
    }

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        error: 'Faculty record not found.',
      });
    }

    // Authorization check: Self or Admin
    const isSelf = req.user && req.user.id.toString() === faculty._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are only authorized to delete your own profile.',
      });
    }

    const result = await Faculty.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: 'Faculty profile deleted successfully!',
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error('[facultyController.deleteFaculty]', err.message);
    return res.status(500).json({
      success: false,
      error: `Error deleting faculty: ${err.message}`,
    });
  }
};

module.exports = {
  getFaculties,
  getFacultyById,
  handleFacultyAuth,
  updateFaculty,
  deleteFaculty,
};
