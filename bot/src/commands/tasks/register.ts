import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { OAUTH2_URL } from '../../bot/constants';

class RegisterCommand extends Command {
  static DEFAULT_CMD_NAME = 'register';

  constructor(client: CommandoClient) {
    super(client, {
      name: RegisterCommand.DEFAULT_CMD_NAME,
      aliases: [RegisterCommand.DEFAULT_CMD_NAME],
      group: 'tasks',
      memberName: RegisterCommand.DEFAULT_CMD_NAME,
      description: 'Register your payment method.',
    });
  }

  async run(msg: CommandoMessage) {
    // TODO url should look sth like sesh's
    return msg.reply(`Click here to enter your payment method: ${OAUTH2_URL}`);
  }
}

export default RegisterCommand;
