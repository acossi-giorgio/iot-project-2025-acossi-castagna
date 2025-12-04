FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install --production \
    && npm cache clean --force
COPY server.js ./server.js
COPY config ./config
COPY certs ./certs
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "server.js"]
