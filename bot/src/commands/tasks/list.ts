import { MessageEmbed } from 'discord.js';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import theme from '../../bot/theme';
import { formatDate, formatMention } from '../../bot/utils';
import { stripIndent } from 'common-tags';
import taskEventService from '../../services/task-event-service';
import { TaskEventStatus } from '../../models/TaskEventModel';
import NewCommand from './new';

enum ListCommandArgs {
  OPTION = 'option',
}

class ListCommand extends Command {
  static DEFAULT_CMD_NAME = 'list';

  constructor(client: CommandoClient) {
    super(client, {
      name: ListCommand.DEFAULT_CMD_NAME,
      aliases: [ListCommand.DEFAULT_CMD_NAME],
      group: 'tasks',
      memberName: ListCommand.DEFAULT_CMD_NAME,
      description: 'View your upcoming tasks.', // TODO allow users to pass in 'complete'/'pending' args to filter list
      args: [
        {
          key: ListCommandArgs.OPTION,
          prompt: stripIndent`
            no args -> view upcoming tasks
            \`all\` -> view all tasks
          `,
          type: 'string',
          // oneOf: ['all', 'upcoming'],
          default: 'upcoming', // TODO wtf delete
        },
      ],
    });
  }

  // TODO handle input validation
  // TODO embed should only display 3-5 tasks, if they want to see more they should use reacts to nav to next embed
  async run(msg: CommandoMessage, args: Record<ListCommandArgs, string>) {
    const { option } = args;

    // TODO consider try catching this
    //      will the bot error handler catch this? you should check
    // Fetch user tasks
    const taskEvents = await taskEventService.getAllByUserID(
      msg.author.id,
      // TODO do sth like this once you get around to supporting more list options
      // option === 'upcoming' ? TaskEventStatus.PENDING : undefined,
      TaskEventStatus.PENDING,
    );

    // Create embed
    // TODO improve typing lmao
    const title = option === 'all' ? 'All Tasks' : 'Upcoming Tasks';

    const embed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle(title);

    if (taskEvents.length > 0) {
      const fields = taskEvents.map((event, i) => ({
        name: `\`${i + 1}.\`  ${event.schedule.description}`,
        value: stripIndent`
          ${
            option === 'all'
              ? `Due Date: ${formatDate(event.dueAt)}`
              : `**DUE @ ${formatDate(event.dueAt)}**`
          }
          ID: \`${event.id}\`\
          ${
            option === 'all' ? `\nStatus: ${event.status}` : ''
          }                    
          Accountability Partner: ${formatMention(
            event.schedule.partnerUserDiscordID,
          )}
        `,

        // TODO add this to value field once stripe integration is done: Money at stake: $${task.stakes}
      }));

      embed.addFields(fields);
    } else {
      embed.setDescription(
        `You have no upcoming tasks! Use the \`$${NewCommand.DEFAULT_CMD_NAME}\` command to schedule a new task`,
      );
    }

    return msg.reply(embed);
  }
}

export default ListCommand;
