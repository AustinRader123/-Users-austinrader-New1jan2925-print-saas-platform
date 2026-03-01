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
CMD ["sh", "-c", "n=0; until npm --prefix backend run db:deploy; do n=$((n+1)); if [ \"$n\" -ge 5 ]; then echo \"db:deploy failed after retries\"; exit 1; fi; sleep 3; done; n=0; until npm --prefix backend run db:seed; do n=$((n+1)); if [ \"$n\" -ge 3 ]; then echo \"db:seed failed after retries\"; exit 1; fi; sleep 3; done; node backend/dist/index.js"]
