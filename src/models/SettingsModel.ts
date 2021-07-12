import mongoose from 'mongoose';
mongoose.set('useFindAndModify', false);

export interface Settings {
  id: string; // TODO maybe id should be guild id
  guildID: string;
  gracePeriodMinutes: number;
  reactionTimeoutMinutes: number;
  // TODO guildName?
}

const settingsSchema = new mongoose.Schema<Settings>(
  {
    guildID: {
      type: String,
      required: true,
    },
    gracePeriodMinutes: {
      type: Number,
      required: true,
      default: 12 * 60, // 12 hours
    },
    reactionTimeoutMinutes: {
      type: Number,
      required: true,
      default: 5,
    },
  },
  { timestamps: true },
);

settingsSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const SettingsModel = mongoose.model<Settings>('Settings', settingsSchema);

export default SettingsModel;
