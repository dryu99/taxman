import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { MISSING_SETTINGS_ERROR } from '../../bot/errors';
import TaskWriteMessenger from '../../bot/messengers/TaskAddMessenger';
import logger from '../../lib/logger';
import guildService from '../../services/guild-service';

class NewCommand extends Command {
  static DEFAULT_CMD_NAME = 'new';

  constructor(client: CommandoClient) {
    super(client, {
      name: NewCommand.DEFAULT_CMD_NAME,
      aliases: [NewCommand.DEFAULT_CMD_NAME],
      group: 'tasks',
      memberName: NewCommand.DEFAULT_CMD_NAME,
      description: 'Schedule a new task.',
    });
  }

  async run(msg: CommandoMessage) {
    const channel = await this.client.channels.fetch(msg.channel.id);
    if (!channel.isText()) return msg.reply('oops');

    // TODO add users/members like in schedule command

    // TODO if we embed guild data we wont' have to do this hmmm
    const guild = await guildService.getByDiscordID(msg.guild.id); // TODO isn't it piossible for guild not to exist (if this command is run in DM)
    if (!guild) return msg.reply(MISSING_SETTINGS_ERROR); // TODO should this error prevent task from being created?
    // TODO sentry

    const taskAddMessenger = new TaskWriteMessenger(
      channel,
      msg.author.id,
      guild,
      true,
    );
    try {
      await taskAddMessenger.start();
      await channel.send('finished!');
    } catch (e) {
      // TODO sentry
      logger.error(e);
      await channel.send('something weird happened.........'); // TODO change msg lol
    }

    return null;
  }
}

export default NewCommand;
