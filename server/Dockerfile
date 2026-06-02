FROM node:18-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json tsconfig*.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm ci --silent
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 4000
ENV NODE_ENV=production
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]


