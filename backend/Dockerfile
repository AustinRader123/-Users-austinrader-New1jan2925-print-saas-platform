FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package*.json backend/
COPY backend/prisma backend/prisma
RUN npm --prefix backend ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/backend/node_modules backend/node_modules
COPY backend backend
COPY scripts scripts
RUN npm --prefix backend run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache bash curl postgresql-client
COPY --from=deps /app/backend/node_modules backend/node_modules
COPY --from=build /app/backend backend
COPY --from=build /app/scripts scripts
RUN mkdir -p artifacts/logs artifacts/pids backend/uploads backend/logs artifacts/backups
EXPOSE 3100
CMD ["sh", "-c", "npm --prefix backend run db:deploy && npm --prefix backend run db:seed && node backend/dist/index.js"]
