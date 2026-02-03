FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies (including dev deps for tsx + Prisma) and generate Prisma client
FROM base AS deps
ENV NODE_ENV=development
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY prisma/schema.prisma prisma/
RUN npx prisma generate

# Build the Next.js application
FROM deps AS builder
COPY . .
RUN npm run build

# Runtime image shared by web + worker services
FROM base AS runner
RUN useradd -m nextjs
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/app ./app
COPY --from=builder /app/services ./services
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/data ./data
EXPOSE 3000
USER nextjs
CMD ["npm", "run", "start"]
