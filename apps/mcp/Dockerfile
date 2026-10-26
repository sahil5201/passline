
# Build stage
FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps

# Root workspace files
COPY package.json bun.lock ./

# Workspace packages
COPY packages ./packages

# MCP app manifest
COPY apps/mcp/package.json ./apps/mcp/package.json

# Install workspace dependencies
RUN bun install --frozen-lockfile

# Build stage
FROM deps AS builder

COPY apps/mcp ./apps/mcp

WORKDIR /app/apps/mcp

# Compile TypeScript into a standalone executable bundle
RUN bun build ./src/index.ts --outdir ./dist --target bun

# Copy MCP UI assets to the runtime path
RUN mkdir -p ./dist/ui \
    && cp ./src/mcp/ui/ats-result.html ./dist/ui/ats-result.html

# Production stage
FROM oven/bun:1-slim AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

COPY --from=builder /app/apps/mcp/dist ./dist

EXPOSE 3001

CMD ["bun", "dist/index.js"]