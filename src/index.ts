import { MessageEmbed } from 'discord.js';
import { CommandoClient, SQLiteProvider } from 'discord.js-commando';
import dotenv from 'dotenv';
import sqlite from 'sqlite';
import Bot from './bot/Bot';

dotenv.config();

// start bot
const bot = new Bot();
bot.start();

// #963884 dark purp
// #c17ab6 light purp
// #5bb0e4 light blue
