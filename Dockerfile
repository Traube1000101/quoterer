FROM node:lts-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /bot

COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile
RUN pnpm run build

FROM node:lts-alpine

WORKDIR /bot

COPY --from=builder /bot/dist ./dist

CMD ["node", "dist/index.cjs"]
