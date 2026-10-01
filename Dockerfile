# syntax=docker/dockerfile:1
# Planning Poker v2: imagen multi-stage (build → runtime mínimo)

# ---------- build ----------
FROM node:24-alpine AS build
WORKDIR /app

# Dependencias primero (cache de capas)
COPY server/package.json server/package-lock.json ./server/
COPY client/package.json client/package-lock.json ./client/
RUN npm ci --prefix server && npm ci --prefix client

COPY shared ./shared
COPY server ./server
COPY client ./client
RUN npm run build --prefix client && npm run build --prefix server

# ---------- runtime ----------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3001
WORKDIR /app

COPY --chown=node:node server/package.json server/package-lock.json ./server/
RUN npm ci --omit=dev --prefix server && npm cache clean --force

# Misma estructura relativa que espera el server: server/dist/index.js → ../../client/dist
COPY --from=build --chown=node:node /app/server/dist ./server/dist
COPY --from=build --chown=node:node /app/client/dist ./client/dist

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/dist/index.js"]
