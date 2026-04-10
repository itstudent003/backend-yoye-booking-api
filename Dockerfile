FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
# คัดลอกโฟลเดอร์ prisma มาด้วย (สำคัญมาก)
COPY prisma ./prisma/
# สั่ง Generate Prisma Client ตรงนี้!
RUN npx prisma generate
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
