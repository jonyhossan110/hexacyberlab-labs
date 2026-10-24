# HexaSaaS — LAB 11 (deliberately vulnerable, LOCAL ONLY)
# Zero-dependency Node app; node:sqlite requires Node 22+.
FROM node:22-alpine
WORKDIR /app
COPY server.js ./
COPY public ./public
COPY logo.png ./
EXPOSE 3020
# The app binds its HTTP server on all interfaces inside the container;
# docker-compose maps it to 127.0.0.1 only. saas.db and progress.json are
# created at runtime inside the container (ephemeral by design).
CMD ["node", "server.js"]
