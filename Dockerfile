FROM mcr.microsoft.com/playwright:v1.59.1-jammy AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM mcr.microsoft.com/playwright:v1.59.1-jammy AS runtime

WORKDIR /app/backend
COPY backend/package*.json ./
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential python3 \
  && rm -rf /var/lib/apt/lists/*
RUN npm ci --omit=dev
COPY backend/ ./

WORKDIR /app
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
RUN mkdir -p /app/storage/snapshots

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=Asia/Shanghai
ENV FRONTEND_URL=http://localhost:3000

EXPOSE 3000

WORKDIR /app/backend
CMD ["npm", "start"]
