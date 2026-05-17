FROM node:24-slim

# Install OpenSSL (needed for Prisma)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Copy everything into the container at once
COPY . .

# 1. RUN INSTALL WITHOUT NODE_ENV=production (Grabs devDependencies like tailwindcss/postcss)
RUN npm install

# Trick Prisma during the build phase
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/placeholder"

# Generate Prisma Client
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# 2. SET PRODUCTION ENV ONLY AFTER THE BUILD IS FINISHED
ENV NODE_ENV production

# Ensure uploads directory exists
RUN mkdir -p public/uploads

EXPOSE 3000

# Push database schema updates, then start the server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run start"]