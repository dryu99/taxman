import mongoose from 'mongoose';
import { MongoModel } from '../types';

export interface Settings extends MongoModel {
  guildID: string;
  gracePeriodEndOffset: number; // millisecs before task due dates where users can't cancel/edit tasks
  reactionTimeoutLength: number; // millisecs
  // max_cancels_per_user
}

const settingsSchema = new mongoose.Schema<Settings>(
  {
    guildID: {
      type: String,
      required: true,
      unique: true,
    },
    gracePeriodEndOffset: {
      type: Number,
      required: true,
      default: 12 * 60 * 60 * 1000, // 12 hours
    },
    reactionTimeoutLength: {
      type: Number,
      required: true,
      default: 5 * 60 * 1000, // 5 min
    },
  },
  { timestamps: true },
);

const SettingsModel = mongoose.model<Settings>('Settings', settingsSchema);

export default SettingsModel;
