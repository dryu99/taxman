import { MessageEmbed } from 'discord.js';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import logger from '../../lib/logger';
import taskService from '../../services/task-service';
import userService from '../../services/user-service';
import dayjs from 'dayjs';

enum ScheduleCommandArgs {
  DESCRIPTION = 'description',
  DATE = 'date',
  TIME = 'time',
  TIME_TYPE = 'timeType',
  TIME_ZONE = 'timeZone',
  COST = 'cost',
  PARTNER = 'partner',
  REMINDER = 'reminderMinutes',
}

const prompt =
  'Format is: <Description> <MM/DD> <HH:MM> <AM/PM> <Reminder (x minutes before)> <Cost> <@Partner>';

// TODO when user tries to do ANY command, should have a check to see if they exist in db.
//      check both user + member collection. add them if they dont exist.
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
          key: ScheduleCommandArgs.DESCRIPTION,
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
        {
          key: ScheduleCommandArgs.TIME_TYPE, // TODO can prob use more advanced commando type here
          prompt,
          type: 'string',
        },
        // {
        //   key: PlanCommandArgs.TIME_ZONE,
        //   prompt,
        //   type: 'string',
        // },
        {
          key: ScheduleCommandArgs.REMINDER,
          prompt,
          type: 'string',
        },
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

  // TODO make cost, reminder optional
  async run(msg: CommandoMessage, args: Record<ScheduleCommandArgs, string>) {
    const { description, date, time, timeType, cost, reminderMinutes } = args;

    // add user
    if (!userService.contains(msg.author.id)) {
      userService.add({ id: msg.author.id });
    }

    // check description
    if (description.trim().length <= 0) {
      return msg.reply('Task description was not given!');
    }

    // check date
    const dueDate = dayjs(
      `${date}/2021 ${time} ${timeType}`, // TODO use current year (not hardcoded)
      ['MM/DD/YYYY h:mm A', 'MM/DD/YYYY h:mm a'], // TODO add more accepted formats
      true,
    ).tz('America/Los_Angeles'); // TODO should accept user input
    if (!dueDate.isValid()) {
      return msg.reply('Date was not formatted properly!');
    }

    // check reminder
    const parsedReminderMinutes = Number(reminderMinutes);
    if (isNaN(parsedReminderMinutes)) {
      return msg.reply("Given reminder time isn't a valid number!");
    }

    // check cost
    const parsedCost = Number(cost);
    if (isNaN(parsedCost)) {
      return msg.reply("Given cost isn't a valid number!");
    }

    // check partner
    const taggedUser = msg.mentions.users.first();
    if (!taggedUser) {
      return msg.reply('Accountability partner was not mentioned!');
    }

    // add task
    // TODO handle errors
    await taskService.add({
      userDiscordID: msg.author.id,
      partnerUserDiscordID: taggedUser.id,
      channelID: msg.channel.id,
      guildID: msg.guild.id,
      stakes: parsedCost,
      description,
      dueAt: dueDate.toDate(),
      reminderTimeOffset: parsedReminderMinutes * 60 * 1000,
    });

    return msg.reply('Task scheduled successfully!');
  }
}

export default ScheduleCommand;
