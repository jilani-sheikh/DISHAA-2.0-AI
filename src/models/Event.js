const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Event type is required'],
      enum: ['Technical', 'Non-Technical', 'Sports', 'Cultural', 'Workshop', 'Seminar', 'Other'],
      default: 'Technical',
    },
    organizingDept: {
      type: String,
      required: [true, 'Organizing department is required'],
      trim: true,
    },
    startDate: {
      type: String,
      required: [true, 'Start date is required (YYYY-MM-DD)'],
    },
    endDate: {
      type: String,
      required: [true, 'End date is required (YYYY-MM-DD)'],
    },
    entryFee: {
      type: String,
      default: 'Free',
      trim: true,
    },
    locationType: {
      type: String,
      enum: ['indoor', 'outdoor'],
      default: 'indoor',
    },
    locationDetails: {
      type: String,
      required: [true, 'Location details are required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
    },
    hostedBy: {
      name: { type: String, default: 'Faculty Member' },
      department: { type: String, default: '' },
      email: { type: String, lowercase: true, trim: true, default: '' },
    },
  },
  {
    collection: 'events',
    timestamps: true,
  }
);

EventSchema.index({ startDate: 1 });
EventSchema.index({ 'hostedBy.email': 1 });

const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);

module.exports = Event;
