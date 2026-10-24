FROM node:20-alpine
WORKDIR /app
COPY server.js logo.png ./
COPY uploads/ ./uploads/
EXPOSE 3027
CMD ["node", "server.js"]
