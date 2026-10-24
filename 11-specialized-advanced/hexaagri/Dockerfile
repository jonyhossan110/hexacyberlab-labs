FROM node:20-alpine
WORKDIR /app
COPY server.js logo.png README.md VULNERABILITIES.md PRACTICE-GUIDE.md FIX-AND-RETEST.md ./
ENV HOST=0.0.0.0
EXPOSE 3114
CMD ["node", "server.js"]
