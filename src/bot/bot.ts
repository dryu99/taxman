import { TextChannel } from 'discord.js';
import { CommandoClient } from 'discord.js-commando';
import path from 'path';
import settingsService from '../services/settings-service';
import taskService from '../services/task-service';
import TaskCheckInMessenger from './TaskCheckInMessenger';

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
      console.log(
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
    console.log(
      `[BOT] Checking tasks (${new Date(Date.now()).toLocaleTimeString()})`,
    );

    // TODO handle await with try catch
    // TODO determine if this doesn't work with different timezones
    const dueTasks = await taskService.getDueTasks(new Date());
    console.log('  Due tasks:', dueTasks);

    // TOOD consider scenario where multiple users schedule task due dates at same time
    for (const dueTask of dueTasks) {
      const channel = await this.client.channels.fetch(dueTask.channelID);
      if (!channel.isText()) continue; // TODO sentry

      const taskCheckInMessager = new TaskCheckInMessenger(
        dueTask,
        this.client,
        channel as TextChannel,
      );

      await taskCheckInMessager.prompt();
    }
  }
}
