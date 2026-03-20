FROM node:22-slim AS builder

RUN apt-get update -qq && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npx prisma --version

COPY prisma/ prisma/
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src/ src/

RUN npx prisma generate \
    && rm -f prisma.config.ts \
    && npx nest build

FROM node:22-slim

RUN apt-get update -qq && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE ${PORT:-3000}

CMD ["sh", "-c", "echo \"DELETE FROM _prisma_migrations WHERE migration_name = '0_init';\" | npx prisma db execute --stdin 2>/dev/null; npx prisma migrate deploy && node dist/main"]
