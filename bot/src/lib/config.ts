import dotenv from 'dotenv';

dotenv.config();

let { PORT, MONGODB_URI, DISCORD_OWNER_ID, DISCORD_BOT_TOKEN } = process.env;

if (process.env.NODE_ENV === 'development') {
  MONGODB_URI = process.env.MONGODB_DEV_URI;
}

export default {
  MONGODB_URI,
  PORT,
  DISCORD_OWNER_ID,
  DISCORD_BOT_TOKEN,
};
