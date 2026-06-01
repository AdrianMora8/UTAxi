FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig*.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm ci --silent
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
EXPOSE 4000
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
