FROM node:20-alpine
WORKDIR /app
COPY server.js .
EXPOSE 3013
# Lab only: intentionally vulnerable. Compose binds it to 127.0.0.1.
CMD ["node", "server.js"]
