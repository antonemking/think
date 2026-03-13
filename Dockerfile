# ---- Build stage ----
FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++ libc-dev

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:22-alpine AS runner

RUN apk add --no-cache libc-dev

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3100

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Data directory (mount as volume for persistence)
RUN mkdir -p /app/data
VOLUME /app/data

EXPOSE 3100

CMD ["node", "server.js"]
