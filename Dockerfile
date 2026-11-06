FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY config ./config
COPY sql ./sql
COPY docs ./docs
RUN mkdir -p /app/data/raw && chown -R node:node /app
USER node
CMD ["node", "dist/src/cli/index.js", "scheduler"]
