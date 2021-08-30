# Start script for all apps (Should only need to be run once)

cd bot
NODE_ENV=production pm2 start npm --name "discord-bot" -- start
