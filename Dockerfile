# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .
ARG VITE_APP_NAME="Little December"
ARG VITE_THEME_COLOR=#faf7f1
ARG VITE_BACKGROUND_COLOR=#faf7f1
ENV VITE_APP_NAME=${VITE_APP_NAME} \
    VITE_THEME_COLOR=${VITE_THEME_COLOR} \
    VITE_BACKGROUND_COLOR=${VITE_BACKGROUND_COLOR}
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.28-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER 101:101
EXPOSE 8080
ENTRYPOINT ["nginx", "-g", "daemon off;"]
