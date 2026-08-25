FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /workspace

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY api-contract/package.json api-contract/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY infrastructure/package.json infrastructure/
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @vancloak/frontend...

COPY api-contract api-contract
COPY frontend frontend
COPY infrastructure infrastructure
RUN pnpm --filter @vancloak/frontend build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder --chown=node:node /workspace/frontend/.output ./.output

USER node
CMD ["node", ".output/server/index.mjs"]
