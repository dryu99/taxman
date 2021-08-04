import { MessageEmbed } from 'discord.js';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import theme from '../../bot/theme';
import { Task, TaskStatus } from '../../models/TaskModel';
import taskService from '../../services/task-service';
import { formatDate, formatMention } from '../../bot/utils';
import ScheduleCommand from './schedule';
import { stripIndent } from 'common-tags';

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
          oneOf: ['all', 'upcoming'],
          default: 'upcoming', // TODO wtf delete
        },
      ],
    });
  }

  // TODO handle input validation
  // TODO embed should only display 3-5 tasks, if they want to see more they should use reacts to nav to next embed
  async run(msg: CommandoMessage, args: Record<ListCommandArgs, string>) {
    const { option } = args;

    // Fetch user tasks
    const tasks = await taskService.getUserTasks(
      msg.author.id,
      option === 'upcoming' ? TaskStatus.PENDING : undefined,
    );

    // Create embed
    // TODO improve typing lmao
    const title = option === 'all' ? 'All Tasks' : 'Upcoming Tasks';

    const embed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle(title);

    if (tasks.length > 0) {
      const fields = tasks.map((task, i) => ({
        name: `\`${i + 1}.\`  ${task.description}`,
        value: stripIndent`
          ${
            option === 'all'
              ? `Due Date: ${formatDate(task.dueAt)}`
              : `**DUE @ ${formatDate(task.dueAt)}**`
          }
          ID: \`${task.id}\`\
          ${
            option === 'all' ? `\nStatus: ${task.status}` : ''
          }                    
          Accountability Partner: ${formatMention(task.userDiscordID)}
        `,

        // TODO add this to value field once stripe integration is done: Money at stake: $${task.stakes}
      }));

      embed.addFields(fields);
    } else {
      embed.setDescription(
        `You have no upcoming tasks! Use the \`$${ScheduleCommand.DEFAULT_CMD_NAME}\` command to schedule a new task`,
      );
    }

    return msg.reply(embed);
  }
}

export default ListCommand;
