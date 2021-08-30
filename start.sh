# Production start for all apps (Should only need to be run once)

cd bot
pm2 start npm --name "discord-bot" -- start
