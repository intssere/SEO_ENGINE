FROM node:24.19.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

# Docker/remote builders commonly receive a source archive without .git.
# Keep provenance fail-closed by requiring the deployment platform to inject
# the complete canonical identity as non-secret build arguments. If these are
# absent, the existing resolver may still use an attached clean Git worktree.
ARG EXPECTED_CANONICAL_COMMIT
ARG EXPECTED_CANONICAL_TREE
ARG EXPECTED_SOURCE_BRANCH
ENV EXPECTED_CANONICAL_COMMIT=$EXPECTED_CANONICAL_COMMIT
ENV EXPECTED_CANONICAL_TREE=$EXPECTED_CANONICAL_TREE
ENV EXPECTED_SOURCE_BRANCH=$EXPECTED_SOURCE_BRANCH

RUN corepack enable && corepack prepare pnpm@10.34.5 --activate

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build:production
RUN pnpm --filter @workspace/seo-engine run build

FROM node:24.19.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build --chown=node:node /app/artifacts/seo-engine/dist/public ./artifacts/seo-engine/dist/public

USER node
EXPOSE 3000

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
