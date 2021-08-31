# Production build
yarn
yarn build
NODE_ENV=production pm2 restart discord-bot --update-env
