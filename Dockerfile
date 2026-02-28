# 1tips — чаевые картой. Multi-stage build (slim: glibc, стабильная сборка Next/SWC).

# --- deps ---
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- build ---
FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npx next build

# --- runner ---
FROM node:20-slim AS runner
WORKDIR /app

# OpenSSL нужен для Prisma (иначе предупреждение и возможные 500 при работе с БД)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs
    
RUN npm install -g prisma@6

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/ws ./node_modules/ws
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# tsx и bcryptjs для запуска seed в контейнере (prisma db seed / npx tsx prisma/seed.ts)
COPY --from=builder /app/package.json /app/package-lock.json ./
USER root
RUN npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-timeout 120000 \
    && npm install tsx bcryptjs --omit=dev --ignore-scripts && chown -R nextjs:nodejs /app/node_modules
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "prisma migrate deploy && (PORT=3001 node server.js &) && sleep 3 && exec node scripts/proxy-ws-server.cjs"]
