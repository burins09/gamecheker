# Dockerfile
# Use Playwright base image with browsers & dependencies preinstalled
FROM mcr.microsoft.com/playwright:v1.46.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./

ENV NODE_ENV=production
EXPOSE 3000

# Render sets PORT env. Playwright browsers are already installed in this image.
CMD ["node", "server.js"]
