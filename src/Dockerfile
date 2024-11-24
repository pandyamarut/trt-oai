# src/Dockerfile
FROM oven/bun:1.0

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy TypeScript files
COPY src/ ./src/
COPY tsconfig.json .

EXPOSE 3001

CMD ["bun", "run", "src/server.ts"]