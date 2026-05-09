FROM node:22-alpine

WORKDIR /app

ARG VITE_APP_VERSION=dev
ARG VITE_BUILD_TIME=local
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_BUILD_TIME=$VITE_BUILD_TIME

COPY package*.json .
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "preview"]
