import mongoose from 'mongoose';
import { toMilliseconds } from '../bot/utils';
import { MongoModel } from '../types';

export interface GuildSettings extends MongoModel {
  guildID: string;
  gracePeriodEndOffset: number; // millisecs before task due dates where users can't cancel/edit tasks
  reactionTimeoutLength: number; // millisecs
  // max_cancels_per_user
}

const DEFAULT_GRACE_PERIOD_END_OFFSET = toMilliseconds(12, 'hours');
const DEFAULT_REACTION_TIMEOUT_LENGTH = toMilliseconds(5, 'minutes');

// used when settings can't be fetched
export const DEFAULT_SETTINGS: GuildSettings = {
  id: 'default_settings_id',
  createdAt: new Date(),
  updatedAt: new Date(),
  guildID: 'default_settings_guild_id',
  gracePeriodEndOffset: DEFAULT_GRACE_PERIOD_END_OFFSET,
  reactionTimeoutLength: DEFAULT_REACTION_TIMEOUT_LENGTH,
};

const settingsSchema = new mongoose.Schema<GuildSettings>(
  {
    guildID: {
      type: String,
      required: true,
      unique: true,
    },
    gracePeriodEndOffset: {
      type: Number,
      required: true,
      default: DEFAULT_GRACE_PERIOD_END_OFFSET,
    },
    reactionTimeoutLength: {
      type: Number,
      required: true,
      default: DEFAULT_REACTION_TIMEOUT_LENGTH,
    },
  },
  { timestamps: true },
);

const SettingsModel = mongoose.model<GuildSettings>('Settings', settingsSchema);

export default SettingsModel;
