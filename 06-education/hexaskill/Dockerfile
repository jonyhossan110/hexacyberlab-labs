FROM node:20-alpine
WORKDIR /app
COPY server.js logo.png ./
EXPOSE 3067
# The lab binds 127.0.0.1 by design (local-only practice). Inside a container,
# publish with: docker run -p 127.0.0.1:3067:3067
CMD ["node", "server.js"]
