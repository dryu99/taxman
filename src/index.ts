import { CommandoClient, SQLiteProvider } from 'discord.js-commando';
import dotenv from 'dotenv';
import path from 'path';
import sqlite from 'sqlite';
import taskService from './services/tasks';

dotenv.config();

const client = new CommandoClient({
  commandPrefix: '$', // TODO change to ! (figure out how to avoid conflicts with other bots e.g. rhythm bot)
  owner: process.env.OWNER_ID,
});

client.registry
  .registerGroups([['bot', 'Meta']])
  .registerDefaults()
  .registerCommandsIn(path.join(__dirname, 'commands'));

client.setInterval(() => {
  console.log(
    `Scheduler: checking tasks (${new Date(Date.now()).toLocaleTimeString()})`,
  );

  // TODO rename lol
  // TODO determine if this doesn't work with different timezones
  const dueTasks = taskService.getDueTasks(Date.now());
  console.log('\tall tasks', taskService.getAll());
  console.log('\tdue tasks', dueTasks);
  // TODO have to somehow use discord client object here to send message to channel
  //      message should
  //        - specify task that's due
  //        - prompt author and partner to react
  //        - send another message based on reacts (e.g. fail or success)

  for (const dueTask of dueTasks) {
    client.channels.fetch(dueTask.channelID).then((channel) => {
      if (channel.isText()) {
        channel.send(`Task is due: ${dueTask.name}. Are you doing it?`);
        dueTask.isChecked = true; // TODO use updateTask function instead
      }
    });
  }
}, 10 * 1000); // TODO this num should be 1 min

// sqlite
//   .open(path.join(__dirname, 'database.sqlite3'))
//   .then((database) => {
//     client.setProvider(new SQLiteProvider(database));
//   })
//   .catch((e) => {
//     console.error(`Failed to connect to database: ${e}`);
//   });

client.on('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}! (${client.user?.id})`);
  client.user?.setActivity('with Commando');
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(console.error);
