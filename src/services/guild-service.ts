import GuildModel, { Guild } from '../models/GuildModel';

// TODO if user kicks bot, what happens to settings in db?
//      we should prob delete.

const init = async (discordID: string): Promise<Guild> => {
  // replace old guild if it exists
  // TODO do we need to do this since we specified discord ID as unique? maybe we just do try catch
  const oldGuild = await GuildModel.findOne({ discordID });
  if (oldGuild) {
    await oldGuild.remove();
  }

  const guild = new GuildModel({ discordID });
  const savedGuild = await guild.save();
  return savedGuild;
};

// TODO implement
const remove = async () => {};

const getByDiscordID = async (
  discordID: string,
): Promise<Guild | undefined> => {
  try {
    const guild = await GuildModel.findOne({ discordID });
    return guild || undefined;
  } catch (e) {
    return undefined;
  }
};

const guildService = {
  init,
  getByDiscordID,
};

export default guildService;
