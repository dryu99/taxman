# Production build

# Move generated .env file to appropriate dir
echo "Moving .env file..."
mv .env bot/

# build + restart bot
echo "Building + restarting apps..."
cd bot/scripts && ./build.sh
