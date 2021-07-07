import { Command, CommandoClient, CommandMessage } from 'discord.js-commando';
module.exports = class PlanCommand extends Command {
  constructor(client: CommandoClient) {
    super(client, {
      name: 'plan',
      aliases: ['plan'],
      group: 'bot',
      memberName: 'plan',
      description: 'Create a new event.',
    });
  }

  async run(msg: CommandMessage) {
    return msg.say('Planning hmmm...');
  }
};
