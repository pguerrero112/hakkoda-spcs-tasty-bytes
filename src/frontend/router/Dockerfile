FROM nginx:alpine

ARG FRONTEND_SERVICE
ARG BACKEND_SERVICE

RUN apk update && apk add --no-cache bash

EXPOSE 8000

COPY nginx.conf.template /nginx.conf.template

CMD ["/bin/sh", "-c", \
  "envsubst '$FRONTEND_SERVICE $BACKEND_SERVICE' < /nginx.conf.template > /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'"]
