FROM node:20-alpine

WORKDIR /app

ARG DATABASE_URL=postgresql://postgres:postgres@db:5432/notifier?schema=public
ENV DATABASE_URL=${DATABASE_URL}

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.mjs ./
RUN npx prisma generate --config=./prisma.config.mjs

COPY tsconfig.json jest.config.js openapi.yaml ./
COPY proto ./proto
COPY public ./public
COPY src ./src
RUN npm run build

EXPOSE 3000
EXPOSE 50051

CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm run start"]
