FROM node:20-alpine AS build

WORKDIR /app

# Bake API URLs at build time (CRA does not read runtime env vars)
ARG REACT_APP_API_GATEWAY_URL=http://localhost:8000
ARG REACT_APP_GRAPHQL_URL=
ARG REACT_APP_WS_URL=
ARG REACT_APP_UPLOAD_PRESIGN_URL=
ENV REACT_APP_API_GATEWAY_URL=$REACT_APP_API_GATEWAY_URL
ENV REACT_APP_GRAPHQL_URL=$REACT_APP_GRAPHQL_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
ENV REACT_APP_UPLOAD_PRESIGN_URL=$REACT_APP_UPLOAD_PRESIGN_URL

COPY package*.json ./
# package-lock.json may be out of sync with package.json; npm install reconciles in-container
RUN npm install --legacy-peer-deps

COPY . .
ENV CI=false
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npx react-scripts build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
