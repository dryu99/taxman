import dotenv from 'dotenv';

dotenv.config();

let PORT = process.env.PORT;
let MONGODB_URI = process.env.MONGODB_URI;
let DISCORD_OWNER_ID = process.env.DISCORD_OWNER_ID;
let DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (process.env.NODE_ENV === 'development') {
  MONGODB_URI = process.env.MONGODB_DEV_URI;
}

export default {
  MONGODB_URI,
  PORT,
  DISCORD_OWNER_ID,
  DISCORD_BOT_TOKEN,
};
