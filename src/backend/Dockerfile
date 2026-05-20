FROM node:18-slim

ARG PORT=3000

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["npm", "run", "serve"]
