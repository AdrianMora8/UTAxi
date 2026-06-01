## multi-stage build: build with node, serve with nginx
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json tsconfig*.json ./
COPY index.html ./
COPY vite.config.ts tailwind.config.ts postcss.config.js ./
COPY src ./src
RUN npm ci --silent
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
