import { CommandoClient, SQLiteProvider } from 'discord.js-commando';
import dotenv from 'dotenv';
import path from 'path';
import sqlite from 'sqlite';
import taskScheduler from './lib/task-scheduler';

dotenv.config();

const client = new CommandoClient({
  commandPrefix: '$', // TODO change to ! (figure out how to avoid conflicts with other bots e.g. rhythm bot)
  owner: process.env.OWNER_ID,
});

client.registry
  .registerGroups([['bot', 'Meta']])
  .registerDefaults()
  .registerCommandsIn(path.join(__dirname, 'commands'));

taskScheduler.start();

sqlite
  .open(path.join(__dirname, 'database.sqlite3'))
  .then((database) => {
    client.setProvider(new SQLiteProvider(database));
  })
  .catch((e) => {
    console.error(`Failed to connect to database: ${e}`);
  });

client.on('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}! (${client.user?.id})`);
  client.user?.setActivity('with Commando');
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(console.error);
