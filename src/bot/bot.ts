import { TextChannel } from 'discord.js';
import { CommandoClient } from 'discord.js-commando';
import path from 'path';
import taskService from '../services/tasks';
import TaskCheckInMessenger from './TaskCheckInMessenger';
// import mongoose from 'mongoose';

export default class Bot {
  private client: CommandoClient;

  constructor() {
    this.client = new CommandoClient({
      commandPrefix: '$', // TODO change to ! (figure out how to avoid conflicts with other bots e.g. rhythm bot)
      owner: process.env.OWNER_ID,
    });

    // register commands
    this.client.registry
      .registerGroups([['bot', 'Meta']])
      .registerDefaults()
      .registerCommandsIn(path.join(__dirname, '../commands'));

    // register event handlers
    this.client.on('ready', async () => {
      console.log(
        `Logged in as ${this.client.user?.tag}! (${this.client.user?.id})`,
      );
      this.client.user?.setActivity('with Commando');
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
      `Bot: checking tasks (${new Date(Date.now()).toLocaleTimeString()})`,
    );

    // TODO handle await with try catch
    // TODO determine if this doesn't work with different timezones
    const dueTasks = await taskService.getDueTasks(new Date());
    // console.log('\tall tasks', taskService.getAll());
    console.log('Due tasks', dueTasks);

    for (const dueTask of dueTasks) {
      // await taskService.check(dueTask.id); // check task so it won't be considered due again

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
