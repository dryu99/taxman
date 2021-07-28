import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import TaskAddMessenger from '../../bot/messengers/TaskAddMessenger';

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

    // TODO do this lol
    const taskAddMessenger = new TaskAddMessenger(channel, msg);
    try {
      await taskAddMessenger.prompt();
      await channel.send('finished!');
    } catch (e) {
      await channel.send('something weird happened.........');
    }

    return null;
  }
}

export default NewCommand;
