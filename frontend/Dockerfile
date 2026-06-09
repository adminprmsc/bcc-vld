# Frontend Dockerfile - Multi-stage build
# Use bookworm-slim (not alpine) — avoids intermittent OpenSSL errors during npm ci on Docker Desktop/macOS
FROM node:22-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm ci --maxsockets 3

COPY . .
RUN npm run build -- --configuration=production

FROM nginx:alpine AS production

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist/lds-fe/browser /usr/share/nginx/html

RUN addgroup -g 1001 -S angular && \
    adduser -S angular -u 1001 && \
    chown -R angular:angular /usr/share/nginx/html && \
    chown -R angular:angular /var/cache/nginx && \
    chown -R angular:angular /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R angular:angular /var/run/nginx.pid

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
