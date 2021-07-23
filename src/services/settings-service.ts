import SettingsModel, { GuildSettings } from '../models/SettingsModel';

// TODO if user kicks bot, what happens to settings in db?
//      we should prob delete.

const init = async (guildID: string): Promise<GuildSettings> => {
  // replace old settings if it exists
  const oldSettings = await SettingsModel.findOne({ guildID });
  if (oldSettings) {
    await oldSettings.remove();
  }

  const settings = new SettingsModel({ guildID });
  const savedSettings = await settings.save();
  return savedSettings;
};

// TODO implement
const remove = async () => {};

const getByGuildID = async (
  guildID: string,
): Promise<GuildSettings | undefined> => {
  try {
    const settings = await SettingsModel.findOne({ guildID });
    return settings || undefined;
  } catch (e) {
    return undefined;
  }
};

const settingsService = {
  init,
  getByGuildID,
};

export default settingsService;
