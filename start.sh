#!/bin/sh
# Read frontend port from config.json
FRONTEND_PORT=$(node -p "require('/app/config.json').frontendPort")

# Start backend in background
cd /app/backend
node dist/src/main.js &

# Start frontend server in foreground (keeps container alive)
cd /app
exec serve -s -l $FRONTEND_PORT /app/frontend/build

