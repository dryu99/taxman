import { MessageEmbed } from 'discord.js';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import theme from '../../bot/theme';
import { Task, TaskStatus } from '../../models/TaskModel';
import taskService from '../../services/task-service';
import {
  createTaskEmbed,
  formatMention,
  getReaction,
  hasGracePeriodEnded,
} from '../../bot/utils';
import ScheduleCommand from './schedule';
import settingsService from '../../services/settings-service';
import {
  INTERNAL_ERROR,
  INVALID_TASK_ID_ERROR,
  MISSING_SETTINGS_ERROR,
  TimeoutError,
} from '../../bot/errors';
import ListCommand from './list';

enum EditCommandArgs {
  TASK_ID = 'taskID',
}

// TODO should only be able to edit upcoming tasks
class EditCommand extends Command {
  static DEFAULT_CMD_NAME = 'edit';

  constructor(client: CommandoClient) {
    super(client, {
      name: EditCommand.DEFAULT_CMD_NAME,
      aliases: [EditCommand.DEFAULT_CMD_NAME],
      group: 'tasks',
      memberName: EditCommand.DEFAULT_CMD_NAME,
      description: 'Edit your upcoming tasks.',
      args: [
        {
          key: EditCommandArgs.TASK_ID,
          prompt: 'Please provide a valid task ID.', // TODO use same one as cancel command
          type: 'string',
        },
      ],
    });
  }

  // TODO handle input validation
  async run(msg: CommandoMessage, args: Record<EditCommandArgs, string>) {
    const { taskID } = args;

    try {
      const task = await taskService.getByID(taskID);
      const settings = await settingsService.getByGuildID(msg.guild.id);

      if (!task) return msg.reply(INVALID_TASK_ID_ERROR);
      if (!settings) return msg.reply(MISSING_SETTINGS_ERROR);

      if (task.authorID !== msg.author.id)
        return msg.reply("You can't edit other people's tasks!"); // TODO will timezones affect this...

      // TODO check if task is pending or not
      if (task.status !== TaskStatus.PENDING)
        return msg.reply(
          `You can only edit pending tasks! Use the \`$${ListCommand.DEFAULT_CMD_NAME}\` command to see them.`,
        ); // TODO pending or upcoming?

      if (hasGracePeriodEnded(task, settings))
        return msg.reply("Bitch it's too late."); // TODO change text lol

      const embed = createTaskEmbed(task, 'Edit Task');
      const sentMsg = await msg.reply(embed);

      const reaction = await getReaction(
        sentMsg,
        ['⏰', '✏️', '✅', '❌'],
        task.authorID,
        5 * 60 * 1000,
      );

      return msg.reply(`hehe ${reaction.emoji.name}`);
    } catch (e) {
      if (e instanceof TimeoutError) return msg.reply(e.message);
      return msg.reply(INTERNAL_ERROR);
    }
  }
}

export default EditCommand;
