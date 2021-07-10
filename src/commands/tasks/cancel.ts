import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { TaskStatus } from '../../models/TaskModel';
import { listCommandName } from './list';
import taskService from '../../services/task-service';

enum CancelCommandArgs {
  TASK_ID = 'taskID',
}

module.exports = class CancelCommand extends Command {
  constructor(client: CommandoClient) {
    super(client, {
      name: 'cancel',
      aliases: ['cancel'],
      group: 'tasks',
      memberName: 'cancel',
      description: 'Cancel an upcoming task.',
      args: [
        {
          key: CancelCommandArgs.TASK_ID,
          prompt: `Please provide the ID of the task you wish to cancel. You can find the ID by calling the \`${listCommandName}\` command`,
          type: 'string',
        },
      ],
    });
  }

  // TODO handle input validation
  async run(msg: CommandoMessage, args: Record<CancelCommandArgs, string>) {
    const { taskID } = args;

    try {
    } catch (e) {
      // TODO better error handling (e.g. 'bad id' vs 'sth went wrong with the req')
      await taskService.update(taskID, { status: TaskStatus.CANCELLED });
    }

    // TODO should prompt user to confirm action
    // TODO only allow user to call this command if they're still in grace period

    return msg.reply(
      'Task cancelled successfully! You will not be prompted for a check-in.',
    );
  }
};
