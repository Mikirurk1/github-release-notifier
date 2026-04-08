FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json jest.config.js openapi.yaml ./
COPY src ./src
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm run start"]
