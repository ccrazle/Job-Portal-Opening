FROM node:20-alpine

WORKDIR /app

# Install backend dependencies first (cached layer when only app code changes)
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm install --omit=dev

# Copy the rest of the app (frontend is served statically by the backend)
COPY backend ./backend
COPY frontend ./frontend

# Persist SQLite DB under /data so a volume mount survives container rebuilds
ENV DB_PATH=/data/job_portal.db
RUN mkdir -p /data

WORKDIR /app/backend

EXPOSE 3000

CMD ["node", "server.js"]
