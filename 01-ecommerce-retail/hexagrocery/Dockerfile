FROM node:20-alpine
WORKDIR /app
COPY server.js .
COPY logo.png .
# Intentionally vulnerable practice lab — local use only.
EXPOSE 3014
CMD ["node", "server.js"]
