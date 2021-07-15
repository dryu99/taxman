import dotenv from 'dotenv';
import Bot from './bot/Bot';
import mongoose from 'mongoose';
import logger from './lib/logger';

dotenv.config();

// TODO give embeds and msg variables more specific names
// TODO make development db local lol
// TODO figure out way to handle messenger try catchs the same way (wrap with a fn? or wrap switch with try catch)
const main = async () => {
  // Setup db
  try {
    await mongoose.connect(process.env.MONGODB_URI as string, {
      // TODO remove typescript force
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info('Connected to MongoDB successfully');
  } catch (e) {
    logger.error('Error connecting to MongoDB:', e.message);
  }

  // Start bot
  // We start after db setup b/c bot queries db right away in interval handler
  const bot = new Bot();
  bot.start();
};

main();
