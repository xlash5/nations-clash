FROM node:18-alpine AS build-client
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY shared/ ./shared/
RUN npm ci
COPY client/ ./client/
RUN npm run build -w client

FROM node:18-alpine AS build-server
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY shared/ ./shared/
RUN npm ci
COPY server/ ./server/
RUN npm run build -w server

FROM node:18-alpine AS deps-prod
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
# Only install the server workspace to avoid pulling in client dependencies
RUN node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); p.workspaces=['server']; require('fs').writeFileSync('package.json', JSON.stringify(p,null,2))"
RUN npm ci --omit=dev

FROM node:18-alpine
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=build-server /app/server/dist ./server/dist
COPY --from=build-server /app/server/package.json ./server/package.json
COPY --from=build-server /app/shared ./shared
COPY --from=build-client /app/client/dist ./server/public
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
