FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build || echo "No frontend build step"

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app /app

ENV NODE_ENV=production
ENV VITE_API_URL="http://localhost:3000/api"
EXPOSE 5173

CMD ["sh", "-lc", "npm run preview -- --host 0.0.0.0 --port 5173"]
