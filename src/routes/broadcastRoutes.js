const express = require('express');
const router = express.Router();
const Broadcast = require('../models/Broadcast');

// GET /api/broadcasts - Retrieve active campus emergency broadcasts
router.get('/', async (req, res) => {
  try {
    const broadcasts = await Broadcast.find({ active: { $ne: false } }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: broadcasts.length, data: broadcasts });
  } catch (error) {
    console.error('Error fetching broadcasts:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/broadcasts - Publish a new Emergency Broadcast Alert
router.post('/', async (req, res) => {
  try {
    const { title, message, severity = 'warning', createdBy = 'System Admin' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Broadcast Title and Message are required.' });
    }

    const broadcast = new Broadcast({
      title: title.trim(),
      message: message.trim(),
      severity,
      active: true,
      createdBy,
    });

    await broadcast.save();

    return res.status(201).json({
      success: true,
      message: 'Emergency Broadcast published live to campus users!',
      broadcastId: broadcast._id,
      broadcast,
    });
  } catch (error) {
    console.error('Error publishing broadcast:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/broadcasts/:id or ?id=... - Dismiss or remove a broadcast alert
router.delete('/:id?', async (req, res) => {
  try {
    const id = req.params.id || req.query.id;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Broadcast ID is required for deletion.' });
    }

    const result = await Broadcast.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Broadcast alert not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Broadcast alert removed successfully.',
    });
  } catch (error) {
    console.error('Error deleting broadcast:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
