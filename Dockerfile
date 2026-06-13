# syntax=docker/dockerfile:1
# =============================================================================
# Afro Miaam — Next.js 15 production image (multi-stage, standalone, non-root)
# =============================================================================
# Relies on `output: "standalone"` being set in next.config.js (owned by another
# agent). The standalone build emits a self-contained server.js plus a minimal
# node_modules tree under .next/standalone, so the final image stays small and
# does not need a full npm install at runtime.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 — deps: install ALL dependencies (incl. dev) for the build.
# Cached as long as package.json / package-lock.json are unchanged.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps
# libc6-compat smooths over the few native addons that expect glibc on Alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy only the manifests first to maximise Docker layer caching.
COPY package.json package-lock.json ./
# Use npm install to avoid lockfile cross-platform issues with optional deps
RUN npm install

# -----------------------------------------------------------------------------
# Stage 2 — builder: compile the Next.js app into a standalone bundle.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Reuse the installed dependency tree from the deps stage.
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the source. (.dockerignore keeps node_modules/.next/etc out.)
COPY . .

# Disable telemetry during the build for clean, reproducible CI logs.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# CRITICAL: NEXT_PUBLIC_* variables are inlined into the CLIENT bundle at BUILD
# time. `env_file: .env` in docker-compose only applies at RUNTIME, so without
# these build args the client would be compiled with the hardcoded fallback
# site key while the server reads the runtime one — a silent site-key mismatch
# that makes reCAPTCHA reject every token. Pass the public site key as a build
# arg so client and server always agree. (Site keys are public, not secret.)
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY="6Lf7GessAAAAAGDZVnxZQoq9C4YN8hAUg8pMIZya"
ARG NEXT_PUBLIC_SITE_URL="https://afromiaam.com"
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Produces .next/standalone, .next/static, etc.
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3 — runner: minimal runtime image, runs as the non-root nextjs user.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

# wget (from busybox, already present in alpine) is used by the HEALTHCHECK.
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# server.js (Next standalone) reads PORT/HOSTNAME to know where to bind.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create a dedicated unprivileged user/group (uid/gid 1001).
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy the standalone server output. --chown keeps everything owned by nextjs.
# .next/standalone already contains a pruned node_modules and server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets and public files are NOT bundled into standalone; copy them
# alongside so server.js can serve /_next/static and /public correctly.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Persistent uploads directory (mounted as a volume in docker-compose). Must be
# owned by the runtime user so the app can write uploaded menu images.
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000

# Container-level health probe. Compose/orchestrators use this to gate traffic
# and the CD pipeline waits on `healthy`. /api/health is a lightweight endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

# server.js is the entrypoint emitted by Next's standalone output.
CMD ["node", "server.js"]
