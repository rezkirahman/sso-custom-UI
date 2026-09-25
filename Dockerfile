FROM node:18-alpine AS base

# 1. Deps stage: Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Gunakan package.json dan package-lock.json
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Builder stage: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables sementara untuk proses build (jika dibutuhkan Next.js)
# Next.js standalone build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3. Runner stage: Setup production environment
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Buat non-root user untuk keamanan di Kubernetes
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Salin public files dan standalone build dari builder
COPY --from=builder /app/public ./public

# Setup hak akses untuk direktori cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Salin file standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch ke user non-root
USER nextjs

EXPOSE 3000

ENV PORT=3000
# Menggunakan hostname 0.0.0.0 agar bisa diakses oleh K8s Ingress
ENV HOSTNAME="0.0.0.0"

# Start aplikasi menggunakan standalone server.js
CMD ["node", "server.js"]
