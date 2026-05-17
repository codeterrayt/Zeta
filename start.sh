#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "=== Zeta Container Startup Script ==="

echo "1. Checking database connectivity and applying Prisma migrations/schema..."
# Use migrate dev (non-interactive fallback using db push if it's a new database/interactive prompt blocks)
if [ "$NODE_ENV" = "development" ]; then
  npx prisma migrate dev --name init --skip-generate || npx prisma db push --accept-data-loss
else
  npx prisma db push --accept-data-loss
fi

echo "2. Database is in sync! Starting the Next.js server..."
npm run start
