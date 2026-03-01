FROM node:20-alpine AS deps
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app/frontend
ARG VITE_API_URL=/api
ARG VITE_APP_VERSION=dev
ARG VITE_GIT_SHA=unknown
ARG VITE_BUILD_TIME=1970-01-01T00:00:00Z
ARG VITE_APP_ENV=production
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_GIT_SHA=${VITE_GIT_SHA}
ENV VITE_BUILD_TIME=${VITE_BUILD_TIME}
ENV VITE_APP_ENV=${VITE_APP_ENV}
COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend ./
RUN npm run build

FROM node:20-alpine AS dev
WORKDIR /app/frontend
COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend ./
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM nginx:1.27-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
