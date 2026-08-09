# Serves a pre-built React app. Run `npm run build` in this folder before `docker compose build zpc_ui`.
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
