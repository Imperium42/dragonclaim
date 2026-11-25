# syntax=docker/dockerfile:1
# SPDX-License-Identifier: MPL-2.0
# Copyright (c) Imperium42®, LLC.
# Production Dockerfile for Dragonclaim Discord Bot
# Bun is the package manager / script runner; Node is the runtime.
ARG NODE_VERSION=26.13.1
ARG BUN_VERSION=1.4.5
ARG ALPINE_VERSION=3.24

FROM oven/bun:${BUN_VERSION}-alpine AS bun

# Shared base: Node + the (musl) Bun binary
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base
RUN apk add --no-cache libgcc libstdc++
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

# Build stage (all deps)
FROM base AS builder
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Production deps only
FROM base AS prod-deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production && \
    # Strip files never loaded at runtime (~11 MB): source maps, type decls, docs
    find node_modules -type f \( -name '*.map' -o -name '*.d.ts' -o -name '*.d.mts' \
        -o -name '*.d.cts' -o -iname '*.md' -o -iname '*.markdown' \) -delete && \
    rm -rf node_modules/@types

# Production stage: bare Alpine + just the Node binary (no npm/corepack/yarn, no Bun).
# ALPINE_VERSION must match the node:*-alpine base above (musl/libstdc++ ABI).
FROM alpine:${ALPINE_VERSION}

WORKDIR /app

# libstdc++/libgcc/libatomic: exactly what `ldd /usr/local/bin/node` needs on node:*-alpine. dumb-init: PID 1.
RUN apk add --no-cache libstdc++ libgcc libatomic dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S -G nodejs -u 1001 nodejs
COPY --from=base /usr/local/bin/node /usr/local/bin/node

# App code + deps stay root-owned (read-only to the app user). Only data/ is writable.
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/public ./src/public
COPY --from=builder /app/src/components/views ./src/components/views
COPY --chmod=755 scripts ./scripts

# data/: schemas + template (Mongo init) and runtime writes (key downloads, config updates)
COPY --chown=nodejs:nodejs data/schemas ./data/schemas
COPY --chown=nodejs:nodejs data/config.template.yml ./data/

# Clone the private secrets repo (git is installed and removed in the same layer).
# SUBMODULE_URL_WITH_ACCESS_TOKEN (repo URL incl. access token) arrives as a BuildKit *secret*, not a
# build ARG, so it never lands in image metadata / `docker history`:
#   - Coolify: set it as an env var and enable "Use Docker Build Secrets" (secret id = var name)
#   - Manual:  SUBMODULE_URL_WITH_ACCESS_TOKEN=... docker build --secret id=SUBMODULE_URL_WITH_ACCESS_TOKEN ...
# Optional: with no secret provided, the clone is skipped (dir stays empty).
# The clone's .git is deleted too: its config holds the tokenized remote URL.
# Cache bust to ensure we always fetch latest
ARG CACHE_BUST=1
RUN --mount=type=secret,id=SUBMODULE_URL_WITH_ACCESS_TOKEN,env=SUBMODULE_URL_WITH_ACCESS_TOKEN \
    mkdir -p /app/data/dc-prod-secrets && \
    if [ -n "$SUBMODULE_URL_WITH_ACCESS_TOKEN" ]; then \
        echo "Cloning private secrets repo..." && \
        apk add --no-cache git && \
        rm -rf /app/data/dc-prod-secrets && \
        git clone --depth 1 "$SUBMODULE_URL_WITH_ACCESS_TOKEN" /app/data/dc-prod-secrets && \
        rm -rf /app/data/dc-prod-secrets/.git && \
        apk del git && rm -rf /var/cache/apk/*; \
    fi && \
    chown -R nodejs:nodejs /app/data

USER nodejs

# Health check - checks the actual config file that will be used
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:55554/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => { process.exit(1); })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start via our smart startup script
CMD ["/app/scripts/startup.sh"]

# Port is configurable via environment variable or defaults to 55554
# Note: The actual port used is determined at runtime from config/env
EXPOSE 55554