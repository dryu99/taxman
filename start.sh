# Production start for all apps (Should only need to be run once)
cd bot
NODE_ENV=production pm2 start dist/index.js --name "discord-bot"
