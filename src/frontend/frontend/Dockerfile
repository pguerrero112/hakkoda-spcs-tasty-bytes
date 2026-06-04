# Stage 1 — Build
FROM node:18-slim AS builder
ARG REACT_APP_BACKEND_SERVICE_URL=/api
ARG REACT_APP_CLIENT_VALIDATION=Snowflake
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_SERVICE_URL}
ENV REACT_APP_CLIENT_VALIDATION=${REACT_APP_CLIENT_VALIDATION}
RUN npm run build

# Stage 2 — Serve with nginx (~15MB)
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4000
CMD ["nginx", "-g", "daemon off;"]
