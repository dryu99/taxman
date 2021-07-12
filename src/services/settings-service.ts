import SettingsModel from '../models/SettingsModel';

// TODO if user kicks bot, what happens to settings in db?
//      we should prob delete.

const init = async (guildID: string) => {
  const settings = new SettingsModel({
    guildID,
  });

  // TODO how to detect duplicate IDs? (without finding first)
  const savedSettings = await settings.save();
  return savedSettings.toJSON();
};

// TODO implement
const remove = async () => {};

const settingsService = {
  init,
};

export default settingsService;
