import { Schema, model } from 'mongoose';

const activitySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  type: { type: String, required: true, trim: true, maxlength: 80 },
  minutes: { type: Number, required: true, min: 1, max: 1440 },
  points: { type: Number, required: true, min: 0 },
  occurredAt: { type: Date, required: true },
});

activitySchema.index({ team: 1 });
activitySchema.index({ user: 1, occurredAt: -1 });

export const Activity = model('Activity', activitySchema);
