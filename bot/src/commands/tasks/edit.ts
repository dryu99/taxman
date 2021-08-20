import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { hasGracePeriodEnded } from '../../bot/utils';
import guildService from '../../services/guild-service';
import {
  INTERNAL_ERROR,
  INVALID_TASK_ID_ERROR,
  MISSING_SETTINGS_ERROR,
  TimeoutError,
} from '../../bot/errors';
import ListCommand from './list';
// import TaskEditMessenger from '../../bot/messengers/TaskEditMessenger';
import logger from '../../lib/logger';
import TaskWriteMessenger from '../../bot/messengers/TaskAddMessenger';
import taskEventService from '../../services/task-event-service';
import { TaskEventStatus } from '../../models/TaskEventModel';

enum EditCommandArgs {
  TASK_EVENT_ID = 'taskEventID',
}

/**
 * When rescheduling task (i.e. edit due date)
 * - update task event due date in db
 * - use node-schedule rescheduleJob fn / cancel + schedule
 *
 * for freq > 1
 * - lol itll depend on how you decide to implement tasks with freq > 1 + how you decide to display tasks with $list
 * - one solution would be to display TaskSchedule items instead of TaskEvent (like how apple reminders does it)
 * - editing task schedule id implies that any time/frequency changes would affect all live task events
 *  -
 */

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
          key: EditCommandArgs.TASK_EVENT_ID,
          prompt: 'Please provide a valid task ID.', // TODO use same one as cancel command
          type: 'string',
        },
      ],
    });
  }

  // TODO handle input validation
  async run(msg: CommandoMessage, args: Record<EditCommandArgs, string>) {
    const { taskEventID } = args;

    // Fetch + validate task event
    const taskEvent = await taskEventService.getByID(taskEventID);
    if (!taskEvent) return msg.reply(INVALID_TASK_ID_ERROR);
    if (taskEvent.userDiscordID !== msg.author.id) {
      return msg.reply("You can't edit other people's tasks!"); // TODO will timezones affect this...
    }
    if (taskEvent.status !== TaskEventStatus.PENDING) {
      return msg.reply(
        `You can only edit incomplete tasks! Use the \`$${ListCommand.DEFAULT_CMD_NAME}\` command to see them.`,
      );
    }
    // if (hasGracePeriodEnded(task, guild.settings.gracePeriodEndOffset))
    //   return msg.reply("Bitch it's too late."); // TODO change text lol

    // Fetch + validate channel
    const channel = await this.client.channels.fetch(
      taskEvent.schedule.channelID,
    );
    if (!channel.isText()) {
      return msg.reply(
        'Bot expected a Text channel but received something else.',
      );
    }

    // Fetch + validate guild
    // TODO can fetch at same time as channel (promise.all)
    const guild = await guildService.getByDiscordID(msg.guild.id);
    if (!guild) return msg.reply(MISSING_SETTINGS_ERROR);

    const taskWriteMessenger = new TaskWriteMessenger(
      channel,
      msg.author.id,
      guild,
      taskEvent.schedule,
    );

    try {
      await taskWriteMessenger.start();
    } catch (e) {
      // TODO sentry
      logger.error(e);
      await channel.send(INTERNAL_ERROR);
    }

    return null;
  }
}

export default EditCommand;
