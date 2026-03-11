# Backend — Dockerfile
FROM node:20-alpine

# Install native build tools for sharp/bcrypt
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Create uploads dir (ephemeral on Cloud Run — fine for demo)
RUN mkdir -p /tmp/uploads

EXPOSE 5000

ENV NODE_ENV=production
ENV UPLOAD_DIR=/tmp/uploads

CMD ["node", "src/server.js"]
