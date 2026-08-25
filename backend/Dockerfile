FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /workspace

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY api-contract/package.json api-contract/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY infrastructure/package.json infrastructure/
RUN pnpm install --frozen-lockfile --filter @vancloak/backend...

COPY api-contract api-contract
COPY backend backend
COPY infrastructure infrastructure
RUN pnpm --filter @vancloak/backend build
RUN pnpm deploy --legacy --filter @vancloak/backend --prod --config.autoInstallPeers=false /prod/backend

FROM node:22-alpine AS runtime
RUN apk add --no-cache ansible-core openssh-client sshpass
WORKDIR /app

ENV ANSIBLE_COLLECTIONS_PATH=/opt/ansible/collections
COPY infrastructure/src/command-runner/image/dependencies/ansible/requirements.yml /tmp/requirements.yml
RUN ansible-galaxy collection install -r /tmp/requirements.yml -p $ANSIBLE_COLLECTIONS_PATH \
    && rm /tmp/requirements.yml

ARG APP_VERSION=0.0.0-dev
ENV APP_VERSION=$APP_VERSION
ENV NODE_ENV=production
ENV COMMAND_RUNNER_MODE=direct
ENV INFRASTRUCTURE_ASSETS_DIRECTORY_PATH=/app/dist/assets/infrastructure

COPY --from=builder --chown=node:node /prod/backend/node_modules ./node_modules
COPY --from=builder --chown=node:node /workspace/backend/dist ./dist
COPY --from=builder --chown=node:node /workspace/backend/drizzle ./drizzle
RUN chown node:node /app

USER node
CMD ["node", "--enable-source-maps", "dist/api/index.mjs"]
