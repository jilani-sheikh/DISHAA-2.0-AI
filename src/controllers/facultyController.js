const mongoose = require('mongoose');
const Faculty = require('../models/Faculty');

/**
 * Format faculty document for safe client consumption
 */
const formatFaculty = (doc) => {
  if (!doc) return null;
  const { password, __v, ...rest } = doc.toObject ? doc.toObject() : doc;
  return rest;
};

/**
 * GET /api/faculty
 * Retrieve faculties with optional filters (block, floor, roomNo, department, q)
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
      return res.status(400).json({ success: false, error: 'Invalid faculty ID' });
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
 * Handles both Faculty Login and Faculty Registration
 */
const handleFacultyAuth = async (req, res) => {
  try {
    const body = req.body || {};
    const { action = 'register', email, password } = body;

    // 1. LOGIN
    if (action === 'login') {
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required for login.',
        });
      }

      const faculty = await Faculty.findOne({
        email: email.trim().toLowerCase(),
      });

      if (!faculty) {
        return res.status(401).json({
          success: false,
          error: 'Invalid Email or Password. Please check your credentials.',
        });
      }

      // Verify password (plain comparison or match)
      if (faculty.password !== password.trim()) {
        return res.status(401).json({
          success: false,
          error: 'Invalid Email or Password. Please check your credentials.',
        });
      }

      const safeFaculty = formatFaculty(faculty);
      return res.status(200).json({
        success: true,
        message: 'Faculty login successful!',
        faculty: safeFaculty,
      });
    }

    // 2. REGISTRATION
    const { name, designation, department, phone, block, floor, roomNo, role } = body;

    if (!name || !department || !email || !password || !block || floor === undefined || !roomNo) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields (Name, Department, Email, Password, Block, Floor, Room No).',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const facultyDoc = {
      name: name.trim(),
      designation: designation ? designation.trim() : 'Faculty Member',
      department: department.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      password: password.trim(),
      role: role === 'admin' ? 'admin' : 'faculty',
      sittingLocation: {
        block: block.trim(),
        floor: Number(floor),
        roomNo: roomNo.trim(),
      },
    };

    const updated = await Faculty.findOneAndUpdate(
      { email: cleanEmail },
      { $set: facultyDoc },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const safeFaculty = formatFaculty(updated);

    return res.status(200).json({
      success: true,
      message: 'Faculty account & sitting location registered successfully!',
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
 * Update faculty details
 */
const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid faculty ID' });
    }

    const updates = { ...req.body };
    delete updates.password; // Do not update password via this route
    delete updates._id;

    if (updates.sittingLocation) {
      if (updates.sittingLocation.floor !== undefined) {
        updates.sittingLocation.floor = Number(updates.sittingLocation.floor);
      }
    }

    const updated = await Faculty.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .select('-password -__v')
      .lean();

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Faculty member not found' });
    }

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
 * DELETE /api/faculty/:id?
 * Delete a faculty entry by URL param, query id, or query email
 */
const deleteFaculty = async (req, res) => {
  try {
    const id = req.params.id || req.query.id;
    const email = req.query.email;

    if (!id && !email) {
      return res.status(400).json({
        success: false,
        error: 'Faculty ID or Email is required for deletion.',
      });
    }

    let query = {};
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: 'Invalid faculty ID format' });
      }
      query = { _id: id };
    } else if (email) {
      query = { email: email.trim().toLowerCase() };
    }

    const result = await Faculty.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Faculty record not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Faculty record deleted successfully!',
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
