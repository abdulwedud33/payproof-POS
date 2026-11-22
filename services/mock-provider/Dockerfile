FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@10.5.2

FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @payproof/mock-provider build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@10.5.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/mock-provider/package.json services/mock-provider/
RUN pnpm install --prod --frozen-lockfile --filter @payproof/mock-provider

COPY --from=builder /app/services/mock-provider/dist ./services/mock-provider/dist

EXPOSE 8080
CMD ["node", "services/mock-provider/dist/server.js"]
