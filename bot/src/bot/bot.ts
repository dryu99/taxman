import { CommandoClient } from 'discord.js-commando';
import path from 'path';
import logger from '../lib/logger';
import guildService from '../services/guild-service';
import taskEventService from '../services/task-event-service';
import { formatDate, toMilliseconds } from './utils';
import TaskScheduler from './task-event-scheduler';
import config from '../lib/config';

export default class Bot {
  static NAME: string = 'TaxBot';

  private client: CommandoClient;

  constructor() {
    this.client = new CommandoClient({
      commandPrefix: 'T$', // TODO figure out how to avoid conflicts with other bots e.g. rhythm bot
      owner: config.DISCORD_OWNER_ID,
      // presence: TODO do this https://discord.js.org/#/docs/main/stable/typedef/PresenceData
    });

    // register commands
    this.client.registry
      .registerGroups([['tasks', 'Task related commands']])
      .registerDefaults()
      .registerCommandsIn(path.join(__dirname, '../commands'));

    // TODO better error handling here?
    // this.client.on('error', (e) => {
    //   console.log('ERROR', e);
    // });

    // register event handlers
    this.client.on('ready', async () => {
      logger.dev(
        `Logged in as ${this.client.user?.tag}! (${this.client.user?.id})`,
      );

      this.client.user?.setActivity('with Commando');
    });

    this.client.on('guildCreate', async (guild) => {
      guild?.systemChannel?.send(
        `Hello, I'm the TaxBot. Yeaaah I'm the TaxBot. Thanks for inviting me!`, // TODO more detailed intro (print commands)
      );

      // init guild settings
      await guildService.init(guild.id);
    });

    this.client.on('guildDelete', (guild) => {
      // TODO amplitude
      // TODO delete guild settings
      // TODO should look into what happens if discord bot tries to send message to guild its been removed from
      //      we need to update all tasks / members in some way
      //      tasks: flag status as cancelled? need to do sth to prevent them from being fetched
      //             actually, maybe we dont need to since fetched tasks are flagged as checked. we could keep fetching in case they come back
      //             actually we should do some kind of flagging lmao, this would be bad for recuring tasks. need to stop them from recurring somehow
      //      members: can prob just leave? or maybe reset cancel tokens or sth
    });

    this.client.on('error', (error) => {
      logger.error('BLAH', error);
    });

    // Other configuration
    TaskScheduler.init(this.client);
  }

  // TODO might need to handle case where this fires before client is ready
  public async start(): Promise<void> {
    logger.info('Starting bot');
    await this.client.login(config.DISCORD_BOT_TOKEN).catch(logger.error);
    logger.info('Logged into Discord successfully');

    // schedule tasks on startup (needed in case server dies; node schedule jobs are kept in memory not separate processes)
    this.scheduleTaskEvents();

    // TODO do sth like this for better interval handling https://stackoverflow.com/questions/52184291/async-await-with-setinterval
    //      also should be like 10 sec or sth lol
    //      basically we want to make it so the interval should only continue if the current operation has completed
    // TODO should schedule this to occur every midnight
    this.client.setInterval(() => {
      this.scheduleTaskEvents();
    }, toMilliseconds(15, 'minutes'));
  }

  private async scheduleTaskEvents(): Promise<void> {
    logger.dev(`[BOT] Scheduling tasks (${new Date().toLocaleTimeString()})`);

    // TODO could do some kind of check to see if nodeSchedule.scheudleJobs.length > 0 (it should be 0)
    // TODO determine if this doesn't work with different timezones
    // TODO consider doing sth similar to reminder tasks where we only update status once msg has been confirmed to have been sent to server (in cases where msg doesn't send). Rn we're actually updating in the getDueTasks method. Only bad thing about that is that if db queries take a long time we could have repeated msgs hmm... (race condition)
    const todayTaskEvents = await taskEventService.getAllByToday();
    logger.dev(
      "  Today's tasks:",
      todayTaskEvents.map((event) => ({
        id: event.id,
        description: event.schedule.description,
        dueAt: formatDate(event.dueAt),
        userDiscordID: event.schedule.userDiscordID,
      })),
    );

    TaskScheduler.scheduleMany(todayTaskEvents);

    // const dueTasks = await taskService.getDueTasks(new Date());
    // logger.info('  Due tasks:', dueTasks);

    // for (const dueTask of dueTasks) {
    //   let channel: Channel | undefined;
    //   try {
    //     channel = await this.client.channels.fetch(dueTask.channelID);
    //   } catch (e) {
    //     // possible errors:
    //     //  - channel doesn't exist anymore
    //     //  - bot was kicked from guild
    //     logger.error(e);
    //     await taskService.update(dueTask.id, {
    //       status: TaskStatus.FORCE_CANCELLED,
    //     });

    //     // TODO should consider msging user too
    //     //      if channel doesn't exist anymore -> force_cancel channel tasks + DM users with tasks scheduled for that channel and let them know that all their scheduled tasks for that channel were cancelled
    //     //      if guild doesn't exist anymore -> force_cancel guild tasks + DM users with tasks scheduled in that guild same thing as above ^ (actually we can do this in the guildDelete event handler)
    //     // TODO sentry
    //     continue;
    //   }

    //   if (!channel.isText()) continue; // TODO sentry

    //   // TODO shouldn't have to fetch here, should get populated from dueTask
    //   const guild = await guildService.getByID(dueTask.guildID);
    //   if (!guild) {
    //     logger.error(MISSING_SETTINGS_ERROR, dueTask);
    //     await channel.send(MISSING_SETTINGS_ERROR);
    //     continue;
    //     // TODO sentry
    //   }

    //   const taskCheckInMessenger = new TaskCheckInMessenger(
    //     dueTask,
    //     channel,
    //     guild,
    //   );

    //   // TODO test how this works with multiple task check-ins in the same channel (should expect/hope each msger works independently)
    //   taskCheckInMessenger.start(); // async
    // }

    // TODO consider how to handle users editing reminders
    // // Check for tasks that need reminding
    // const sentReminderTaskIds: string[] = [];
    // const reminderTasks = await taskService.getReminderTasks(new Date());
    // logger.info('  Reminder tasks:', reminderTasks);
    // for (const reminderTask of reminderTasks) {
    //   if (!reminderTask.reminderOffset) continue;

    //   const channel = await this.client.channels.fetch(reminderTask.channelID);
    //   if (!channel.isText()) continue; // TODO sentry

    //   channel.send(
    //     `${formatMention(
    //       reminderTask.userDiscordID,
    //     )} ‼️ REMINDER ‼️ your task "${reminderTask.name}" is due in **${
    //       reminderTask.reminderOffset / (60 * 1000)
    //     }** minutes @ ${reminderTask.dueDate.toLocaleString()}`,
    //   ); // async

    //   // TODO might need this depending on how you decide to update wasReminded flag
    //   // .then(() => {
    //   //   sentReminderTaskIds.push(reminderTask.id)
    //   // })
    //   // .catch(e => {
    //   //   logger.error(e)
    //   //   // TODO sentry + log into file
    //   // })
    // }

    // // if (sentReminderTaskIds.length > 0) {
    // //   taskService.updateMany(sentReminderTaskIds, { wasReminded: true })
    // // }
  }
}
