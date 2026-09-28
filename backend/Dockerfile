# ÖNDER Burs Kayıt - Backend (Node.js / Express)
#
# Açılışta bekleyen migration'lar otomatik çalışır, sonra API başlar.
# İlk kurulumda bir kez: docker compose exec backend npx knex seed:run
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=4000 \
    UPLOAD_DIR=/app/storage/uploads
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json knexfile.js ./
COPY src ./src
COPY migrations ./migrations
COPY seeds ./seeds
COPY scripts ./scripts

# Belgeler volume'a yazılır; uygulama root olmayan "node" kullanıcısıyla çalışır
RUN mkdir -p /app/storage/uploads && chown -R node:node /app/storage
USER node

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "./node_modules/.bin/knex migrate:latest && exec node src/index.js"]
