FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache git docker-cli

COPY package.json ./
COPY package-lock.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 2805

CMD ["npm", "start"]
