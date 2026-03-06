# ---- Build frontend ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Production server ----
FROM node:20-alpine
WORKDIR /app

# Backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Backend source
COPY backend/ ./backend/

# Built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Cloud Run injects PORT env var
EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "backend/server.js"]
