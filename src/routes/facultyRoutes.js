const express = require('express');
const router = express.Router();
const {
  getFaculties,
  getFacultyById,
  handleFacultyAuth,
  updateFaculty,
  deleteFaculty,
} = require('../controllers/facultyController');

const { requireAuth } = require('../middleware/auth');

// GET /api/faculty - list faculties or filter by block, floor, roomNo, department, q
router.get('/', getFaculties);

// POST /api/faculty - login or registration
router.post('/', handleFacultyAuth);

// GET /api/faculty/:id - get single faculty
router.get('/:id', getFacultyById);

// PUT /api/faculty/:id - update faculty profile (Protected: Self or Admin)
router.put('/:id', requireAuth, updateFaculty);

// DELETE /api/faculty/:id - delete faculty (Protected: Self or Admin)
router.delete('/:id', requireAuth, deleteFaculty);

module.exports = router;
