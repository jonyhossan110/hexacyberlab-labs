FROM node:20-alpine
WORKDIR /app
COPY server.js logo.png ./
COPY samples ./samples
# progress.json is written beside the app at runtime; make /app writable.
RUN chown -R node:node /app
# Inside the container the app must listen on all interfaces so Docker's
# port publishing can reach it; compose still exposes it on 127.0.0.1 only.
ENV HOST=0.0.0.0
ENV PORT=3017
EXPOSE 3017
USER node
CMD ["node", "server.js"]
