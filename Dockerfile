FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install --yes --no-install-recommends bzip2 ca-certificates curl xz-utils \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
  && corepack prepare pnpm@10.17.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN mkdir -p /app/.cache /output \
  && chown node:node /app/.cache /output

USER node

ENTRYPOINT ["pnpm"]
CMD ["start", "--", "--help"]
