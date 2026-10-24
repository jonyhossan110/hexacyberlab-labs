# HexaModelHub vulnerable practice lab — local use only.
FROM node:20-alpine
WORKDIR /app
COPY server.js .
COPY logo.png .
EXPOSE 3049
# Inside the container the app binds 0.0.0.0; the compose file maps the
# port to 127.0.0.1 on the host only, so it stays local-only.
ENV HOST=0.0.0.0 PORT=3049
CMD ["node", "server.js"]
