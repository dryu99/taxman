import { MessageEmbed } from 'discord.js';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import theme from '../../bot/theme';
import { Task, TaskStatus } from '../../models/TaskModel';
import taskService from '../../services/task-service';
import { formatMention } from '../../bot/utils';
import ScheduleCommand from './schedule';

enum ListCommandArgs {
  OPTION = 'option',
}

// TODO order of tasks should be newest -> oldest
// TODO prob just support 'all' flag (no past)
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
          prompt: `
            \`all\` -> view all tasks
            \`past\` -> view all past tasks
          `,
          type: 'string',
          oneOf: ['all', 'past'],
          default: 'upcoming', // TODO wtf delete
        },
      ],
    });
  }

  // TODO handle input validation
  async run(msg: CommandoMessage, args: Record<ListCommandArgs, string>) {
    const { option } = args;

    // Fetch user tasks
    const tasks = await taskService.getUserTasks(
      msg.author.id,
      option === 'upcoming' ? TaskStatus.PENDING : undefined,
    );

    // Create embed
    // TODO improve typing lmao
    const title =
      option === 'all'
        ? 'Viewing All Tasks'
        : option === 'past'
        ? 'Viewing Past Tasks'
        : 'Viewing Upcoming Tasks';

    const embed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle(title); // TODO should change based on flag (e.g. All vs Completed vs Upcoming)

    // TODO find better date format (and apply elsewhere make utils fn or sth)
    // TODO only show DUE @ text for upcoming tasks (ow just use 'Due Date:' text)
    if (tasks.length > 0) {
      const fields = tasks.map((task, i) => ({
        name: `\`${i + 1}.\`  ${task.description}`,
        value: `
          **DUE @ ${task.dueAt.toLocaleString()}**
          ID: \`${task.id}\`
          Money at stake: $${task.stakes}
          Accountability Partner: ${formatMention(task.userDiscordID)}
        `,
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
