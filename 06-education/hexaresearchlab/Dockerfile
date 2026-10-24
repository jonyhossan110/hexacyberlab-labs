FROM node:20-alpine
WORKDIR /app
COPY server.js logo.png ./
COPY files/ ./files/
COPY data/ ./data/
EXPOSE 3069
CMD ["node", "server.js"]
