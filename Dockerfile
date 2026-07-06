# ============================================
# Stage 1: React frontend build
# ============================================
FROM node:20-alpine AS frontend-build

WORKDIR /app/client

# Frontend bağımlılıklarını kur
COPY client/package.json client/package-lock.json* ./
RUN npm install

# Frontend kaynak kodlarını kopyala ve build et
COPY client/ .
RUN npm run build

# ============================================
# Stage 2: Production image
# ============================================
FROM node:20-alpine

WORKDIR /app

# Sağlık kontrolü için curl kur
RUN apk add --no-cache curl

# Backend bağımlılıklarını kur (sadece production deps)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# Backend kaynak kodlarını kopyala
COPY server/ ./server/

# Build edilmiş frontend dosyalarını kopyala
COPY --from=frontend-build /app/client/dist ./client/dist/

# SQLite veritabanı için data klasörü oluştur
RUN mkdir -p /app/data

# Port 25 (SMTP) ve 3001 (API) dışa aç
EXPOSE 25 3001

# Ortam değişkenleri (docker-compose ile override edilebilir)
ENV NODE_ENV=production
ENV API_PORT=3001
ENV SMTP_PORT=25
ENV ADMIN_PASSWORD=admin123
ENV ADDRESS_TTL_MINUTES=60

# Sağlık kontrolü
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Uygulamayı başlat
CMD ["node", "server/index.js"]
