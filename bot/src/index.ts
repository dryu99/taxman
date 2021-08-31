import config from './lib/config';
import Bot from './bot/bot';
import mongoose from 'mongoose';
import logger from './lib/logger';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
console.log('db uri', config.MONGODB_URI);
// TODO give embeds and msg variables more specific names
// TODO figure out way to handle messenger try catchs the same way (wrap with a fn? or wrap switch with try catch)
mongoose.set('useFindAndModify', false);
mongoose
  // TODO make config file
  .connect(config.MONGODB_URI as string, {
    // TODO remove typescript force
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    logger.info('Connected to MongoDB successfully');
    const bot = new Bot();
    bot.start();
  })
  .catch((e) => {
    logger.error('Failed to connect to MongoDB:', e.message);
    logger.info('Exiting program...');
  });
