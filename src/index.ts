import { MessageEmbed } from 'discord.js';
import { CommandoClient, SQLiteProvider } from 'discord.js-commando';
import dotenv from 'dotenv';
import sqlite from 'sqlite';
import Bot from './bot/bot';

dotenv.config();

// start bot
const bot = new Bot();
bot.start();
