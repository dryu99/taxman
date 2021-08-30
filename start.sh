# Production start for all apps (Should only need to be run once)
NODE_ENV=production pm2 start bot/dist/index.js --name "discord-bot"
