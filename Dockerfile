FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates ffmpeg python3.11-venv \
  && rm -rf /var/lib/apt/lists/*

RUN python3.11 -m venv /opt/whisper-venv \
  && /opt/whisper-venv/bin/pip install --no-cache-dir faster-whisper==1.2.1

ENV CLIPTOOL_DOCKER=1

ENV COREPACK_HOME=/usr/local/share/corepack

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
