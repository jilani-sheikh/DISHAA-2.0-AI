const express = require('express');
const router = express.Router();
const {
  getFaculties,
  getFacultyById,
  handleFacultyAuth,
  updateFaculty,
  deleteFaculty,
} = require('../controllers/facultyController');

// GET /api/faculty - list faculties or filter by block, floor, roomNo, department, q
router.get('/', getFaculties);

// POST /api/faculty - login or registration
router.post('/', handleFacultyAuth);

// DELETE /api/faculty - delete faculty by query id or email
router.delete('/', deleteFaculty);

// GET /api/faculty/:id - get single faculty
router.get('/:id', getFacultyById);

// PUT /api/faculty/:id - update faculty profile
router.put('/:id', updateFaculty);

// DELETE /api/faculty/:id - delete faculty by param
router.delete('/:id', deleteFaculty);

module.exports = router;
