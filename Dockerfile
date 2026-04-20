FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY package.json server.js ./
COPY public ./public

EXPOSE 80
VOLUME ["/storage"]

CMD ["node", "server.js"]
