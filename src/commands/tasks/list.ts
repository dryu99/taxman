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
          default: 'upcoming',
        },
      ],
    });
  }

  // TODO handle input validation
  async run(msg: CommandoMessage, args: Record<ListCommandArgs, string>) {
    const { option } = args;

    // Fetch author tasks
    const taskFilter: Partial<Task> = {};
    if (option !== 'all') {
      taskFilter.status =
        option === 'past' ? TaskStatus.COMPLETED : TaskStatus.PENDING;
      // TODO this isn't correct, as FAILED + CANCELLED tasks are also in the past.
      //      have to do more complex filter
    }
    const tasks = await taskService.getAuthorTasks(msg.author.id, taskFilter);

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
        name: `\`${i + 1}.\`  ${task.name}`,
        value: `
          **DUE @ ${task.dueDate.toLocaleString()}**
          ID: \`${task.id}\`
          Money at stake: $${task.cost}
          Accountability Partner: ${formatMention(task.partnerID)}
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
