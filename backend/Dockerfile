# ============================================================
# VoiceShield Console Backend
# Multi-stage production Dockerfile
# ============================================================

# ------------------------------------------------------------
# Stage 1: Build
# ------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy application source and migration assets
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY scripts/ ./scripts/

# Compile TypeScript
RUN npm run build


# ------------------------------------------------------------
# Stage 2: Production Runner
# ------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Required for:
# - Health checks
# - AWS RDS TLS
RUN apk add --no-cache \
    curl \
    ca-certificates

# ------------------------------------------------------------
# Security: run application as non-root user
# ------------------------------------------------------------
RUN addgroup -S appgroup \
    && adduser -S appuser -G appgroup

# ------------------------------------------------------------
# Production dependencies only
# ------------------------------------------------------------
COPY package*.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

# ------------------------------------------------------------
# Application artifacts
# ------------------------------------------------------------
COPY --from=builder /app/dist ./dist

# Migration files are required when migrations are executed
# manually against the production RDS database.
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/scripts ./scripts

# ------------------------------------------------------------
# Local storage fallback
#
# Render filesystem is ephemeral.
# Production evidence/exports should use S3.
# ------------------------------------------------------------
RUN mkdir -p /app/storage \
    && chown -R appuser:appgroup /app

# ------------------------------------------------------------
# Drop root privileges
# ------------------------------------------------------------
USER appuser

# ------------------------------------------------------------
# Application port
# ------------------------------------------------------------
EXPOSE 4000

# ------------------------------------------------------------
# Container health check
# ------------------------------------------------------------
HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=15s \
    --retries=3 \
    CMD curl -f http://localhost:4000/health/live || exit 1

# ------------------------------------------------------------
# Start API
#
# IMPORTANT:
# Do NOT run migrations automatically here.
# Render Free does not provide Pre-Deploy Commands.
# Migrations are executed separately against RDS.
# ------------------------------------------------------------
CMD ["node", "dist/main.js"]
