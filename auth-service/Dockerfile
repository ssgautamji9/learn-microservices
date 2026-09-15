FROM node:24-alpine AS builder

WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache openssl

COPY package*.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN pnpm i

COPY . .

RUN npx prisma generate
RUN pnpm run build


FROM node:24-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY package*.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN pnpm i --prod --frozen-lockfile
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]
