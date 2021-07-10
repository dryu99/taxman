import { MessageEmbed } from 'discord.js';
import { CommandoClient } from 'discord.js-commando';
import dotenv from 'dotenv';
import Bot from './bot/Bot';
import mongoose from 'mongoose';

dotenv.config();

const main = async () => {
  // Setup db
  try {
    await mongoose.connect(process.env.MONGODB_URI as string, {
      // TODO remove typescript force
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('connected to MongoDB');
  } catch (e) {
    console.error('error connecting to MongoDB:', e.message);
  }

  // Start bot
  // We start after db setup b/c bot queries db right away in interval handler
  const bot = new Bot();
  bot.start();
};

main();
