# Dockerfile (อัปเดต)
FROM mcr.microsoft.com/playwright:v1.55.0-jammy

WORKDIR /app

COPY package*.json ./
# ใช้ npm install (ไม่ต้องมี package-lock)
RUN npm install --omit=dev

COPY server.js ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
