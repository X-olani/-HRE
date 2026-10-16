# CABC HRE Monitor — build + run image
# Build stage: has the toolchain to compile better-sqlite3 and build Next.
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Run stage: slim, reuses the already-compiled node_modules.
FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
# Headless Chromium for link capture (screenshot + metrics when a URL is added).
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /app/data
EXPOSE 3000
# On start: ensure schema + seed (idempotent), then run the server.
CMD ["sh", "-c", "npm run setup && npm run start"]
