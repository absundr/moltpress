# Base image
FROM oven/bun:1

# Set working directory
WORKDIR /app

# Copy package files first (better caching)
COPY package.json bun.lockb* ./

# Install dependencies (frozen-lockfile ensures exact versions)
RUN bun install --frozen-lockfile --production

# Copy the rest of the app source
COPY . .

# Expose the port
EXPOSE 3000

# Start command
CMD ["bun", "run", "index.ts"]