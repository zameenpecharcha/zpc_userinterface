FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
# package-lock.json may be out of sync with package.json; npm install reconciles in-container
RUN npm install --legacy-peer-deps

COPY . .
ENV CI=false
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
