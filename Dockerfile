FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer when only app code changes)
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm install --omit=dev

# Copy app code
COPY backend ./backend
COPY frontend ./frontend

ENV NODE_ENV=production

WORKDIR /app/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
