# HexaAPI — LAB 21 (deliberately vulnerable, LOCAL ONLY)
# Zero-dependency Node app; node:sqlite requires Node 22+.
FROM node:22-alpine
WORKDIR /app
COPY server.js ./
COPY public ./public
COPY logo.png ./
EXPOSE 3030
# HOST=0.0.0.0 applies only INSIDE the container; docker-compose publishes
# the port to the host's 127.0.0.1 only. api.db and progress.json are
# created at runtime inside the container (ephemeral by design).
ENV HOST=0.0.0.0
CMD ["node", "server.js"]
