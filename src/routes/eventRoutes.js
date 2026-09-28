const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

// GET /api/events - Retrieve active non-expired campus events
router.get('/', async (req, res) => {
  try {
    const { includeExpired, facultyEmail, type } = req.query;
    const todayStr = new Date().toISOString().split('T')[0];

    const query = {};
    if (facultyEmail) {
      query['hostedBy.email'] = facultyEmail.trim().toLowerCase();
    } else if (includeExpired !== 'true') {
      query.endDate = { $gte: todayStr };
    }

    if (type && type !== 'all') {
      query.type = new RegExp(`^${type}$`, 'i');
    }

    const events = await Event.find(query).sort({ startDate: 1 });
    return res.status(200).json({ success: true, count: events.length, data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/events - Host a new campus event
router.post('/', async (req, res) => {
  try {
    const {
      title,
      type,
      organizingDept,
      startDate,
      endDate,
      entryFee,
      locationType,
      locationDetails,
      description,
      hostedBy,
    } = req.body;

    if (!title || !type || !organizingDept || !startDate || !endDate || !locationDetails || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required event fields (Title, Type, Dept, Dates, Location, Description).',
      });
    }

    const event = new Event({
      title: title.trim(),
      type: type.trim(),
      organizingDept: organizingDept.trim(),
      startDate,
      endDate,
      entryFee: entryFee ? entryFee.trim() : 'Free',
      locationType: locationType || 'indoor',
      locationDetails: locationDetails.trim(),
      description: description.trim(),
      hostedBy: {
        name: hostedBy?.name || 'Faculty Member',
        department: hostedBy?.department || organizingDept,
        email: hostedBy?.email ? hostedBy.email.trim().toLowerCase() : '',
      },
    });

    await event.save();

    return res.status(201).json({
      success: true,
      message: 'Event successfully hosted and published!',
      eventId: event._id,
      event,
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/events/:id or ?id=... - Delete event by ID
router.delete('/:id?', async (req, res) => {
  try {
    const id = req.params.id || req.query.id;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Event ID is required' });
    }

    const result = await Event.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully!',
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
