import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import ListCommand from './list';
import { INVALID_TASK_ID_ERROR } from '../../bot/errors';
import { hasGracePeriodEnded, toMinutes } from '../../bot/utils';
import taskEventService from '../../services/task-event-service';
import { TaskEventStatus } from '../../models/task-event-model';
import taskScheduleService from '../../services/task-schedule-service';

enum CancelCommandArgs {
  TASK_EVENT_ID = 'taskEventID',
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
          key: CancelCommandArgs.TASK_EVENT_ID,
          prompt: `Please provide the ID of the task you wish to cancel. You can find the ID by calling the \`${ListCommand.DEFAULT_CMD_NAME}\` command`,
          type: 'string',
        },
      ],
    });
  }

  // TODO handle
  // TODO handle input validation
  async run(msg: CommandoMessage, args: Record<CancelCommandArgs, string>) {
    const { taskEventID } = args;

    // Fetch + validate task event
    const taskEvent = await taskEventService.getByID(taskEventID);
    if (!taskEvent) return msg.reply(INVALID_TASK_ID_ERROR);
    if (taskEvent.userDiscordID !== msg.author.id) {
      // TODO abstract this, edit has same lgic
      return msg.reply("You can't cancel other people's tasks!");
    }
    if (taskEvent.status !== TaskEventStatus.PENDING) {
      return msg.reply(
        `You can only cancel incomplete tasks! Use the \`$${ListCommand.DEFAULT_CMD_NAME}\` command to see them.`,
      );
    }
    const { gracePeriodEndOffset } = taskEvent.schedule.guild.settings;
    if (hasGracePeriodEnded(taskEvent)) {
      return msg.reply(
        `Sorry! Cancelling becomes disabled ${toMinutes(
          gracePeriodEndOffset,
        )} minutes before the deadline.`,
      );
    }

    // Update task schedule + event in db
    await Promise.all([
      taskEventService.update(taskEvent.id, {
        status: TaskEventStatus.CANCEL,
      }),
      taskScheduleService.update(taskEvent.schedule.id, { enabled: false }),
    ]);

    // TODO should prompt user to confirm action
    return msg.reply(
      'Task cancelled successfully! You will not be prompted for a check-in.',
    );
  }
}

export default CancelCommand;
