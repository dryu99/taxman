import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import Bot from '../../bot/Bot';
import { TaskStatus } from '../../models/TaskModel';
import settingsService from '../../services/settings-service';
import taskService from '../../services/task-service';
import ListCommand from './list';

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
      const settings = await settingsService.getByGuildID(msg.guild.id);

      if (!task)
        return msg.reply(
          `The task ID you gave doesn't exist! You can find the exact ID with the \`$${ListCommand.DEFAULT_CMD_NAME}\` command`,
        );

      if (!settings)
        return msg.reply(
          `Your server doesn't have settings for ${Bot.NAME}... Please contact admin.`, // TODO or please support server or sth
        );

      // Check grace period
      const hasGracePeriodEnded =
        Date.now() >=
        task.dueDate.getTime() - settings.penaltyPeriodMinutes * 60 * 1000; // TODO will timezones affect this...
      if (hasGracePeriodEnded) return msg.reply("Bitch it's too late."); // TODO change text lol

      // Update task status
      await taskService.update(taskID, { status: TaskStatus.CANCELLED });

      // TODO should prompt user to confirm action
      // TODO only allow user to call this command if they're still in grace period
      // TODO should only be able to cancel PENDING tasks (anything else is nono)
      return msg.reply(
        'Task cancelled successfully! You will not be prompted for a check-in.',
      );
    } catch (e) {
      console.error(e);
      return msg.reply(`Internal bot error, please contact admin.`);
    }
  }
}

export default CancelCommand;
