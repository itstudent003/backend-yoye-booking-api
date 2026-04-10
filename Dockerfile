FROM node:18-alpine

# 1. ติดตั้ง library ที่จำเป็นเพื่อให้ Prisma ทำงานบน Alpine ได้
# openssl1.1-compat จะแก้ปัญหา libssl.so.1.1 missing โดยตรง
RUN apk add --no-cache openssl1.1-compat libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

# 2. คัดลอก prisma schema และ generate client
COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

# 3. Build project
RUN npm run build

EXPOSE 3001

# 4. ใช้ start:prod (ถ้ามี) เพื่อประสิทธิภาพที่ดีกว่า หรือใช้ npm start ตามเดิม
CMD ["npm", "start"]
