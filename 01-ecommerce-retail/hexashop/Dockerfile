FROM node:22-alpine
WORKDIR /app
COPY server.js ./
COPY logo.png ./
COPY public ./public
RUN mkdir -p uploads
EXPOSE 3000
CMD ["node", "server.js"]
