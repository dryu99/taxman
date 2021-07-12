import SettingsModel, { Settings } from '../models/SettingsModel';

// TODO if user kicks bot, what happens to settings in db?
//      we should prob delete.

// TODO check to see if settings already exists, if it does replace
const init = async (guildID: string): Promise<Settings> => {
  const settings = new SettingsModel({
    guildID,
  });

  // TODO how to detect duplicate IDs? (without finding first)
  const savedSettings = await settings.save();
  return savedSettings.toJSON();
};

// TODO implement
const remove = async () => {};

const getByGuildID = async (guildID: string): Promise<Settings | undefined> => {
  const settings = await SettingsModel.findOne({ guildID });
  return settings?.toJSON();
};

const settingsService = {
  init,
  getByGuildID,
};

export default settingsService;
