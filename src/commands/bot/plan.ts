import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { DateTime } from 'luxon';
import taskService from '../../services/tasks';
import userService from '../../services/users';

const prompt = 'Format is: <Task name> <YYYY-MM-DD> <HH:MM> <Cost>';

enum PlanCommandArgs {
  TASK_NAME = 'taskName',
  DATE = 'date',
  TIME = 'time',
  TIME_TYPE = 'timeType',
  TIME_ZONE = 'timeZone',
  COST = 'cost',
}

module.exports = class PlanCommand extends Command {
  constructor(client: CommandoClient) {
    super(client, {
      name: 'plan',
      aliases: ['plan'],
      group: 'bot',
      memberName: 'plan',
      description: 'Schedule a new task.',
      args: [
        {
          key: PlanCommandArgs.TASK_NAME,
          prompt,
          type: 'string',
        },
        {
          key: PlanCommandArgs.DATE,
          prompt,
          type: 'string',
        },
        {
          key: PlanCommandArgs.TIME,
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
          key: PlanCommandArgs.COST,
          prompt,
          type: 'string',
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

  async run(msg: CommandoMessage, args: Record<PlanCommandArgs, string>) {
    const { taskName, date, time, cost } = args;

    // add user
    if (!userService.contains(msg.author.id)) {
      userService.add({ id: msg.author.id });
    }

    // compute date
    const scheduleDate = DateTime.fromISO(`${date}T${time}`, {
      zone: 'America/Los_Angeles', // TODO change to use user input
    });

    console.log('date', scheduleDate.toString());

    // add task
    taskService.add({
      authorID: msg.author.id,
      partnerID: 'test',
      channelID: msg.channel.id,
      cost: Number(cost),
      name: taskName,
      createdAt: msg.createdAt.getTime(),
      scheduleDate: scheduleDate.toMillis(),
    });

    console.log('users', userService.getAll());
    console.log('tasks', taskService.getAll());

    return msg.reply(`success`);
  }
};
