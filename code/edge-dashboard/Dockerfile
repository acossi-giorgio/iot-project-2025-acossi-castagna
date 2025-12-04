FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm install --production --no-audit --no-fund && npm cache clean --force
COPY . .
EXPOSE 4000
ENV NODE_ENV=production
CMD ["npm", "start"]
