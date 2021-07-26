import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { TaskStatus } from '../../models/TaskModel';
import taskService from '../../services/task-service';
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
      const guild = await guildService.getByDiscordID(msg.guild.id);

      if (!task) return msg.reply(INVALID_TASK_ID_ERROR);
      if (!guild) return msg.reply(MISSING_SETTINGS_ERROR);

      if (task.userDiscordID !== msg.author.id)
        return msg.reply("You can't edit other people's tasks!"); // TODO will timezones affect this...

      if (task.status !== TaskStatus.PENDING)
        return msg.reply(
          `You can only edit incomplete tasks! Use the \`$${ListCommand.DEFAULT_CMD_NAME}\` command to see them.`,
        );

      if (hasGracePeriodEnded(task, guild.settings.gracePeriodEndOffset))
        return msg.reply("Bitch it's too late."); // TODO change text lol

      const channel = await this.client.channels.fetch(task.channelID);
      if (!channel.isText()) return null;

      // TODO do this lol
      // const taskEditMessenger = new TaskEditMessenger(task, channel, msg);
      // await taskEditMessenger.prompt();

      return null;
    } catch (e) {
      logger.error(e); // TODO make logger utils
      if (e instanceof TimeoutError) return msg.reply(e.message); // tODO prob dont need to handle here can handle in messenger
      return msg.reply(INTERNAL_ERROR);
    }
  }
}

export default EditCommand;
