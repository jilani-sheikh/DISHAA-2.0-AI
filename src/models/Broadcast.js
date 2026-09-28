const mongoose = require('mongoose');

const BroadcastSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Broadcast title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Broadcast message is required'],
      trim: true,
    },
    severity: {
      type: String,
      enum: ['emergency', 'warning', 'announcement', 'info'],
      default: 'warning',
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      default: 'System Admin',
      trim: true,
    },
  },
  {
    collection: 'broadcasts',
    timestamps: true,
  }
);

BroadcastSchema.index({ active: 1, createdAt: -1 });

const Broadcast = mongoose.models.Broadcast || mongoose.model('Broadcast', BroadcastSchema);

module.exports = Broadcast;
