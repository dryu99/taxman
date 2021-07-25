import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import Bot from '../../bot/Bot';
import { TaskStatus } from '../../models/TaskModel';
import guildService from '../../services/guild-service';
import taskService from '../../services/task-service';
import ListCommand from './list';
import {
  INTERNAL_ERROR,
  INVALID_TASK_ID_ERROR,
  MISSING_SETTINGS_ERROR,
} from '../../bot/errors';
import { hasGracePeriodEnded } from '../../bot/utils';
import logger from '../../lib/logger';

enum CancelCommandArgs {
  TASK_ID = 'taskID',
}

class CancelCommand extends Command {
  static DEFAULT_CMD_NAME = 'cancel';

  constructor(client: CommandoClient) {
    super(client, {
      name: CancelCommand.DEFAULT_CMD_NAME,
      aliases: [CancelCommand.DEFAULT_CMD_NAME],
      group: 'tasks',
      memberName: CancelCommand.DEFAULT_CMD_NAME,
      description: 'Cancel an upcoming task.',
      args: [
        {
          key: CancelCommandArgs.TASK_ID,
          prompt: `Please provide the ID of the task you wish to cancel. You can find the ID by calling the \`${ListCommand.DEFAULT_CMD_NAME}\` command`,
          type: 'string',
        },
      ],
    });
  }

  // TODO handle input validation
  async run(msg: CommandoMessage, args: Record<CancelCommandArgs, string>) {
    const { taskID } = args;

    try {
      // TODO can fetch both at same time
      const task = await taskService.getByID(taskID);
      const guild = await guildService.getByDiscordID(msg.guild.id);

      if (!task) return msg.reply(INVALID_TASK_ID_ERROR);
      if (!guild) return msg.reply(MISSING_SETTINGS_ERROR);

      if (task.userDiscordID !== msg.author.id)
        return msg.reply(`You can't cancel other people's tasks!`);

      if (task.status !== TaskStatus.PENDING)
        return msg.reply(
          `You can only cancel pending tasks! Use the \`$${ListCommand.DEFAULT_CMD_NAME}\` command to see them.`,
        );

      // Check grace period
      if (hasGracePeriodEnded(task, guild.settings.gracePeriodEndOffset))
        return msg.reply("Bitch it's too late."); // TODO change text lol

      // Update task status
      await taskService.update(taskID, { status: TaskStatus.CANCELLED });

      // TODO should prompt user to confirm action
      // TODO only allow user to call this command if they're still in grace period
      // TODO should only be able to cancel PENDING tasks (anything else is nono)
      return msg.reply(
        'Task cancelled successfully! You will not be prompted for a check-in.',
      );
    } catch (e) {
      logger.error(e);
      return msg.reply(INTERNAL_ERROR);
    }
  }
}

export default CancelCommand;