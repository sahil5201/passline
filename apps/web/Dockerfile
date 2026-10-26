
# Build
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies from the monorepo root
FROM base AS deps

COPY package.json bun.lock ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/package.json

RUN bun install --frozen-lockfile

# Build the Next.js app
FROM deps AS builder

ENV NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN bun run --cwd apps/web build

# Production
FROM oven/bun:1 AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["bun", "apps/web/server.js"]