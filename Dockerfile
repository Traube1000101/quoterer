FROM node:lts-alpine as builder

ENV NODE_ENV=production

WORKDIR /bot

COPY package.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npm ci --omit=dev
RUN npm run build

FROM node:lts-alpine

WORKDIR /bot

COPY --from=builder /bot/package.json ./
COPY --from=builder /bot/dist ./dist

CMD ["npm", "run", "start"]
