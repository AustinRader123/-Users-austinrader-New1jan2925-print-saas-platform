FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build || echo "No backend build step"

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app /app

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Expect DATABASE_URL via environment
CMD ["sh", "-lc", "npx prisma migrate deploy || true; npx prisma db seed || true; npm run start || node dist/index.js || node index.js"]
