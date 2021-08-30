# Move generated .env file to appropriate dir
mv .env bot/

# build + restart bot
cd bot/scripts && ./build.sh
