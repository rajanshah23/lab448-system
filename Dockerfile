# Stage 1: Build frontend (Vite)
FROM node:20-alpine AS frontend-build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .
ENV VITE_API_BASE_URL=/api
RUN npm run build

# Stage 2: Backend + serve frontend from ./public
FROM node:20-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/ .
COPY --from=frontend-build /app/dist ./public

EXPOSE 4000

CMD ["node", "src/server.js"]
