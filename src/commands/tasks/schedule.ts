import { MessageEmbed } from 'discord.js';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { DateTime } from 'luxon';
import logger from '../../lib/logger';
import taskService from '../../services/task-service';
import userService from '../../services/user-service';

enum ScheduleCommandArgs {
  TASK_NAME = 'taskName',
  DATE = 'date',
  TIME = 'time',
  TIME_TYPE = 'timeType',
  TIME_ZONE = 'timeZone',
  COST = 'cost',
  PARTNER = 'partner',
}

const prompt = 'Format is: <Task name> <YYYY-MM-DD> <HH:MM> <Cost> <@Partner>';

class ScheduleCommand extends Command {
  static DEFAULT_CMD_NAME = 'schedule';

  constructor(client: CommandoClient) {
    super(client, {
      name: ScheduleCommand.DEFAULT_CMD_NAME,
      aliases: [ScheduleCommand.DEFAULT_CMD_NAME],
      group: 'tasks',
      memberName: ScheduleCommand.DEFAULT_CMD_NAME,
      description: 'Schedule a new task.',
      args: [
        {
          key: ScheduleCommandArgs.TASK_NAME,
          prompt,
          type: 'string',
        },
        {
          key: ScheduleCommandArgs.DATE,
          prompt,
          type: 'string',
        },
        {
          key: ScheduleCommandArgs.TIME,
          prompt,
          type: 'string',
        },
        // {
        //   key: PlanCommandArgs.TIME_TYPE, // TODO can prob use more advanced commando type here
        //   prompt,
        //   type: 'string',
        // },
        // {
        //   key: PlanCommandArgs.TIME_ZONE,
        //   prompt,
        //   type: 'string',
        // },
        {
          key: ScheduleCommandArgs.COST,
          prompt,
          type: 'string',
        },
        {
          key: ScheduleCommandArgs.PARTNER,
          prompt,
          type: 'member',
        },
      ],
    });
  }

  // event name
  // - date
  // - time
  // - frequency (once, daily, weekly, custom)
  // - penalty amount ($)
  // - partner (use discord @)

  // TODO handle input validation
  async run(msg: CommandoMessage, args: Record<ScheduleCommandArgs, string>) {
    const { taskName, date, time, cost } = args;

    // add user
    if (!userService.contains(msg.author.id)) {
      userService.add({ id: msg.author.id });
    }

    // compute date
    const dueDate = DateTime.fromISO(`${date}T${time}`, {
      zone: 'America/Los_Angeles', // TODO change to use user input
    });

    // get partner
    const taggedUser = msg.mentions.users.first();
    if (!taggedUser) {
      return msg.reply('No partner user was mentioned!');
    }

    // add task TODO handle errors
    await taskService.add({
      authorID: msg.author.id,
      partnerID: taggedUser.id,
      channelID: msg.channel.id,
      cost: Number(cost),
      name: taskName,
      dueDate: dueDate.toJSDate(),
    });

    logger.info('users', userService.getAll());
    logger.info('tasks', await taskService.getAll());

    return msg.reply('Task scheduled successfully!');
  }
}

export default ScheduleCommand;
