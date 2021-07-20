import { CommandoClient } from 'discord.js-commando';
import path from 'path';
import logger from '../lib/logger';
import settingsService from '../services/settings-service';
import taskService from '../services/task-service';
import TaskCheckInMessenger from './messengers/TaskCheckInMessenger';
import { formatMention } from './utils';

export default class Bot {
  static NAME: string = 'TaxBot';

  private client: CommandoClient;

  constructor() {
    this.client = new CommandoClient({
      commandPrefix: '$', // TODO change to ! (figure out how to avoid conflicts with other bots e.g. rhythm bot)
      owner: process.env.OWNER_ID,
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
      logger.info(
        `Logged in as ${this.client.user?.tag}! (${this.client.user?.id})`,
      );

      this.client.user?.setActivity('with Commando');
    });

    this.client.on('guildCreate', async (guild) => {
      guild?.systemChannel?.send(
        `Hello, I'm the Taxman. Yeaaah I'm the Taxman. Thanks for inviting me!`, // TODO more detailed intro (print commands)
      );

      // init settings
      await settingsService.init(guild.id);
    });

    this.client.on('guildDelete', (guild) => {
      // TODO delete guild settings here
    });
  }

  public async start(): Promise<string | void> {
    // TODO do sth like this for better interval handling https://stackoverflow.com/questions/52184291/async-await-with-setinterval
    //      also should be like 10 sec or sth lol
    //      basically we want to make it so the interval should only continue if the current operation has completed
    this.client.setInterval(() => {
      this.checkTasks();
    }, 5 * 1000);

    return this.client
      .login(process.env.DISCORD_BOT_TOKEN)
      .catch(console.error);
  }

  private async checkTasks(): Promise<void> {
    logger.info(
      `[BOT] Checking tasks (${new Date(Date.now()).toLocaleTimeString()})`,
    );

    // Check for due tasks
    // TODO handle await with try catch
    // TODO determine if this doesn't work with different timezones
    // TODO consider doing sth similar to reminder tasks where we only update status once msg has been confirmed to have been sent to server (in cases where msg doesn't send). Rn we're actually updating in the getDueTasks method. Only bad thing about that is that if db queries take a long time we could have repeated msgs hmm... (race condition)
    const dueTasks = await taskService.getDueTasks(new Date());
    logger.info('  Due tasks:', dueTasks);

    for (const dueTask of dueTasks) {
      const channel = await this.client.channels.fetch(dueTask.channelID);
      if (!channel.isText()) continue; // TODO sentry

      // TODO once we get access to guild id fetch settings so we can pass to check in messenger
      // const settings = settingsService.getByGuildID(dueTas)

      const taskCheckInMessenger = new TaskCheckInMessenger(dueTask, channel);

      // TODO test how this works with multiple task check-ins in the same channel (should expect/hope each msger works independently)
      taskCheckInMessenger.prompt(); // async
    }

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
    //   //   console.error(e)
    //   //   // TODO sentry + log into file
    //   // })
    // }

    // // if (sentReminderTaskIds.length > 0) {
    // //   taskService.updateMany(sentReminderTaskIds, { wasReminded: true })
    // // }
  }
}
