import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { TaskStatus } from '../../models/TaskModel';
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

    // try {
    //   const task = await taskService.getOne(taskID);

    //   // fetch settings

    //   // if current time is in penalty period
    //   // if (Date.now() >= task.dueDate - settings.gracePeriodMinutes) {
    //   //   return msg.reply('bitch it's too late')
    //   // }
    // } catch (e) {
    //   return msg.reply(
    //     `The task ID you gave doesn't exist! You can find the exact ID with the \`$${ListCommand.DEFAULT_CMD_NAME}\` command`,
    //   );
    // }

    try {
      await taskService.update(taskID, { status: TaskStatus.CANCELLED });

      // TODO should prompt user to confirm action
      // TODO only allow user to call this command if they're still in grace period
      // TODO should only be able to cancel PENDING tasks (anything else is nono)
      return msg.reply(
        'Task cancelled successfully! You will not be prompted for a check-in.',
      );
    } catch (e) {
      // TODO better error handling (e.g. 'bad id' vs 'sth went wrong with the req')
      return msg.reply(
        `The task ID you gave doesn't exist! You can find the exact ID with the \`$${ListCommand.DEFAULT_CMD_NAME}\` command`,
      );
    }
  }
}

export default CancelCommand;
