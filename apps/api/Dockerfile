FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@10.5.2

FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @payproof/money build
RUN pnpm --filter @payproof/shared-types build
RUN pnpm --filter @payproof/api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@10.5.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
