FROM node:20-alpine AS builder

# เปลี่ยนมาลงแค่ตัวที่ยังมีอยู่ใน repo ของ v3.21
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY prisma ./prisma/
# สั่ง Generate ใหม่เพื่อให้ Prisma ปรับตัวเข้ากับ Library ในเครื่อง
RUN npx prisma generate

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
