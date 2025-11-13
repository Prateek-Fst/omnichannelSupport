FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

# Use development mode for now
CMD ["pnpm", "run", "start:dev"]