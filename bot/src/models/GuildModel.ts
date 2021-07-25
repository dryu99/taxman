import mongoose from 'mongoose';
import { toMilliseconds } from '../bot/utils';
import { MongoModel } from '../types';

export interface Guild extends MongoModel {
  discordID: string;
  settings: {
    gracePeriodEndOffset: number; // millisecs before task due dates where users can't cancel/edit tasks
    reactionTimeoutLength: number; // millisecs
  };
  // max_cancels_per_user
}

const DEFAULT_GRACE_PERIOD_END_OFFSET = toMilliseconds(12, 'hours');
const DEFAULT_REACTION_TIMEOUT_LENGTH = toMilliseconds(5, 'minutes');

// used when guild can't be fetched
export const DEFAULT_GUILD: Guild = {
  id: 'default_mongo_id',
  createdAt: new Date(),
  updatedAt: new Date(),
  settings: {
    gracePeriodEndOffset: DEFAULT_GRACE_PERIOD_END_OFFSET,
    reactionTimeoutLength: DEFAULT_REACTION_TIMEOUT_LENGTH,
  },
  discordID: 'default_settings_guild_id',
};

const guildSchema = new mongoose.Schema<Guild>(
  {
    discordID: {
      type: String,
      required: true,
      unique: true,
    },
    settings: {
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
  },
  { timestamps: true },
);

const GuildModel = mongoose.model<Guild>('Guild', guildSchema);

export default GuildModel;
