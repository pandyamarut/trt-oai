FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install

# Copy all files from root
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["bun", "run", "index.ts"]