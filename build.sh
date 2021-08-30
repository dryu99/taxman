# Production build

# Move generated .env file to appropriate dir
cat .env
mv .env bot/

# build + restart bot
cd bot/scripts && ./build.sh
